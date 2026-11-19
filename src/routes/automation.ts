import { createHash, timingSafeEqual } from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { buildLeftoverNotes } from "../utils/leftoverNotes";
import { importBankStatementFile, previewBankStatementFile } from "./admin";
import { MANUAL_RECONCILE_LOCK_TAG, parsePaymentNoteParts } from "./adminNoteUtils";

/**
 * Otomasyon API'si: yonetici arayuzu/oturumu olmadan, AUTOMATION_API_KEY ile calisan DAR bir
 * uc nokta listesi. Silme, kullanici/yetki degistirme, tahakkuk olusturma burada YOKTUR.
 * Anahtar tanimli degilse ya da 32 karakterden kisaysa tum API kapali (404) kalir.
 */
const router = Router();

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function readProvidedKey(req: Request): string {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length).trim()
    : "";
  const header = typeof req.headers["x-automation-key"] === "string" ? req.headers["x-automation-key"].trim() : "";
  return bearer || header;
}

/** Cagri gucune gore kaba hiz siniri (anahtar dogru olsa bile). */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Cok fazla istek" },
});

/** Yanlis anahtar denemelerini sinirlar (kaba kuvvet). Basarili istekler sayilmaz. */
const failedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Cok fazla hatali deneme" },
});

export function requireAutomationKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.AUTOMATION_API_KEY?.trim() ?? "";
  if (expected.length < 32) {
    res.status(404).json({ message: "Otomasyon API kapali" });
    return;
  }
  const provided = readProvidedKey(req);
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    res.status(401).json({ message: "Yetkisiz" });
    return;
  }
  next();
}

router.use(failedAuthLimiter);
router.use(requireAutomationKey);
router.use(generalLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece .xlsx veya .csv kabul edilir"));
    }
  },
});

function log(event: string, detail: Record<string, unknown>): void {
  console.log(`[automation] ${event} ${JSON.stringify(detail)}`);
}

const cents = (value: number | Prisma.Decimal): number => Math.round(Number(value) * 100);

// ---------------------------------------------------------------- okuma

router.get("/leftover-notes", async (req, res) => {
  const raw = String(req.query.days ?? "60").trim().toLowerCase();
  const parsed = Number(raw);
  const days = raw === "all" ? null : Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 3650) : 60;
  return res.json(await buildLeftoverNotes(days));
});

router.get("/apartments/:doorNo", async (req, res) => {
  const doorNo = req.params.doorNo.trim();
  const apartment = await prisma.apartment.findFirst({
    where: { doorNo },
    select: { id: true, doorNo: true, ownerFullName: true },
  });
  if (!apartment) {
    return res.status(404).json({ message: "Daire bulunamadi" });
  }

  const charges = await prisma.charge.findMany({
    where: { apartmentId: apartment.id, amount: { gt: 0 } },
    select: {
      id: true,
      periodYear: true,
      periodMonth: true,
      amount: true,
      dueDate: true,
      status: true,
      chargeType: { select: { name: true } },
      paymentItems: { select: { amount: true } },
    },
    orderBy: [{ dueDate: "desc" }, { periodYear: "desc" }, { periodMonth: "desc" }],
    take: 60,
  });

  const payments = await prisma.payment.findMany({
    where: {
      OR: [{ itemLinks: { some: { charge: { apartmentId: apartment.id } } } }, { note: { contains: `DOOR:${doorNo}` } }],
    },
    select: {
      id: true,
      paidAt: true,
      totalAmount: true,
      note: true,
      itemLinks: {
        select: {
          chargeId: true,
          amount: true,
          charge: { select: { periodYear: true, periodMonth: true, chargeType: { select: { name: true } } } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 80,
  });

  const ownPayments = payments.filter((payment) => {
    const parts = parsePaymentNoteParts(payment.note);
    const doorTag = parts.find((p) => p.startsWith("DOOR:"));
    return doorTag ? doorTag.slice(5).trim() === doorNo : payment.itemLinks.length > 0;
  });

  return res.json({
    apartment,
    charges: charges.map((charge) => {
      const paid = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);
      return {
        id: charge.id,
        period: `${charge.periodYear}-${String(charge.periodMonth).padStart(2, "0")}`,
        type: charge.chargeType.name,
        amount: Number(charge.amount),
        dueDate: charge.dueDate.toISOString().slice(0, 10),
        status: charge.status,
        paid: Math.round(paid * 100) / 100,
        remaining: Math.round((Number(charge.amount) - paid) * 100) / 100,
      };
    }),
    payments: ownPayments.slice(0, 30).map((payment) => ({
      id: payment.id,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      total: Number(payment.totalAmount),
      note: (payment.note ?? "").slice(0, 300),
      items: payment.itemLinks.map((item) => ({
        chargeId: item.chargeId,
        amount: Number(item.amount),
        charge: `${item.charge.periodYear}-${String(item.charge.periodMonth).padStart(2, "0")} ${item.charge.chargeType.name}`,
      })),
    })),
  });
});

router.get("/payments/by-ref/:ref", async (req, res) => {
  const ref = req.params.ref.trim();
  if (!ref) {
    return res.status(400).json({ message: "Referans gerekli" });
  }
  const payments = await prisma.payment.findMany({
    where: { note: { startsWith: `BANK_REF:${ref}` } },
    select: {
      id: true,
      paidAt: true,
      totalAmount: true,
      note: true,
      itemLinks: { select: { chargeId: true, amount: true } },
    },
    take: 10,
  });
  return res.json({
    payments: payments.map((payment) => ({
      id: payment.id,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      total: Number(payment.totalAmount),
      note: payment.note,
      items: payment.itemLinks.map((item) => ({ chargeId: item.chargeId, amount: Number(item.amount) })),
    })),
  });
});

// ---------------------------------------------------------------- ekstre

router.post("/bank-statement/preview", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }
  const result = await previewBankStatementFile(req.file);
  log("statement-preview", { file: req.file.originalname, rows: result.rowCount, new: result.newCount });
  return res.json(result);
});

router.post("/bank-statement/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }
  const outcome = await importBankStatementFile(req.file);
  log("statement-import", { file: req.file.originalname, status: outcome.status });
  return res.status(outcome.status).json(outcome.body);
});

// ---------------------------------------------------------------- yeniden dagitim

const reallocateSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  dryRun: z.boolean().optional().default(true),
  items: z
    .array(z.object({ chargeId: z.string().min(1), amount: z.number().positive().max(10_000_000) }))
    .max(40),
});

/** Etiketleri yeni dagitima gore gunceller: eski UNAPPLIED etiketleri atilir, kilit eklenir. */
export function buildReallocatedNote(note: string | null, leftoverCents: number): string {
  const parts = parsePaymentNoteParts(note);
  const hadNoOpenDebt = parts.some((p) => p.toUpperCase().startsWith("UNAPPLIED:NO_OPEN_DEBT"));
  const kept = parts.filter((p) => !p.toUpperCase().startsWith("UNAPPLIED:"));
  if (leftoverCents > 0) {
    kept.push(hadNoOpenDebt ? "UNAPPLIED:NO_OPEN_DEBT" : `UNAPPLIED:OVERPAYMENT:${(leftoverCents / 100).toFixed(2)}`);
  }
  if (!kept.some((p) => p.trim().toUpperCase() === MANUAL_RECONCILE_LOCK_TAG)) {
    kept.push(MANUAL_RECONCILE_LOCK_TAG);
  }
  return kept.join(" | ");
}

router.post("/payments/:id/reallocate", async (req, res) => {
  const parsed = reallocateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }
  const { items, reason, dryRun } = parsed.data;

  const outcome = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          paidAt: true,
          totalAmount: true,
          note: true,
          itemLinks: { select: { id: true, chargeId: true, amount: true } },
        },
      });
      if (!payment) {
        return { status: 404, body: { message: "Odeme bulunamadi" } };
      }
      const doorTag = parsePaymentNoteParts(payment.note).find((p) => p.startsWith("DOOR:"));
      const doorNo = doorTag?.slice(5).trim();
      if (!doorNo) {
        return { status: 400, body: { message: "Odemenin daire bilgisi (DOOR) yok, yeniden dagitilamaz" } };
      }
      const apartment = await tx.apartment.findFirst({ where: { doorNo }, select: { id: true } });
      if (!apartment) {
        return { status: 400, body: { message: "Daire bulunamadi" } };
      }

      const chargeIds = [...new Set(items.map((item) => item.chargeId))];
      if (chargeIds.length !== items.length) {
        return { status: 400, body: { message: "Ayni tahakkuk birden fazla kez verilemez" } };
      }
      const newCharges = await tx.charge.findMany({
        where: { id: { in: chargeIds } },
        select: { id: true, apartmentId: true, amount: true },
      });
      if (newCharges.length !== chargeIds.length) {
        return { status: 400, body: { message: "Bilinmeyen tahakkuk var" } };
      }
      if (newCharges.some((charge) => charge.apartmentId !== apartment.id)) {
        return { status: 400, body: { message: "Tahakkuklar odemenin dairesine ait olmali" } };
      }

      const totalCents = cents(payment.totalAmount);
      const itemsCents = items.reduce((sum, item) => sum + cents(item.amount), 0);
      if (itemsCents > totalCents) {
        return { status: 400, body: { message: "Kalemler odeme tutarini asiyor" } };
      }

      // Her tahakkukun BASKA odemelerle kapanan kismi: yeni tutar kalan borcu asamaz.
      const oldChargeIds = payment.itemLinks.map((link) => link.chargeId);
      const touchedIds = [...new Set([...chargeIds, ...oldChargeIds])];
      const others = await tx.paymentItem.groupBy({
        by: ["chargeId"],
        where: { chargeId: { in: touchedIds }, paymentId: { not: payment.id } },
        _sum: { amount: true },
      });
      const othersPaid = new Map(others.map((row) => [row.chargeId, cents(row._sum.amount ?? 0)]));
      for (const charge of newCharges) {
        const wanted = cents(items.find((item) => item.chargeId === charge.id)!.amount);
        if ((othersPaid.get(charge.id) ?? 0) + wanted > cents(charge.amount)) {
          return { status: 400, body: { message: "Bir tahakkuka kalan borcundan fazla yazilamaz", chargeId: charge.id } };
        }
      }

      const before = {
        note: payment.note,
        items: payment.itemLinks.map((link) => ({ chargeId: link.chargeId, amount: Number(link.amount) })),
      };
      const leftoverCents = totalCents - itemsCents;
      const newNote = buildReallocatedNote(payment.note, leftoverCents);
      const after = { note: newNote, items: items.map((item) => ({ chargeId: item.chargeId, amount: item.amount })) };

      // Etkilenen tahakkuklarin yeni durumu (yazmadan once de hesaplanir, dry-run bunu gosterir).
      const chargeRows = await tx.charge.findMany({
        where: { id: { in: touchedIds } },
        select: { id: true, amount: true, status: true },
      });
      const statusPlan = chargeRows.map((charge) => {
        const wanted = cents(items.find((item) => item.chargeId === charge.id)?.amount ?? 0);
        const paid = (othersPaid.get(charge.id) ?? 0) + wanted;
        const nextStatus = paid >= cents(charge.amount) ? "CLOSED" : "OPEN";
        return { chargeId: charge.id, paid: paid / 100, amount: Number(charge.amount), from: charge.status, to: nextStatus };
      });

      if (dryRun) {
        return { status: 200, body: { dryRun: true, doorNo, before, after, leftover: leftoverCents / 100, charges: statusPlan } };
      }

      await tx.paymentItem.deleteMany({ where: { paymentId: payment.id } });
      for (const item of items) {
        await tx.paymentItem.create({
          data: { paymentId: payment.id, chargeId: item.chargeId, amount: new Prisma.Decimal(item.amount.toFixed(2)) },
        });
      }
      await tx.payment.update({ where: { id: payment.id }, data: { note: newNote } });
      for (const plan of statusPlan) {
        if (plan.from === plan.to) continue;
        await tx.charge.update({
          where: { id: plan.chargeId },
          data: plan.to === "CLOSED" ? { status: "CLOSED", closedAt: new Date() } : { status: "OPEN", closedAt: null },
        });
      }
      await tx.auditActionLog.create({
        data: {
          actionType: "EDIT",
          entityType: "PAYMENT",
          entityId: payment.id,
          actorUserId: null,
          before: { source: "automation-api", reason, ...before } as Prisma.InputJsonValue,
          after: { source: "automation-api", reason, ...after } as Prisma.InputJsonValue,
          undoKind: null,
          undoPayload: Prisma.JsonNull,
        },
      });
      return { status: 200, body: { dryRun: false, doorNo, before, after, leftover: leftoverCents / 100, charges: statusPlan } };
    },
    { timeout: 20000 }
  );

  log("reallocate", { payment: req.params.id, dryRun, status: outcome.status, reason });
  return res.status(outcome.status).json(outcome.body);
});

export default router;

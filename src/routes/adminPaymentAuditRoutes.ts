import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  extractDoorNoTagFromPaymentNote,
  isAuditReviewed,
  isAwaitingApproval,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
  parseRefundedAmountFromNote,
  withAuditReviewedNote,
} from "./adminNoteUtils";
import { describePendingReason } from "./adminApartmentCreditRoutes";
import type { DailyDigest, DigestPaymentLine, DigestSendResult, DigestSyncSummary } from "../utils/dailyDigest";
import { fromCents, toCents } from "../utils/money";
import {
  auditPayments,
  type AuditChargeInput,
  type AuditPaymentInput,
  type AuditReport,
} from "../utils/paymentAudit";

const PAYMENT_SCAN_LIMIT = 5000;
const OVERPAID_SCAN_LIMIT = 500;
export const DEFAULT_AUDIT_WINDOW_DAYS = 45;

/**
 * Salt-okunur denetim raporu uretir (hicbir kayit degismez). Hem ekran (GET /payment-audit)
 * hem gunluk zamanlayici bunu kullanir.
 */
export async function loadPaymentAuditReport(windowDays: number = DEFAULT_AUDIT_WINDOW_DAYS): Promise<AuditReport> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [apartments, payments, paidGrouped] = await Promise.all([
    prisma.apartment.findMany({ select: { doorNo: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: since } },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        itemLinks: { select: { charge: { select: { apartment: { select: { doorNo: true } } } } } },
      },
      orderBy: [{ paidAt: "desc" }],
      take: PAYMENT_SCAN_LIMIT,
    }),
    prisma.paymentItem.groupBy({ by: ["chargeId"], _sum: { amount: true } }),
  ]);

  const doorNoSet = new Set<string>();
  for (const apartment of apartments) {
    doorNoSet.add(apartment.doorNo);
    doorNoSet.add(normalizeDoorNoForCompare(apartment.doorNo));
  }

  const paidCentsByChargeId = new Map(paidGrouped.map((row) => [row.chargeId, toCents(row._sum.amount ?? 0)]));
  const chargeAmounts = await prisma.charge.findMany({
    where: { id: { in: [...paidCentsByChargeId.keys()] } },
    select: { id: true, amount: true },
  });
  const overpaidIds = chargeAmounts
    .filter((charge) => (paidCentsByChargeId.get(charge.id) ?? 0) > toCents(charge.amount))
    .map((charge) => charge.id)
    .slice(0, OVERPAID_SCAN_LIMIT);

  const overpaidCharges =
    overpaidIds.length === 0
      ? []
      : await prisma.charge.findMany({
          where: { id: { in: overpaidIds } },
          select: {
            id: true,
            amount: true,
            periodYear: true,
            periodMonth: true,
            chargeType: { select: { name: true } },
            apartment: { select: { doorNo: true, block: { select: { name: true } } } },
          },
        });

  const charges: AuditChargeInput[] = overpaidCharges.map((charge) => ({
    id: charge.id,
    doorNo: charge.apartment.doorNo,
    label: `${charge.apartment.block.name}/${charge.apartment.doorNo} ${charge.periodMonth}/${charge.periodYear} ${charge.chargeType.name}`,
    amount: fromCents(toCents(charge.amount)),
    paidAmount: fromCents(paidCentsByChargeId.get(charge.id) ?? 0),
  }));

  const paymentInputs: AuditPaymentInput[] = payments.map((payment) => ({
    id: payment.id,
    paidAt: payment.paidAt,
    totalAmount: fromCents(toCents(payment.totalAmount)),
    note: payment.note,
    linkedDoorNos: payment.itemLinks.map((item) => item.charge.apartment.doorNo),
  }));

  return auditPayments({ payments: paymentInputs, charges, doorNoSet, windowDays });
}

const DIGEST_CREDIT_SCAN_LIMIT = 5000;

function bankDescriptionOf(note: string | null): string {
  const part = parsePaymentNoteParts(note).find((candidate) => candidate.startsWith("BANK_DESC:"));
  return part ? part.slice("BANK_DESC:".length).trim() : "";
}

/**
 * Gunluk ozet e-postasi icin salt-okunur veri: denetim bulgulari + onay bekleyen odemeler +
 * ortada kalan (borca yazilmamis) alacaklar. Alacak tanimi Daire Alacaklari ekraniyla aynidir.
 */
export async function loadDailyDigest(
  sync: DigestSyncSummary | null,
  now: Date,
  timeZone: string
): Promise<DailyDigest> {
  const audit = await loadPaymentAuditReport();

  const candidates = await prisma.payment.findMany({
    where: {
      note: { contains: "DOOR:" },
      OR: [{ itemLinks: { none: {} } }, { note: { contains: "UNAPPLIED:" } }],
    },
    select: {
      id: true,
      paidAt: true,
      totalAmount: true,
      note: true,
      itemLinks: { select: { amount: true } },
    },
    orderBy: [{ paidAt: "desc" }],
    take: DIGEST_CREDIT_SCAN_LIMIT,
  });

  const awaiting: DigestPaymentLine[] = [];
  const pendingLines: DigestPaymentLine[] = [];
  let pendingTotalCents = 0;

  for (const payment of candidates) {
    const linkedCents = payment.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
    const refundedCents = toCents(parseRefundedAmountFromNote(payment.note));
    const pendingCents = toCents(payment.totalAmount) - linkedCents - refundedCents;
    if (pendingCents <= 0) {
      continue;
    }
    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    const line: DigestPaymentLine = {
      paidAt: payment.paidAt.toISOString(),
      amount: fromCents(pendingCents),
      doorLabel: doorTag ? `Daire ${doorTag}` : "Daire ?",
      description: bankDescriptionOf(payment.note),
      reason: describePendingReason(payment.note),
    };
    if (isAwaitingApproval(payment.note)) {
      awaiting.push(line);
    } else {
      pendingLines.push(line);
      pendingTotalCents += pendingCents;
    }
  }

  const dayLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  return {
    dayLabel,
    sync,
    audit,
    awaiting,
    pending: { count: pendingLines.length, total: fromCents(pendingTotalCents), lines: pendingLines },
  };
}

export function createAdminPaymentAuditRoutes(deps: {
  sendDigest: (options: { force: boolean }) => Promise<DigestSendResult>;
}): Router {
  const router = Router();

  router.get("/payment-audit", async (req, res) => {
    const parsed = z
      .object({ days: z.coerce.number().int().min(1).max(365).optional() })
      .safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
    }

    const report = await loadPaymentAuditReport(parsed.data.days ?? DEFAULT_AUDIT_WINDOW_DAYS);
    return res.json(report);
  });

  /**
   * Yonetici bir odemeye bakip "kontrol edildi" der (ya da isareti geri alir). Yalnizca odemenin
   * notuna AUDIT_REVIEWED etiketi ekler/cikarir; tahsisata, mutabakata, dairelere dokunmaz.
   */
  router.post("/payment-audit/review", async (req, res) => {
    const parsed = z
      .object({ paymentId: z.string().min(1), reviewed: z.boolean().optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
    }

    const reviewed = parsed.data.reviewed ?? true;
    const payment = await prisma.payment.findUnique({
      where: { id: parsed.data.paymentId },
      select: { id: true, note: true },
    });
    if (!payment) {
      return res.status(404).json({ message: "Odeme bulunamadi" });
    }
    if (isAuditReviewed(payment.note) === reviewed) {
      return res.json({ paymentId: payment.id, reviewed, changed: false });
    }

    const nextNote = withAuditReviewedNote(payment.note, reviewed, new Date().toISOString().slice(0, 10));
    // Not baskasi tarafindan arada degistiyse yazma (eski notun uzerine yazmayalim).
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, note: payment.note },
      data: { note: nextNote },
    });
    if (updated.count === 0) {
      return res.status(409).json({ message: "Odeme bu sirada degisti, listeyi yenileyip tekrar deneyin" });
    }

    return res.json({ paymentId: payment.id, reviewed, changed: true });
  });

  /** Gunluk ozeti simdi e-postayla gonderir (test / elle tetikleme). Gunluk "gonderildi" kaydini yoklamaz. */
  router.post("/payment-audit/send-digest", async (_req, res) => {
    try {
      const result = await deps.sendDigest({ force: true });
      return res.json(result);
    } catch (err) {
      console.error("[daily-digest] manual send failed", err);
      const detail = err instanceof Error ? err.message.replace(/\s+/g, " ").slice(0, 300) : "";
      return res.status(502).json({ message: detail ? `Ozet e-postasi gonderilemedi: ${detail}` : "Ozet e-postasi gonderilemedi" });
    }
  });

  return router;
}

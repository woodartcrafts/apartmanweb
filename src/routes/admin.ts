import { ApartmentType, ImportBatchType, OccupancyType, PaymentMethod, Prisma, UserRole } from "@prisma/client";
import { createHash } from "crypto";
import { setDefaultResultOrder } from "dns";
import { Router } from "express";
import multer from "multer";
import nodemailer, { type Transporter } from "nodemailer";
import { PDFParse } from "pdf-parse";
import ExcelJS from "exceljs";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getApartmentStatements } from "../utils/statement";
import blockRoutes from "./adminBlockRoutes";
import definitionRoutes from "./adminDefinitionRoutes";
import descriptionRuleRoutes from "./adminDescriptionRuleRoutes";
import { createAdminApartmentRoutes } from "./adminApartmentRoutes";
import { createAdminApartmentUploadRoutes } from "./adminApartmentUploadRoutes";
import { createAdminExpenseRoutes } from "./adminExpenseRoutes";
import { createAdminPaymentMethodRoutes } from "./adminPaymentMethodRoutes";
import { createAdminApartmentDefinitionRoutes } from "./adminApartmentDefinitionRoutes";
import { createAdminMeetingRoutes } from "./adminMeetingRoutes";
import {
  buildPaymentNote,
  extractDoorNoTagFromPaymentNote,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
} from "./adminNoteUtils";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
let statementEmailTransporter: Transporter | null = null;
let statementEmailDnsOrderInitialized = false;

const tryCurrencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatAccountingEmailDescription(description: string): string {
  const parts = description
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/^BANK_DESC\s*:\s*/i, "")
        .replace(/\bCARRY_FORWARD\s*:\s*APARTMENT_CREDIT\b/gi, "")
        .replace(/\bUNAPPLIED\s*:\s*CARRY_FORWARD\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(Boolean)
    .filter((part) => !/^baslang[ıi]c\s*:/i.test(part))
    .filter((part) => !/^bitis\s*:/i.test(part))
    .filter((part) => !/^door\s*:/i.test(part))
    .filter((part) => !/^carry_forward\s*:/i.test(part))
    .filter((part) => !/^unapplied\s*:/i.test(part))
    .map((part) => part.replace(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "$1"));

  return parts.join(" | ") || "-";
}

function trimEmailStatementDescription(value: string, maxLength = 96): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function applyStatementEmailDnsPreference(): void {
  if (statementEmailDnsOrderInitialized) {
    return;
  }

  statementEmailDnsOrderInitialized = true;

  const preferredOrderRaw = process.env.STATEMENT_EMAIL_DNS_RESULT_ORDER?.trim().toLowerCase();
  if (!preferredOrderRaw) {
    return;
  }

  if (preferredOrderRaw !== "ipv4first" && preferredOrderRaw !== "verbatim") {
    console.warn(
      `[statement-email] STATEMENT_EMAIL_DNS_RESULT_ORDER gecersiz: ${preferredOrderRaw}. Desteklenen degerler: ipv4first, verbatim`
    );
    return;
  }

  setDefaultResultOrder(preferredOrderRaw);
}

function getStatementEmailTransporter(): Transporter {
  if (statementEmailTransporter) {
    return statementEmailTransporter;
  }

  applyStatementEmailDnsPreference();

  const smtpHost = process.env.STATEMENT_EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.STATEMENT_EMAIL_SMTP_PORT ?? "465");
  const smtpSecure = parseBooleanEnv(process.env.STATEMENT_EMAIL_SMTP_SECURE, smtpPort === 465);
  const smtpRequireTls = parseBooleanEnv(process.env.STATEMENT_EMAIL_SMTP_REQUIRE_TLS, false);
  const connectionTimeoutMs = parsePositiveIntEnv(process.env.STATEMENT_EMAIL_CONNECTION_TIMEOUT_MS, 20_000);
  const greetingTimeoutMs = parsePositiveIntEnv(process.env.STATEMENT_EMAIL_GREETING_TIMEOUT_MS, 10_000);
  const socketTimeoutMs = parsePositiveIntEnv(process.env.STATEMENT_EMAIL_SOCKET_TIMEOUT_MS, 20_000);
  const smtpUser =
    process.env.STATEMENT_EMAIL_SMTP_USER?.trim() ||
    config.gmailBankSync.gmailUser?.trim() ||
    "";
  const smtpPass =
    process.env.STATEMENT_EMAIL_SMTP_PASS?.trim() ||
    config.gmailBankSync.appPassword?.trim() ||
    "";

  if (!smtpUser || !smtpPass) {
    throw new Error("Ekstre e-mail icin SMTP bilgileri tanimli degil");
  }

  statementEmailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 465,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    connectionTimeout: connectionTimeoutMs,
    greetingTimeout: greetingTimeoutMs,
    socketTimeout: socketTimeoutMs,
    tls: {
      servername: smtpHost,
    },
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return statementEmailTransporter;
}

function collectApartmentStatementRecipients(apartment: {
  email1: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  landlordEmail: string | null;
}): string[] {
  const raw = [apartment.email1, apartment.email2, apartment.email3, apartment.email4, apartment.landlordEmail];
  const unique = new Set<string>();

  for (const item of raw) {
    const normalized = item?.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (!z.string().email().safeParse(normalized).success) {
      continue;
    }
    unique.add(normalized);
  }

  return [...unique];
}

router.use(requireAuth, requireRole([UserRole.ADMIN]));
router.use(blockRoutes);
router.use(definitionRoutes);
router.use(descriptionRuleRoutes);
router.use(
  createAdminExpenseRoutes({
    ensurePaymentMethodDefinitions,
    pushActionLog: (input) => pushActionLog(input as any),
    mapExpenseSnapshot: (expense) => mapExpenseSnapshot(expense as any),
    extractChargeInvoiceAmount,
  })
);
router.use(
  createAdminPaymentMethodRoutes({
    ensurePaymentMethodDefinitions,
  })
);
router.use(
  createAdminApartmentRoutes({
    ensureApartmentClassDefinitions,
    ensureApartmentDutyDefinitions,
  })
);
router.use(
  createAdminApartmentUploadRoutes({
    ensureApartmentClassDefinitions,
    ensureApartmentDutyDefinitions,
  })
);
router.use(
  createAdminApartmentDefinitionRoutes({
    ensureApartmentClassDefinitions,
    ensureApartmentDutyDefinitions,
    ensureApartmentTypeDefinitions,
  })
);
router.use(createAdminMeetingRoutes());

router.get("/resident-content/announcements", async (_req, res) => {
  const rows = await prisma.residentAnnouncement.findMany({
    orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      isActive: row.isActive,
      publishAt: row.publishAt,
      expiresAt: row.expiresAt,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  );
});

router.post("/resident-content/announcements", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    content: z.string().trim().min(5).max(5000),
    isActive: z.boolean().optional(),
    publishAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const created = await prisma.residentAnnouncement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isActive: parsed.data.isActive ?? true,
      publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : new Date(),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdById: req.user?.userId,
    },
  });

  return res.status(201).json(created);
});

router.put("/resident-content/announcements/:id", async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    title: z.string().trim().min(3).max(200).optional(),
    content: z.string().trim().min(5).max(5000).optional(),
    isActive: z.boolean().optional(),
    publishAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.residentAnnouncement.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Duyuru bulunamadi" });
  }

  const updated = await prisma.residentAnnouncement.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.publishAt !== undefined ? { publishAt: new Date(parsed.data.publishAt) } : {}),
      ...(parsed.data.expiresAt !== undefined
        ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
        : {}),
    },
  });

  return res.json(updated);
});

router.delete("/resident-content/announcements/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.residentAnnouncement.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Duyuru bulunamadi" });
  }

  await prisma.residentAnnouncement.delete({ where: { id } });
  return res.status(204).end();
});

router.get("/resident-content/polls", async (_req, res) => {
  const polls = await prisma.residentPoll.findMany({
    include: {
      options: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const allOptionIds = polls.flatMap((poll) => poll.options.map((opt) => opt.id));
  const groupedCounts =
    allOptionIds.length > 0
      ? await prisma.residentPollVote.groupBy({
          by: ["optionId"],
          where: { optionId: { in: allOptionIds } },
          _count: { _all: true },
        })
      : [];

  const voteCountByOption = new Map(groupedCounts.map((x) => [x.optionId, x._count._all]));

  return res.json(
    polls.map((poll) => {
      const options = poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        sortOrder: opt.sortOrder,
        isActive: opt.isActive,
        voteCount: voteCountByOption.get(opt.id) ?? 0,
      }));

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        isActive: poll.isActive,
        allowMultiple: poll.allowMultiple,
        startsAt: poll.startsAt,
        endsAt: poll.endsAt,
        createdById: poll.createdById,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        totalVotes: options.reduce((sum, x) => sum + x.voteCount, 0),
        options,
      };
    })
  );
});

router.post("/resident-content/polls", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
    allowMultiple: z.boolean().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(20),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const uniqueOptions = [...new Set(parsed.data.options.map((x) => x.trim()).filter(Boolean))];
  if (uniqueOptions.length < 2) {
    return res.status(400).json({ message: "Anket icin en az 2 farkli secenek gereklidir" });
  }

  const created = await prisma.residentPoll.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      allowMultiple: parsed.data.allowMultiple ?? false,
      isActive: parsed.data.isActive ?? true,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      createdById: req.user?.userId,
      options: {
        create: uniqueOptions.map((text, idx) => ({
          text,
          sortOrder: idx,
          isActive: true,
        })),
      },
    },
    include: {
      options: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return res.status(201).json(created);
});

router.put("/resident-content/polls/:id", async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    allowMultiple: z.boolean().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.residentPoll.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Anket bulunamadi" });
  }

  const updated = await prisma.residentPoll.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.allowMultiple !== undefined ? { allowMultiple: parsed.data.allowMultiple } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.startsAt !== undefined ? { startsAt: new Date(parsed.data.startsAt) } : {}),
      ...(parsed.data.endsAt !== undefined
        ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }
        : {}),
    },
  });

  return res.json(updated);
});

router.delete("/resident-content/polls/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.residentPoll.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Anket bulunamadi" });
  }

  await prisma.residentPoll.delete({ where: { id } });
  return res.status(204).end();
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Banka",
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Karti",
  OTHER: "Diger",
};

const defaultApartmentClasses = [
  { code: "BUYUK", name: "Buyuk Daire" },
  { code: "KUCUK", name: "Kucuk Daire" },
] as const;

const defaultApartmentDuties = [
  { code: "KAPICI", name: "Kapici" },
  { code: "YONETICI", name: "Yonetici" },
  { code: "GUVENLIK", name: "Guvenlik" },
] as const;

const defaultApartmentTypes = [
  { code: "BUYUK", name: "Buyuk Daire" },
  { code: "KUCUK", name: "Kucuk Daire" },
] as const;

async function ensureApartmentClassDefinitions() {
  const existing = await prisma.apartmentClassDefinition.findMany();
  if (existing.length > 0) {
    return existing;
  }

  await prisma.$transaction(
    defaultApartmentClasses.map((item) =>
      prisma.apartmentClassDefinition.upsert({
        where: { code: item.code },
        update: {},
        create: {
          code: item.code,
          name: item.name,
          isActive: true,
        },
      })
    )
  );

  return prisma.apartmentClassDefinition.findMany();
}

async function ensureApartmentDutyDefinitions() {
  const existing = await prisma.apartmentDutyDefinition.findMany();
  if (existing.length > 0) {
    return existing;
  }

  await prisma.$transaction(
    defaultApartmentDuties.map((item) =>
      prisma.apartmentDutyDefinition.upsert({
        where: { code: item.code },
        update: {},
        create: {
          code: item.code,
          name: item.name,
          isActive: true,
        },
      })
    )
  );

  return prisma.apartmentDutyDefinition.findMany();
}

async function ensureApartmentTypeDefinitions() {
  const existing = await prisma.apartmentTypeDefinition.findMany();
  if (existing.length > 0) {
    return existing;
  }

  await prisma.$transaction(
    defaultApartmentTypes.map((item) =>
      prisma.apartmentTypeDefinition.upsert({
        where: { code: item.code },
        update: {},
        create: {
          code: item.code,
          name: item.name,
          isActive: true,
        },
      })
    )
  );

  return prisma.apartmentTypeDefinition.findMany();
}

async function ensurePaymentMethodDefinitions() {
  const existing = await prisma.paymentMethodDefinition.findMany();
  if (existing.length > 0) {
    return existing;
  }

  const methods = Object.keys(paymentMethodLabels) as PaymentMethod[];
  await prisma.$transaction(
    methods.map((code) =>
      prisma.paymentMethodDefinition.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: paymentMethodLabels[code],
          isActive: true,
        },
      })
    )
  );

  return prisma.paymentMethodDefinition.findMany();
}

async function refreshChargeStatusesForIds(chargeIds: string[]): Promise<void> {
  if (chargeIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(chargeIds)];
  const grouped = await prisma.paymentItem.groupBy({
    by: ["chargeId"],
    where: { chargeId: { in: uniqueIds } },
    _sum: { amount: true },
  });

  const paidMap = new Map(grouped.map((g) => [g.chargeId, Number(g._sum.amount ?? 0)]));
  const CHUNK_SIZE = 200;

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunkIds = uniqueIds.slice(i, i + CHUNK_SIZE);
    const charges = await prisma.charge.findMany({
      where: { id: { in: chunkIds } },
      select: { id: true, amount: true },
    });

    const toOpen: string[] = [];
    const toClose: string[] = [];

    for (const charge of charges) {
      const paid = paidMap.get(charge.id) ?? 0;
      const isClosed = paid + 0.0001 >= Number(charge.amount);
      if (isClosed) {
        toClose.push(charge.id);
      } else {
        toOpen.push(charge.id);
      }
    }

    if (toOpen.length > 0) {
      await prisma.charge.updateMany({
        where: { id: { in: toOpen } },
        data: { status: "OPEN", closedAt: null },
      });
    }

    if (toClose.length > 0) {
      await prisma.charge.updateMany({
        where: { id: { in: toClose } },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }
  }
}

type ReconcilePaymentSource = {
  paymentId: string;
  amount: number;
  paidAt: Date;
  createdAt: Date;
  sourceType: "LINKED" | "UNAPPLIED_DOOR";
};

type ReconcileApartmentResult = {
  apartmentId: string;
  apartmentDoorNo: string;
  chargeCount: number;
  processedPaymentCount: number;
  skippedMixedPaymentCount: number;
  skippedLockedPaymentCount: number;
  createdPaymentItemCount: number;
  unappliedPaymentCount: number;
  unappliedTotal: number;
};

const MANUAL_RECONCILE_LOCK_TAG = "RECONCILE_LOCK:MANUAL";

function hasManualReconcileLock(note: string | null | undefined): boolean {
  if (!note) {
    return false;
  }
  return parsePaymentNoteParts(note).some((part) => part.trim().toUpperCase() === MANUAL_RECONCILE_LOCK_TAG);
}

function stripManualReconcileLockTag(note: string | null | undefined): string | null {
  if (!note) {
    return null;
  }

  const next = parsePaymentNoteParts(note).filter((part) => part.trim().toUpperCase() !== MANUAL_RECONCILE_LOCK_TAG);
  if (next.length === 0) {
    return null;
  }

  return next.join(" | ");
}

function withManualReconcileLock(note: string | null | undefined, locked: boolean): string | null {
  const base = parsePaymentNoteParts(note ?? null).filter(
    (part) => part.trim().toUpperCase() !== MANUAL_RECONCILE_LOCK_TAG
  );
  if (locked) {
    base.push(MANUAL_RECONCILE_LOCK_TAG);
  }
  if (base.length === 0) {
    return null;
  }
  return base.join(" | ");
}

type MixedPaymentReportRow = {
  paymentId: string;
  paidAt: Date;
  method: PaymentMethod;
  totalAmount: number;
  linkedAmount: number;
  note: string | null;
  apartmentCount: number;
  apartments: string[];
  allocations: Array<{
    apartmentId: string;
    apartmentDoorNo: string;
    blockName: string;
    amount: number;
  }>;
};

async function buildMixedPaymentReport(apartmentId?: string): Promise<MixedPaymentReportRow[]> {
  const payments = await prisma.payment.findMany({
    where: {
      itemLinks: { some: {} },
    },
    include: {
      itemLinks: {
        include: {
          charge: {
            include: {
              apartment: {
                include: {
                  block: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  const reportRows: MixedPaymentReportRow[] = [];

  for (const payment of payments) {
    const apartmentAllocMap = new Map<
      string,
      {
        apartmentId: string;
        apartmentDoorNo: string;
        blockName: string;
        amount: number;
      }
    >();

    let linkedAmount = 0;
    for (const item of payment.itemLinks) {
      const apt = item.charge.apartment;
      const amount = Number(item.amount);
      linkedAmount += amount;

      const existing = apartmentAllocMap.get(apt.id);
      if (existing) {
        existing.amount += amount;
      } else {
        apartmentAllocMap.set(apt.id, {
          apartmentId: apt.id,
          apartmentDoorNo: apt.doorNo,
          blockName: apt.block.name,
          amount,
        });
      }
    }

    if (apartmentAllocMap.size <= 1) {
      continue;
    }

    if (apartmentId && !apartmentAllocMap.has(apartmentId)) {
      continue;
    }

    const allocations = [...apartmentAllocMap.values()]
      .sort((a, b) => a.apartmentDoorNo.localeCompare(b.apartmentDoorNo, "tr", { numeric: true }))
      .map((x) => ({
        ...x,
        amount: Number(x.amount.toFixed(2)),
      }));

    reportRows.push({
      paymentId: payment.id,
      paidAt: payment.paidAt,
      method: payment.method,
      totalAmount: Number(payment.totalAmount),
      linkedAmount: Number(linkedAmount.toFixed(2)),
      note: payment.note,
      apartmentCount: allocations.length,
      apartments: allocations.map((x) => `${x.blockName}/${x.apartmentDoorNo}`),
      allocations,
    });
  }

  return reportRows;
}

async function reconcileApartmentPaymentLinks(apartmentId: string): Promise<ReconcileApartmentResult | null> {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { id: true, doorNo: true },
  });

  if (!apartment) {
    return null;
  }

  const [charges, linkedPayments, unappliedDoorPaymentsRaw] = await Promise.all([
    prisma.charge.findMany({
      where: { apartmentId },
      select: { id: true, amount: true, dueDate: true, createdAt: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: {
        itemLinks: {
          some: {
            charge: { apartmentId },
          },
        },
      },
      select: {
        id: true,
        paidAt: true,
        createdAt: true,
        totalAmount: true,
        note: true,
        itemLinks: {
          select: {
            amount: true,
            charge: {
              select: { apartmentId: true },
            },
          },
        },
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: {
        note: { contains: "DOOR:" },
        itemLinks: { none: {} },
      },
      select: {
        id: true,
        paidAt: true,
        createdAt: true,
        totalAmount: true,
        note: true,
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const apartmentDoorNoNormalized = normalizeDoorNoForCompare(apartment.doorNo);
  const unappliedDoorPayments = unappliedDoorPaymentsRaw.filter((payment) => {
    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    return normalizeDoorNoForCompare(doorTag) === apartmentDoorNoNormalized;
  });

  const paymentSources: ReconcilePaymentSource[] = [];
  let skippedMixedPaymentCount = 0;
  let skippedLockedPaymentCount = 0;

  for (const payment of linkedPayments) {
    if (hasManualReconcileLock(payment.note)) {
      skippedLockedPaymentCount += 1;
      continue;
    }

    const apartmentIds = new Set(payment.itemLinks.map((item) => item.charge.apartmentId));
    if (apartmentIds.size > 1) {
      skippedMixedPaymentCount += 1;
      continue;
    }

    const linkedAmount = payment.itemLinks.reduce((sum, item) => sum + Number(item.amount), 0);
    const paymentDoorNo = extractDoorNoTagFromPaymentNote(payment.note);
    const paymentDoorNoNormalized = normalizeDoorNoForCompare(paymentDoorNo);
    const shouldUsePaymentTotal =
      paymentDoorNoNormalized.length > 0 &&
      paymentDoorNoNormalized === apartmentDoorNoNormalized &&
      Number(payment.totalAmount) > linkedAmount + 0.0001;

    const amount = shouldUsePaymentTotal ? Number(payment.totalAmount) : linkedAmount;
    if (amount <= 0.0001) {
      continue;
    }

    paymentSources.push({
      paymentId: payment.id,
      amount,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      sourceType: "LINKED",
    });
  }

  const linkedPaymentIdSet = new Set(paymentSources.map((x) => x.paymentId));
  for (const payment of unappliedDoorPayments) {
    if (hasManualReconcileLock(payment.note)) {
      skippedLockedPaymentCount += 1;
      continue;
    }

    if (linkedPaymentIdSet.has(payment.id)) {
      continue;
    }

    paymentSources.push({
      paymentId: payment.id,
      amount: Number(payment.totalAmount),
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      sourceType: "UNAPPLIED_DOOR",
    });
  }

  paymentSources.sort((a, b) => {
    const paidAtDiff = a.paidAt.getTime() - b.paidAt.getTime();
    if (paidAtDiff !== 0) {
      return paidAtDiff;
    }
    const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }
    return a.paymentId.localeCompare(b.paymentId);
  });

  let createdPaymentItemCount = 0;
  let unappliedPaymentCount = 0;
  let unappliedTotal = 0;

  await prisma.$transaction(async (tx) => {
    const chargeIds = charges.map((charge) => charge.id);
    const paymentIds = paymentSources.map((source) => source.paymentId);

    if (paymentIds.length > 0) {
      await tx.paymentItem.deleteMany({
        where: {
          paymentId: { in: paymentIds },
          charge: { apartmentId },
        },
      });
    }

    if (chargeIds.length === 0 || paymentSources.length === 0) {
      return;
    }

    const paidGrouped = await tx.paymentItem.groupBy({
      by: ["chargeId"],
      where: { chargeId: { in: chargeIds } },
      _sum: { amount: true },
    });

    const paidMap = new Map(paidGrouped.map((row) => [row.chargeId, Number(row._sum.amount ?? 0)]));
    const chargeBalances = charges.map((charge) => ({
      chargeId: charge.id,
      remaining: Math.max(0, Number(charge.amount) - (paidMap.get(charge.id) ?? 0)),
    }));

    for (const source of paymentSources) {
      let remainingToAllocate = source.amount;

      for (const targetCharge of chargeBalances) {
        if (remainingToAllocate <= 0.0001) {
          break;
        }
        if (targetCharge.remaining <= 0.0001) {
          continue;
        }

        const allocate = Math.min(remainingToAllocate, targetCharge.remaining);
        const rounded = Number(allocate.toFixed(2));
        if (rounded <= 0) {
          continue;
        }

        await tx.paymentItem.create({
          data: {
            paymentId: source.paymentId,
            chargeId: targetCharge.chargeId,
            amount: rounded,
          },
        });

        createdPaymentItemCount += 1;
        remainingToAllocate = Number((remainingToAllocate - rounded).toFixed(2));
        targetCharge.remaining = Number((targetCharge.remaining - rounded).toFixed(2));
      }

      if (remainingToAllocate > 0.01) {
        unappliedPaymentCount += 1;
        unappliedTotal += remainingToAllocate;
      }
    }
  });

  await refreshChargeStatusesForIds(charges.map((x) => x.id));

  return {
    apartmentId: apartment.id,
    apartmentDoorNo: apartment.doorNo,
    chargeCount: charges.length,
    processedPaymentCount: paymentSources.length,
    skippedMixedPaymentCount,
    skippedLockedPaymentCount,
    createdPaymentItemCount,
    unappliedPaymentCount,
    unappliedTotal: Number(unappliedTotal.toFixed(2)),
  };
}

type AuditActionType = "EDIT" | "DELETE" | "UNDO";
type AuditEntityType = "PAYMENT" | "EXPENSE";
type UndoKind = "PAYMENT_EDIT" | "PAYMENT_DELETE" | "EXPENSE_EDIT" | "EXPENSE_DELETE";

type PaymentItemSnapshot = {
  id: string;
  chargeId: string;
  amount: number;
};

type PaymentSnapshot = {
  id: string;
  importBatchId: string | null;
  paidAt: string;
  totalAmount: number;
  method: PaymentMethod;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  items: PaymentItemSnapshot[];
};

type ExpenseSnapshot = {
  id: string;
  expenseItemId: string;
  importBatchId: string | null;
  spentAt: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string | null;
  reference: string | null;
  createdById: string | null;
  createdAt: string;
};

type AuditLogEntry = {
  id: string;
  createdAt: string;
  undoUntil: string | null;
  undoneAt: string | null;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  actorUserId: string | null;
  before: unknown;
  after: unknown;
  undoKind: UndoKind | null;
  undoPayload: unknown;
};

const ACTION_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
const ACTION_UNDO_WINDOW_MS = 5 * 60 * 1000;
const ACTION_LOG_LIMIT = 500;

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function mapAuditEntry(row: {
  id: string;
  createdAt: Date;
  undoUntil: Date | null;
  undoneAt: Date | null;
  actionType: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  before: Prisma.JsonValue;
  after: Prisma.JsonValue;
  undoKind: string | null;
  undoPayload: Prisma.JsonValue | null;
}): AuditLogEntry {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    undoUntil: row.undoUntil ? row.undoUntil.toISOString() : null,
    undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
    actionType: row.actionType as AuditActionType,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    before: row.before,
    after: row.after,
    undoKind: row.undoKind as UndoKind | null,
    undoPayload: row.undoPayload,
  };
}

async function pruneActionLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - ACTION_LOG_RETENTION_MS);
  await prisma.auditActionLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  const overflow = await prisma.auditActionLog.findMany({
    select: { id: true },
    orderBy: [{ createdAt: "desc" }],
    skip: ACTION_LOG_LIMIT,
  });

  if (overflow.length > 0) {
    await prisma.auditActionLog.deleteMany({ where: { id: { in: overflow.map((x) => x.id) } } });
  }
}

async function pushActionLog(
  input: Omit<AuditLogEntry, "id" | "createdAt" | "undoUntil" | "undoneAt"> & { undoable?: boolean }
): Promise<AuditLogEntry> {
  await pruneActionLogs();

  const createdAt = new Date();
  const created = await prisma.auditActionLog.create({
    data: {
      createdAt,
      undoUntil: input.undoable ? new Date(createdAt.getTime() + ACTION_UNDO_WINDOW_MS) : null,
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId,
      before: toJsonValue(input.before),
      after: toJsonValue(input.after),
      undoKind: input.undoKind,
      undoPayload: input.undoPayload === null ? Prisma.JsonNull : toJsonValue(input.undoPayload),
    },
  });

  return mapAuditEntry(created);
}

function isUndoAvailable(entry: { undoUntil: string | Date | null; undoneAt: string | Date | null }): boolean {
  if (!entry.undoUntil || entry.undoneAt) {
    return false;
  }
  return new Date(entry.undoUntil).getTime() > Date.now();
}

function detectPaymentSourceForEdit(payment: { importBatchId: string | null; note: string | null }): "MANUAL" | "UPLOAD" {
  if (payment.importBatchId) {
    return "UPLOAD";
  }

  const noteValue = (payment.note ?? "").toUpperCase();
  if (noteValue.includes("BANK_REF:") || noteValue.includes("PAYMENT_UPLOAD:")) {
    return "UPLOAD";
  }

  return "MANUAL";
}

function mapPaymentSnapshot(payment: {
  id: string;
  importBatchId: string | null;
  paidAt: Date;
  totalAmount: unknown;
  method: PaymentMethod;
  note: string | null;
  createdById: string | null;
  createdAt: Date;
  itemLinks: Array<{ id: string; chargeId: string; amount: unknown }>;
}): PaymentSnapshot {
  return {
    id: payment.id,
    importBatchId: payment.importBatchId,
    paidAt: payment.paidAt.toISOString(),
    totalAmount: Number(payment.totalAmount),
    method: payment.method,
    note: payment.note,
    createdById: payment.createdById,
    createdAt: payment.createdAt.toISOString(),
    items: payment.itemLinks.map((item) => ({
      id: item.id,
      chargeId: item.chargeId,
      amount: Number(item.amount),
    })),
  };
}

function mapExpenseSnapshot(expense: {
  id: string;
  expenseItemId: string;
  importBatchId: string | null;
  spentAt: Date;
  amount: unknown;
  paymentMethod: PaymentMethod;
  description: string | null;
  reference: string | null;
  createdById: string | null;
  createdAt: Date;
}): ExpenseSnapshot {
  return {
    id: expense.id,
    expenseItemId: expense.expenseItemId,
    importBatchId: expense.importBatchId,
    spentAt: expense.spentAt.toISOString(),
    amount: Number(expense.amount),
    paymentMethod: expense.paymentMethod,
    description: expense.description,
    reference: expense.reference,
    createdById: expense.createdById,
    createdAt: expense.createdAt.toISOString(),
  };
}

type UploadPaymentRow = {
  paidAt: Date;
  amount: number;
  doorNo: string;
  description?: string;
  reference?: string;
};

type BankStatementRow = {
  occurredAt: Date;
  amount: number;
  description: string;
  reference?: string;
  txType?: string;
};

type BankStatementCommitRow = {
  occurredAt: Date;
  amount: number;
  entryType: "PAYMENT" | "EXPENSE";
  isAutoSplit?: boolean;
  splitSourceRowNo?: number;
  doorNo?: string;
  expenseItemId?: string;
  description: string;
  reference?: string;
  txType?: string;
  paymentMethod?: PaymentMethod;
};

type DescriptionDoorNoRuleLookup = {
  keyword?: string;
  normalizedKeyword: string;
  doorNo: string;
};

type DescriptionExpenseRuleLookup = {
  normalizedKeyword: string;
  expenseItemId: string;
};

type GmailListMessagesResponse = {
  messages?: Array<{ id: string }>;
};

type GmailMessageGetResponse = {
  id: string;
  payload?: GmailMessagePart;
};

type GmailMessagePart = {
  filename?: string;
  mimeType?: string;
  body?: {
    attachmentId?: string;
    data?: string;
  };
  parts?: GmailMessagePart[];
};

type GmailAttachmentGetResponse = {
  data?: string;
};

function normalizeBankDescriptionForDedup(description: string | undefined): string {
  return (description ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr");
}

function buildGmailFallbackReference(row: BankStatementRow): string {
  const occurredAt = row.occurredAt.toISOString();
  const signedAmount = Number(row.amount.toFixed(2)).toFixed(2);
  const txType = (row.txType ?? "").trim().toUpperCase();
  const normalizedDescription = normalizeBankDescriptionForDedup(row.description);
  const dedupPayload = [occurredAt, signedAmount, txType, normalizedDescription].join("|");
  const digest = createHash("sha1").update(dedupPayload).digest("hex").slice(0, 16).toUpperCase();
  return digest;
}

function getExcelCellValue(value: ExcelJS.CellValue | undefined): unknown {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date || typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? "")).join(" ");
  }

  if (typeof value === "object") {
    if ("result" in value) {
      return getExcelCellValue(value.result);
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
  }

  return String(value);
}

async function parseExcelRowsAsObjects(fileBuffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const colCount = Math.max(1, worksheet.columnCount);
  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: colCount }, (_, idx) => {
    const raw = getExcelCellValue(headerRow.getCell(idx + 1).value);
    const text = String(raw ?? "").trim();
    return text || `__EMPTY_${idx + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let rowNo = 2; rowNo <= worksheet.rowCount; rowNo += 1) {
    const row = worksheet.getRow(rowNo);
    const record: Record<string, unknown> = {};
    let hasAnyValue = false;

    for (let col = 1; col <= colCount; col += 1) {
      const cellValue = getExcelCellValue(row.getCell(col).value);
      record[headers[col - 1]] = cellValue;
      if (String(cellValue ?? "").trim() !== "") {
        hasAnyValue = true;
      }
    }

    if (hasAnyValue) {
      rows.push(record);
    }
  }

  return rows;
}

async function parseExcelRowsAsArray(fileBuffer: Buffer): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const colCount = Math.max(1, worksheet.columnCount);
  const rows: unknown[][] = [];

  for (let rowNo = 1; rowNo <= worksheet.rowCount; rowNo += 1) {
    const row = worksheet.getRow(rowNo);
    const values: unknown[] = [];
    for (let col = 1; col <= colCount; col += 1) {
      values.push(getExcelCellValue(row.getCell(col).value));
    }
    if (values.some((value) => String(value ?? "").trim() !== "")) {
      rows.push(values);
    }
  }

  return rows;
}

function excelSerialToDate(raw: number): Date | null {
  if (!Number.isFinite(raw)) {
    return null;
  }

  const wholeDays = Math.floor(raw);
  const fractionalDays = raw - wholeDays;
  const epochMs = Date.UTC(1899, 11, 30);
  const millisInDay = 24 * 60 * 60 * 1000;
  const asDate = new Date(epochMs + wholeDays * millisInDay + Math.round(fractionalDays * millisInDay));

  if (Number.isNaN(asDate.getTime())) {
    return null;
  }

  return asDate;
}

function parseFlexibleDate(raw: unknown): Date | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === "number") {
    const parsed = excelSerialToDate(raw);
    if (parsed) {
      return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }
  }

  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Fallback for ISO-like strings after local dd/mm parsing attempts.
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso;
  }

  return null;
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return raw > 0 ? raw : null;
  }

  if (typeof raw !== "string") {
    return null;
  }

  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeHeader(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "");
}

function extractChargeInvoiceFileName(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }

  const parts = description
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  const invoicePart = parts.find((part) => part.startsWith("Fatura:"));
  if (!invoicePart) {
    return null;
  }

  const fileName = invoicePart.slice("Fatura:".length).trim();
  return fileName || null;
}

function extractChargeInvoiceAmount(description: string | null | undefined): number | null {
  if (!description) {
    return null;
  }

  const amountPart = description
    .split("|")
    .map((x) => x.trim())
    .find((part) => /^fatura\s+tutar[ıi]\s*:/i.test(part));
  if (!amountPart) {
    return null;
  }

  const raw = amountPart.replace(/^fatura\s+tutar[ıi]\s*:/i, "").trim();
  if (!raw) {
    return null;
  }

  const numericText = raw.replace(/[^\d.,-]/g, "");
  if (!numericText) {
    return null;
  }

  // Parse both TR and EN decimal formats (e.g. 1.234,56 and 1234.56).
  const lastComma = numericText.lastIndexOf(",");
  const lastDot = numericText.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalized = numericText;
  if (decimalIndex >= 0) {
    const intPart = numericText.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fracPart = numericText.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${intPart}.${fracPart}`;
  } else {
    normalized = numericText.replace(/[.,]/g, "");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function normalizeRowObject(row: Record<string, unknown>): UploadPaymentRow | null {
  const mapped = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeHeader(k), v]));

  const paidAtRaw = mapped.tarih ?? mapped.date;
  const amountRaw = mapped.tutar ?? mapped.amount;
  const doorNoRaw = mapped.daireno ?? mapped.daire ?? mapped.doorno;
  const descriptionRaw = mapped.aciklama ?? mapped.description;
  const referenceRaw = mapped.referans ?? mapped.reference ?? mapped.ref;

  const paidAt = parseFlexibleDate(paidAtRaw);
  const amount = parseAmount(amountRaw);
  const doorNo = typeof doorNoRaw === "string" || typeof doorNoRaw === "number" ? String(doorNoRaw).trim() : "";

  if (!paidAt || !amount || !doorNo) {
    return null;
  }

  const normalized: UploadPaymentRow = {
    paidAt,
    amount,
    doorNo,
    description: typeof descriptionRaw === "string" ? descriptionRaw.trim() : undefined,
    reference: typeof referenceRaw === "string" ? referenceRaw.trim() : undefined,
  };

  return normalized;
}

function isUploadPaymentRow(value: UploadPaymentRow | null): value is UploadPaymentRow {
  return value !== null;
}

function parseDelimitedTextRows(content: string): UploadPaymentRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = [";", "\t", "|", ","].reduce((best, current) => {
    const score = lines[0].split(current).length;
    const bestScore = lines[0].split(best).length;
    return score > bestScore ? current : best;
  }, ";");

  const headers = lines[0].split(delimiter).map((x) => x.trim());
  const hasHeader = headers.some((h) => /tarih|date|tutar|amount|daire|door/i.test(h));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const parts = line.split(delimiter).map((x) => x.trim());
      const rowObj: Record<string, unknown> = hasHeader
        ? Object.fromEntries(headers.map((h, idx) => [h, parts[idx] ?? ""]))
        : {
            tarih: parts[0] ?? "",
            tutar: parts[1] ?? "",
            daireno: parts[2] ?? "",
            aciklama: parts[3] ?? "",
            referans: parts[4] ?? "",
          };

      return normalizeRowObject(rowObj);
    })
    .filter(isUploadPaymentRow);
}

async function parseUploadRows(file: Express.Multer.File): Promise<UploadPaymentRow[]> {
  const lowerName = file.originalname.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const rows = await parseExcelRowsAsObjects(file.buffer);
    return rows.map((row) => normalizeRowObject(row)).filter(isUploadPaymentRow);
  }

  if (lowerName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parseDelimitedTextRows(parsed.text);
  }

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".csv")) {
    return parseDelimitedTextRows(file.buffer.toString("utf8"));
  }

  return [];
}


function getRestrictedChargeTypeCode(chargeTypeCode: string | null | undefined): "AIDAT" | "DOGALGAZ" | null {
  const normalized = toAsciiLower(chargeTypeCode ?? "").trim();
  if (normalized === "aidat") {
    return "AIDAT";
  }
  if (normalized === "dogalgaz") {
    return "DOGALGAZ";
  }
  return null;
}

function isApartmentExemptForChargeType(
  apartment: { hasAidat: boolean; hasDogalgaz: boolean },
  restrictedChargeType: "AIDAT" | "DOGALGAZ"
): boolean {
  if (restrictedChargeType === "AIDAT") {
    return !apartment.hasAidat;
  }
  return !apartment.hasDogalgaz;
}

const OPENING_BALANCE_PAYMENT_NOTE_PREFIX = "OPENING_BALANCE|";
const CARRY_FORWARD_PAYMENT_NOTE_TAG = "CARRY_FORWARD:APARTMENT_CREDIT";
const LEGACY_XLS_UNSUPPORTED_MESSAGE =
  "Bu dosya eski Excel (.xls) formatinda. Lutfen dosyayi .xlsx olarak kaydedip tekrar yukleyin.";

function buildOpeningBalanceNote(bankName: string, branchName: string | null): string {
  const payload = JSON.stringify({
    bankName,
    branchName,
  });
  return `${OPENING_BALANCE_PAYMENT_NOTE_PREFIX}${payload}`;
}

function parseOpeningBalanceNote(note: string | null | undefined): { bankName: string; branchName: string | null } {
  if (!note || !note.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)) {
    return { bankName: "Bilinmeyen Banka", branchName: null };
  }

  const raw = note.slice(OPENING_BALANCE_PAYMENT_NOTE_PREFIX.length).trim();
  if (!raw) {
    return { bankName: "Bilinmeyen Banka", branchName: null };
  }

  try {
    const parsed = JSON.parse(raw) as { bankName?: string; branchName?: string | null };
    const bankName = parsed.bankName?.trim() || "Bilinmeyen Banka";
    const branchName = parsed.branchName?.trim() || null;
    return { bankName, branchName };
  } catch {
    return { bankName: raw, branchName: null };
  }
}


function parseFlexibleDateTime(raw: unknown): Date | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[-\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      const hour = Number(match[4] ?? "0");
      const minute = Number(match[5] ?? "0");
      const second = Number(match[6] ?? "0");

      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return parseFlexibleDate(raw);
}

function parseSignedAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && Math.abs(raw) > 0.0001 ? raw : null;
  }

  if (typeof raw !== "string") {
    return null;
  }

  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact) {
    return null;
  }

  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");

  let normalized = compact;
  if (hasComma && hasDot) {
    // TR style: 1.234,56 => 1234.56
    if (compact.lastIndexOf(",") > compact.lastIndexOf(".")) {
      normalized = compact.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // EN style: 1,234.56 => 1234.56
      normalized = compact.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = compact.replace(/,/g, ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value) <= 0.0001) {
    return null;
  }

  return value;
}

function toAsciiLower(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeKeywordForMatch(value: string): string {
  return toAsciiLower(value)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBankFeeDescription(description: string): boolean {
  const text = toAsciiLower(description);
  return (
    /\bbsmv\b/.test(text) ||
    ((/\bucret\b|\bkomisyon\b|\bmasraf\b/.test(text) && /\btry\s*uz\.?\b/.test(text)) ||
      text.includes("banka masraf"))
  );
}

function isBankFeeExpenseItem(item: { code: string; name: string }): boolean {
  const code = toAsciiLower(item.code);
  const name = toAsciiLower(item.name);
  return (
    (code.includes("banka") && (code.includes("masraf") || code.includes("ucret") || code.includes("komisyon"))) ||
    (name.includes("banka") && (name.includes("masraf") || name.includes("ucret") || name.includes("komisyon"))) ||
    code.includes("bsmv") ||
    name.includes("bsmv")
  );
}

async function parseBankStatementRows(file: Express.Multer.File): Promise<BankStatementRow[]> {
  const lowerName = file.originalname.toLowerCase();
  if (!(lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv") || lowerName.endsWith(".txt"))) {
    return [];
  }

  if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) {
    return [];
  }

  const rows = await parseExcelRowsAsArray(file.buffer);

  const dateHeaderKeys = new Set([
    "tarihsaat",
    "tarih",
    "valor",
    "islemtarihi",
    "islemtarih",
    "dekonttarihi",
  ]);
  const descriptionHeaderKeys = new Set([
    "aciklama",
    "description",
    "islemaciklamasi",
    "islemaciklama",
    "detay",
  ]);
  const signedAmountHeaderKeys = new Set([
    "islemtutari",
    "tutar",
    "amount",
    "islemtutar",
    "tutartry",
  ]);
  const debitHeaderKeys = new Set([
    "borc",
    "debit",
    "cikis",
    "withdrawal",
    "odeme",
  ]);
  const creditHeaderKeys = new Set([
    "alacak",
    "credit",
    "giris",
    "deposit",
    "tahsilat",
  ]);

  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => normalizeHeader(String(cell ?? "")));
    const hasDate = cells.some((cell) => dateHeaderKeys.has(cell));
    const hasDescription = cells.some((cell) => descriptionHeaderKeys.has(cell));
    const hasSignedAmount = cells.some((cell) => signedAmountHeaderKeys.has(cell) || cell.includes("islemtutari"));
    const hasSplitAmount = cells.some((cell) => debitHeaderKeys.has(cell)) || cells.some((cell) => creditHeaderKeys.has(cell));
    return hasDate && hasDescription && (hasSignedAmount || hasSplitAmount);
  });

  if (headerIndex < 0) {
    return [];
  }

  const headerRow = rows[headerIndex].map((cell) => normalizeHeader(String(cell ?? "")));
  const dateCol = headerRow.findIndex((h) => dateHeaderKeys.has(h));
  const amountCol = headerRow.findIndex((h) => signedAmountHeaderKeys.has(h) || h.includes("islemtutari"));
  const debitCol = headerRow.findIndex((h) => debitHeaderKeys.has(h));
  const creditCol = headerRow.findIndex((h) => creditHeaderKeys.has(h));
  const descCol = headerRow.findIndex((h) => descriptionHeaderKeys.has(h));
  const refCol = headerRow.findIndex(
    (h) => h === "referans" || h === "reference" || h === "dekontno" || h === "islemno" || h === "fisno"
  );
  const txTypeCol = headerRow.findIndex(
    (h) => h === "islemtipi" || h === "tip" || h === "transactiontype" || h === "islemturu" || h === "tur"
  );

  if (dateCol < 0 || descCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
    return [];
  }

  const parsedRows: BankStatementRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const occurredAt = parseFlexibleDateTime(row[dateCol]);
    let amount = amountCol >= 0 ? parseSignedAmount(row[amountCol]) : null;
    if (amount === null) {
      const debitRaw = debitCol >= 0 ? parseSignedAmount(row[debitCol]) : null;
      const creditRaw = creditCol >= 0 ? parseSignedAmount(row[creditCol]) : null;
      const debit = debitRaw === null ? 0 : Math.abs(debitRaw);
      const credit = creditRaw === null ? 0 : Math.abs(creditRaw);
      const net = credit - debit;
      amount = Math.abs(net) > 0.0001 ? net : null;
    }
    const description = String(row[descCol] ?? "").trim();
    const reference = refCol >= 0 ? String(row[refCol] ?? "").trim() : "";
    const txType = txTypeCol >= 0 ? String(row[txTypeCol] ?? "").trim() : "";

    if (!occurredAt || amount === null || description.length === 0) {
      continue;
    }

    parsedRows.push({
      occurredAt,
      amount,
      description,
      reference: reference || undefined,
      txType: txType || undefined,
    });
  }

  return parsedRows;
}

function derivePaymentMethod(txType?: string): PaymentMethod {
  const normalized = toAsciiLower(txType ?? "");
  if (normalized.includes("eft") || normalized.includes("fast") || normalized.includes("havale")) {
    return PaymentMethod.BANK_TRANSFER;
  }
  return PaymentMethod.BANK_TRANSFER;
}

function extractDoorNoFromDescription(
  description: string,
  doorNoSet: Set<string>,
  rules: DescriptionDoorNoRuleLookup[] = []
): string | null {
  const normalizedForMatch = normalizeKeywordForMatch(description);
  const normalizedForMatchPadded = ` ${normalizedForMatch} `;
  const matchedDoorCandidates: Array<{ doorNo: string; score: number }> = [];

  // Rule-only matching: automatic door resolution is driven by Admin's
  // "Aciklama-Daire Esleme" definitions.
  for (const rule of rules) {
    const normalizedRule =
      normalizeKeywordForMatch(rule.keyword ?? "") || normalizeKeywordForMatch(rule.normalizedKeyword ?? "");
    if (!normalizedRule) {
      continue;
    }

    // Boundary-safe contains: prevents partial numeric hits (e.g. "daire 2" matching "daire 23").
    const directMatch = normalizedForMatchPadded.includes(` ${normalizedRule} `);
    const tokenFallbackMatch = !directMatch
      ? (() => {
          const tokens = normalizedRule.split(" ").filter((token) => token.length >= 3);
          if (tokens.length < 2) {
            return false;
          }
          return tokens.every((token) => normalizedForMatch.includes(token));
        })()
      : false;

    if (!directMatch && !tokenFallbackMatch) {
      continue;
    }

    const candidateDoorNo = doorNoSet.has(rule.doorNo)
      ? rule.doorNo
      : (() => {
          const asNumber = String(Number(rule.doorNo));
          return doorNoSet.has(asNumber) ? asNumber : null;
        })();
    if (!candidateDoorNo) {
      continue;
    }

    // Longer keyword means more specific rule (e.g. person name beats generic "daire xx").
    matchedDoorCandidates.push({ doorNo: candidateDoorNo, score: normalizedRule.length });
  }

  if (matchedDoorCandidates.length > 0) {
    matchedDoorCandidates.sort((a, b) => b.score - a.score);
    return matchedDoorCandidates[0].doorNo;
  }

  return null;
}

function matchExpenseItemId(
  description: string,
  items: Array<{ id: string; code: string; name: string }>,
  rules: DescriptionExpenseRuleLookup[] = []
): string | null {
  const text = toAsciiLower(description);
  const normalizedText = normalizeKeywordForMatch(description);
  const sorted = [...items].sort(
    (a, b) => Math.max(b.code.length, b.name.length) - Math.max(a.code.length, a.name.length)
  );

  // Highest priority: explicit description->expense mapping rules from admin panel.
  for (const rule of rules) {
    if (rule.normalizedKeyword && normalizedText.includes(rule.normalizedKeyword)) {
      const target = sorted.find((item) => item.id === rule.expenseItemId);
      if (target) {
        return target.id;
      }
    }
  }

  // Vendor-specific rule: OZATILIM records are generator maintenance/repair expenses.
  if (text.includes("ozatilim makina ve elektrik sistemleri")) {
    const generatorItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      const mentionsGenerator = code.includes("jenerator") || name.includes("jenerator");
      const mentionsMaintenance =
        code.includes("bakim") || name.includes("bakim") || code.includes("onarim") || name.includes("onarim");
      return mentionsGenerator && mentionsMaintenance;
    });

    if (generatorItem) {
      return generatorItem.id;
    }
  }

  // Utility-specific rule: ISKI records are water expenses.
  if (text.includes("iski")) {
    const waterItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      return code.includes("su") || name.includes("su") || code.includes("iski") || name.includes("iski");
    });

    if (waterItem) {
      return waterItem.id;
    }
  }

  // Utility-specific rule: IGDAS records are natural gas expenses.
  if (text.includes("igdas")) {
    const naturalGasItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      return code.includes("dogalgaz") || name.includes("dogalgaz") || code.includes("igdas") || name.includes("igdas");
    });

    if (naturalGasItem) {
      return naturalGasItem.id;
    }
  }

  // Utility-specific rule: CK BEPSAS records are electricity expenses.
  if (text.includes("ck bepsas")) {
    const electricityItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      return code.includes("elektrik") || name.includes("elektrik") || code.includes("ck") || name.includes("ck");
    });

    if (electricityItem) {
      return electricityItem.id;
    }
  }

  // Vendor-specific rule: Eyup Kurumahmutoglu records are elevator maintenance/repair expenses.
  const isEyupKurumahmutogluPayment =
    normalizedText.includes("eyup kurumahmutoglu") ||
    normalizedText.includes("kurumahmutoglu eyup") ||
    (normalizedText.includes("eyup") && normalizedText.includes("kurumahmutoglu"));

  if (isEyupKurumahmutogluPayment) {
    const elevatorItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      const mentionsElevator = code.includes("asansor") || name.includes("asansor");
      const mentionsMaintenance =
        code.includes("bakim") || name.includes("bakim") || code.includes("onarim") || name.includes("onarim");
      return mentionsElevator && mentionsMaintenance;
    });

    if (elevatorItem) {
      return elevatorItem.id;
    }
  }

  // Office/legal/tax small expenses should be grouped into the related expense bucket.
  const looksLikeOfficeLegalTax = text.includes("kirtasiye") || text.includes("noter") || text.includes("vergi");
  if (looksLikeOfficeLegalTax) {
    const officeLegalTaxItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      return (
        code.includes("kirtasiye") ||
        name.includes("kirtasiye") ||
        code.includes("noter") ||
        name.includes("noter") ||
        code.includes("vergi") ||
        name.includes("vergi") ||
        code.includes("diger") ||
        name.includes("diger")
      );
    });

    if (officeLegalTaxItem) {
      return officeLegalTaxItem.id;
    }
  }

  // Bank statement rows such as "BSMV ... TRY UZ." or "UCRET ... TRY UZ." should be treated as bank fees.
  const looksLikeBankFee = isBankFeeDescription(description);

  if (looksLikeBankFee) {
    const bankFeeItem = sorted.find((item) => {
      const code = toAsciiLower(item.code);
      const name = toAsciiLower(item.name);
      return (
        (code.includes("banka") && (code.includes("masraf") || code.includes("ucret") || code.includes("komisyon"))) ||
        (name.includes("banka") && (name.includes("masraf") || name.includes("ucret") || name.includes("komisyon"))) ||
        code.includes("bsmv") ||
        name.includes("bsmv")
      );
    });

    if (bankFeeItem) {
      return bankFeeItem.id;
    }
  }

  for (const item of sorted) {
    const code = toAsciiLower(item.code);
    const name = toAsciiLower(item.name);
    if (code.length >= 2 && text.includes(code)) {
      return item.id;
    }
    if (name.length >= 3 && text.includes(name)) {
      return item.id;
    }
  }

  if (text.includes("dogalgaz") || text.includes("dogal gaz") || text.includes("dogalgaz")) {
    const found = sorted.find((x) => toAsciiLower(x.code).includes("dogalgaz") || toAsciiLower(x.name).includes("dogalgaz"));
    if (found) {
      return found.id;
    }
  }

  if (text.includes("elektrik")) {
    const found = sorted.find((x) => toAsciiLower(x.code).includes("elektrik") || toAsciiLower(x.name).includes("elektrik"));
    if (found) {
      return found.id;
    }
  }

  if (text.includes("su ") || text.endsWith("su") || text.includes(" su")) {
    const found = sorted.find((x) => toAsciiLower(x.code) === "su" || toAsciiLower(x.name) === "su");
    if (found) {
      return found.id;
    }
  }

  if (text.includes("sgk")) {
    const found = sorted.find((x) => toAsciiLower(x.code).includes("sgk") || toAsciiLower(x.name).includes("sgk"));
    if (found) {
      return found.id;
    }
  }

  if (text.includes("maas")) {
    const found = sorted.find((x) => toAsciiLower(x.code).includes("maas") || toAsciiLower(x.name).includes("maas"));
    if (found) {
      return found.id;
    }
  }

  return null;
}

function decodeBase64Url(data: string): Buffer {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  return Buffer.from(padded, "base64");
}

function collectPdfAttachmentParts(part: GmailMessagePart | undefined, bucket: GmailMessagePart[]): void {
  if (!part) {
    return;
  }

  const fileName = part.filename?.trim() ?? "";
  const mimeType = part.mimeType?.toLowerCase() ?? "";
  const isPdf = fileName.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";

  if (isPdf && (part.body?.attachmentId || part.body?.data)) {
    bucket.push(part);
  }

  for (const child of part.parts ?? []) {
    collectPdfAttachmentParts(child, bucket);
  }
}

function parseBankStatementRowsFromPdfText(pdfText: string): BankStatementRow[] {
  const rows: BankStatementRow[] = [];
  const lines = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const transactionStartRegex = /^\d{2}[./-]\d{2}[./-]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?/;
  const isStatementFooterLine = (line: string): boolean => {
    const normalized = toAsciiLower(line);
    return (
      normalized.includes("islem saatleri turkiye saati ile gosterilmektedir") ||
      normalized.includes("bu hesap ozeti") ||
      normalized.includes("banka kayitlarinin uyusmamasi halinde") ||
      normalized.includes("bizi tercih ettiginiz icin tesekkur") ||
      normalized.includes("www.isbank.com.tr") ||
      normalized.includes("0 850 724 0 724") ||
      normalized.includes("-- 1 of 1 --")
    );
  };
  const mergedLines: string[] = [];
  let currentLine: string | null = null;

  for (const line of lines) {
    if (isStatementFooterLine(line)) {
      if (currentLine) {
        mergedLines.push(currentLine);
        currentLine = null;
      }
      continue;
    }

    if (transactionStartRegex.test(line)) {
      if (currentLine) {
        mergedLines.push(currentLine);
      }
      currentLine = line;
      continue;
    }

    if (currentLine) {
      currentLine = `${currentLine} ${line}`;
    }
  }

  if (currentLine) {
    mergedLines.push(currentLine);
  }

  const dateRegex = /(\d{2}[./-]\d{2}[./-]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/;
  const amountRegex = /[-+]?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|[-+]?\d+(?:,\d{2})/g;

  for (const line of mergedLines) {
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) {
      continue;
    }

    const occurredAt = parseFlexibleDateTime(dateMatch[1]);
    if (!occurredAt) {
      continue;
    }

    const amountMatches = [...line.matchAll(amountRegex)];
    if (amountMatches.length === 0) {
      continue;
    }

    const dateStartIndex = dateMatch.index ?? line.indexOf(dateMatch[1]);
    const dateEndIndex = dateStartIndex >= 0 ? dateStartIndex + dateMatch[1].length : 0;
    // ISBANK statement lines are rendered as: date ... transaction amount ... balance ... description.
    // Using the first monetary token after the date avoids accidentally reading the balance column.
    const amountCandidates = amountMatches.filter((m) => (m.index ?? -1) >= dateEndIndex);
    if (amountCandidates.length === 0) {
      continue;
    }

    const rawAmount = amountCandidates[0]?.[0] ?? "";
    const parsedAmount = parseSignedAmount(rawAmount);
    if (parsedAmount === null) {
      continue;
    }

    const lowered = toAsciiLower(line);
    const hasIncomingHint =
      lowered.includes("gelen") ||
      lowered.includes("havale") ||
      lowered.includes("eft") ||
      lowered.includes("fast") ||
      lowered.includes("yatan") ||
      lowered.includes("alacak") ||
      lowered.includes("tahsilat");
    const hasOutgoingHint =
      lowered.includes("giden") ||
      lowered.includes("odeme") ||
      lowered.includes("borc") ||
      lowered.includes("masraf") ||
      lowered.includes("ucret") ||
      lowered.includes("komisyon");

    let signedAmount = Math.abs(parsedAmount);
    if (rawAmount.trim().startsWith("-")) {
      signedAmount = -Math.abs(parsedAmount);
    } else if (rawAmount.trim().startsWith("+")) {
      signedAmount = Math.abs(parsedAmount);
    } else if (hasOutgoingHint && !hasIncomingHint) {
      signedAmount = -Math.abs(parsedAmount);
    }

    const secondAmount = amountCandidates[1];
    const descriptionStartIndex = secondAmount
      ? (secondAmount.index ?? -1) + secondAmount[0].length
      : (amountCandidates[0].index ?? -1) + rawAmount.length;

    let description =
      descriptionStartIndex > 0 && descriptionStartIndex < line.length
        ? line.slice(descriptionStartIndex)
        : line.replace(dateMatch[1], " ").replace(rawAmount, " ");

    description = description.replace(/^\s*(?:TRY|TL|YTL)\b[:\s-]*/i, "").replace(/\s+/g, " ").trim();
    if (!description) {
      description = line;
    }

    rows.push({
      occurredAt,
      amount: signedAmount,
      description,
    });
  }

  return rows;
}

function parseDoorNosFromFreeText(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .replace(/\bve\b/gi, ",")
    .replace(/\bveya\b/gi, ",")
    .split(/[,;|/&\-\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeDoorPatternText(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function extractDoorNosFromDescriptionForSplit(description: string): string[] {
  const text = normalizeDoorPatternText(description.trim());
  if (!text.trim()) {
    return [];
  }

  const explicitPrefixedDoorNos = [...text.matchAll(/\b(?:d|daire)\s*[:#\-\/.]?\s*0*(\d{1,4})\b/g)].map(
    (match) => match[1]
  );

  const groupedByKeyword = [
    ...text.matchAll(/\b(?:d|daire|daireler)\b[^\d]{0,6}((?:\d{1,4}\s*(?:,|ve|veya|&|\/|-)\s*)+\d{1,4})/g),
  ].flatMap((match) => parseDoorNosFromFreeText(match[1] ?? ""));

  const compactPairs = [
    ...text.matchAll(/\bd\s*0*(\d{1,4})\s*(?:ve|veya|\/|&|-)\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\b0*(\d{1,4})\s*(?:ve|veya|\/|&)\s*0*(\d{1,4})\b/g),
  ].flatMap((match) => [match[1], match[2]]);

  const merged = [...new Set([...explicitPrefixedDoorNos, ...groupedByKeyword, ...compactPairs])];
  if (merged.length >= 2) {
    return merged;
  }

  return [];
}

function resolveSplitDoorNosFromDescription(description: string, validDoorNos: Set<string>): string[] {
  const knownPairs = [
    ["57", "93"],
    ["48", "65"],
    ["35", "45"],
  ] as const;

  const normalizedDescription = normalizeDoorPatternText(description);

  for (const [left, right] of knownPairs) {
    const leftEscaped = left.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rightEscaped = right.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pairPattern = new RegExp(
      `(?:^|\\D)${leftEscaped}\\s*(?:-|/|ve|veya|&)\\s*${rightEscaped}(?:\\D|$)|(?:^|\\D)${rightEscaped}\\s*(?:-|/|ve|veya|&)\\s*${leftEscaped}(?:\\D|$)`,
      "i"
    );
    const leftToken = new RegExp(`(?:^|\\D)${leftEscaped}(?:\\D|$)`, "i");
    const rightToken = new RegExp(`(?:^|\\D)${rightEscaped}(?:\\D|$)`, "i");

    const isKnownPairMentioned = pairPattern.test(normalizedDescription);
    const isSingleKnownMemberMentioned = leftToken.test(normalizedDescription) || rightToken.test(normalizedDescription);

    if (!isKnownPairMentioned && !isSingleKnownMemberMentioned) {
      continue;
    }

    const normalizedLeft = normalizeDoorNoForCompare(left);
    const normalizedRight = normalizeDoorNoForCompare(right);
    const knownDoorNos = [normalizedLeft, normalizedRight].filter((doorNo) => validDoorNos.has(doorNo));

    if (knownDoorNos.length >= 2) {
      return knownDoorNos;
    }
  }

  const fromDescription = extractDoorNosFromDescriptionForSplit(description);
  return [...new Set(fromDescription.map((x) => normalizeDoorNoForCompare(x)))].filter((doorNo) => validDoorNos.has(doorNo));
}

function autoSplitMultiDoorPaymentRows(rows: BankStatementCommitRow[], validDoorNos: Set<string>): BankStatementCommitRow[] {
  const nextRows: BankStatementCommitRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 1;

    if (row.entryType !== "PAYMENT" || !Number.isFinite(row.amount) || row.amount <= 0) {
      nextRows.push({
        ...row,
        isAutoSplit: false,
        splitSourceRowNo: undefined,
      });
      continue;
    }

    const mergedCandidates = resolveSplitDoorNosFromDescription(row.description, validDoorNos);
    if (mergedCandidates.length < 2) {
      nextRows.push({
        ...row,
        isAutoSplit: false,
        splitSourceRowNo: undefined,
      });
      continue;
    }

    const count = mergedCandidates.length;
    const base = Math.floor((row.amount / count) * 100) / 100;
    const remainder = Number((row.amount - base * count).toFixed(2));

    mergedCandidates.forEach((doorNo, idx) => {
      nextRows.push({
        ...row,
        doorNo,
        amount: Number((base + (idx === 0 ? remainder : 0)).toFixed(2)),
        isAutoSplit: true,
        splitSourceRowNo: rowNo,
      });
    });
  }

  return nextRows;
}

async function parseBankStatementRowsFromPdfBuffer(fileBuffer: Buffer): Promise<BankStatementRow[]> {
  const parser = new PDFParse({ data: fileBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return parseBankStatementRowsFromPdfText(parsed.text ?? "");
}

async function fetchGmailAccessToken(): Promise<string> {
  const clientId = config.gmailBankSync.oauthClientId?.trim();
  const clientSecret = config.gmailBankSync.oauthClientSecret?.trim();
  const refreshToken = config.gmailBankSync.oauthRefreshToken?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth bilgileri eksik (GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN)");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail access token alinamadi (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  const accessToken = data.access_token?.trim();
  if (!accessToken) {
    throw new Error("Gmail access token bos dondu");
  }

  return accessToken;
}

async function gmailApiGet<T>(accessToken: string, path: string): Promise<T> {
  const userId = encodeURIComponent(config.gmailBankSync.gmailUser?.trim() || "me");
  const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail API hatasi (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function buildGmailQuery(): string {
  const customQuery = config.gmailBankSync.query?.trim();
  if (customQuery) {
    return customQuery;
  }

  const senderFilter = config.gmailBankSync.senderFilter?.trim();
  const subjectContains = config.gmailBankSync.subjectContains?.trim();
  const safeSubjectContains = subjectContains ? subjectContains.replace(/"/g, " ").trim() : "";
  const lookbackDays = Math.max(1, config.gmailBankSync.lookbackDays);
  const parts = [
    senderFilter ? `from:${senderFilter}` : "",
    safeSubjectContains ? `subject:${safeSubjectContains}` : "",
    "has:attachment",
    "filename:pdf",
    `newer_than:${lookbackDays}d`,
  ].filter(Boolean);

  return parts.join(" ");
}

async function fetchGmailPdfAttachments(messageId: string, accessToken: string): Promise<Array<{ fileName: string; data: Buffer }>> {
  const message = await gmailApiGet<GmailMessageGetResponse>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?format=full`
  );

  const parts: GmailMessagePart[] = [];
  collectPdfAttachmentParts(message.payload, parts);

  const attachments: Array<{ fileName: string; data: Buffer }> = [];
  for (const part of parts) {
    const fileName = part.filename?.trim() || `gmail-${messageId}.pdf`;

    if (part.body?.data) {
      attachments.push({ fileName, data: decodeBase64Url(part.body.data) });
      continue;
    }

    const attachmentId = part.body?.attachmentId?.trim();
    if (!attachmentId) {
      continue;
    }

    const attachment = await gmailApiGet<GmailAttachmentGetResponse>(
      accessToken,
      `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );

    if (!attachment.data) {
      continue;
    }

    attachments.push({ fileName, data: decodeBase64Url(attachment.data) });
  }

  return attachments;
}

async function fetchImapPdfAttachments(): Promise<{
  scannedMessageCount: number;
  attachments: Array<{ messageKey: string; fileName: string; data: Buffer }>;
}> {
  const user = config.gmailBankSync.gmailUser?.trim();
  const password = config.gmailBankSync.appPassword?.trim();
  if (!user || !password) {
    throw new Error("IMAP bilgileri eksik (GMAIL_USER/GMAIL_APP_PASSWORD)");
  }

  const senderFilter = config.gmailBankSync.senderFilter?.trim().toLowerCase() ?? "";
  const subjectContains = config.gmailBankSync.subjectContains?.trim().toLocaleLowerCase("tr") ?? "";
  const lookbackDays = Math.max(1, config.gmailBankSync.lookbackDays);
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  since.setHours(0, 0, 0, 0);

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user,
      pass: password,
    },
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  try {
    const uidsRaw = await client.search({ since });
    const uids = Array.isArray(uidsRaw) ? uidsRaw : [];
    const maxMessages = Math.max(1, Math.min(config.gmailBankSync.maxMessages, 50));
    const selectedUids = uids.slice(-maxMessages).reverse();

    const attachments: Array<{ messageKey: string; fileName: string; data: Buffer }> = [];

    for await (const message of client.fetch(selectedUids, { uid: true, envelope: true, source: true })) {
      const fromAddresses = (message.envelope?.from ?? [])
        .map((entry) => entry.address?.toLowerCase() ?? "")
        .filter(Boolean);

      if (senderFilter && !fromAddresses.some((address) => address.includes(senderFilter))) {
        continue;
      }

      const envelopeSubject = (message.envelope?.subject ?? "").toString().trim().toLocaleLowerCase("tr");
      if (subjectContains && !envelopeSubject.includes(subjectContains)) {
        continue;
      }

      const parsed = await simpleParser(message.source as Buffer);
      const parsedSubject = (parsed.subject ?? "").trim().toLocaleLowerCase("tr");
      if (subjectContains && parsedSubject && !parsedSubject.includes(subjectContains)) {
        continue;
      }
      const messageKey = (parsed.messageId?.trim() || String(message.uid)).replace(/[<>]/g, "");

      for (const att of parsed.attachments) {
        const mimeType = (att.contentType ?? "").toLowerCase();
        const fileName = (att.filename ?? "").trim();
        const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          continue;
        }

        const content = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
        attachments.push({
          messageKey,
          fileName: fileName || `imap-${message.uid}.pdf`,
          data: content,
        });
      }
    }

    return {
      scannedMessageCount: selectedUids.length,
      attachments,
    };
  } finally {
    lock.release();
    await client.logout();
  }
}

export async function runGmailBankSync(uploadedById?: string): Promise<{
  query: string;
  scannedMessageCount: number;
  importedBatchCount: number;
  skippedDuplicateAttachmentCount: number;
  skippedNoParsedRowsCount: number;
  importedPaymentCount: number;
  importedExpenseCount: number;
  skippedRowCount: number;
  batchIds: string[];
  errors: string[];
}> {
  if (!config.gmailBankSync.enabled) {
    throw new Error("Gmail bank sync kapali (GMAIL_BANK_SYNC_ENABLED=true olmali)");
  }

  const usingImap = Boolean(config.gmailBankSync.appPassword?.trim());
  const query = usingImap
    ? `IMAP newer_than:${Math.max(1, config.gmailBankSync.lookbackDays)}d${
        config.gmailBankSync.senderFilter ? ` from:${config.gmailBankSync.senderFilter}` : ""
      }`
    : buildGmailQuery();

  let importedBatchCount = 0;
  let skippedDuplicateAttachmentCount = 0;
  let skippedNoParsedRowsCount = 0;
  let importedPaymentCount = 0;
  let importedExpenseCount = 0;
  let skippedRowCount = 0;
  const batchIds: string[] = [];
  const errors: string[] = [];

  const allAttachments: Array<{ key: string; fileName: string; data: Buffer }> = [];
  let scannedMessageCount = 0;
  const apartmentsForSplit = await prisma.apartment.findMany({
    select: { doorNo: true },
  });
  const validDoorNosForSplit = new Set(
    apartmentsForSplit
      .flatMap((apt) => [apt.doorNo, normalizeDoorNoForCompare(apt.doorNo)])
      .filter((value): value is string => Boolean(value && value.trim().length > 0))
  );

  if (usingImap) {
    const imapResult = await fetchImapPdfAttachments();
    scannedMessageCount = imapResult.scannedMessageCount;
    for (const attachment of imapResult.attachments) {
      allAttachments.push({ key: attachment.messageKey, fileName: attachment.fileName, data: attachment.data });
    }
  } else {
    const accessToken = await fetchGmailAccessToken();
    const maxMessages = Math.max(1, Math.min(config.gmailBankSync.maxMessages, 50));
    const list = await gmailApiGet<GmailListMessagesResponse>(
      accessToken,
      `/messages?q=${encodeURIComponent(query)}&maxResults=${maxMessages}`
    );
    const messages = list.messages ?? [];
    scannedMessageCount = messages.length;

    for (const message of messages) {
      try {
        const attachments = await fetchGmailPdfAttachments(message.id, accessToken);
        for (const attachment of attachments) {
          allAttachments.push({ key: message.id, fileName: attachment.fileName, data: attachment.data });
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : "Beklenmeyen hata";
        errors.push(`Message ${message.id}: ${text}`);
      }
    }
  }

  for (const attachment of allAttachments) {
    try {
      const importFileName = `gmail:${attachment.key}:${attachment.fileName}`;
      const existingBatch = await prisma.importBatch.findFirst({
        where: {
          kind: ImportBatchType.BANK_STATEMENT_UPLOAD,
          fileName: importFileName,
        },
        select: { id: true },
      });

      if (existingBatch) {
        skippedDuplicateAttachmentCount += 1;
        continue;
      }

      const parsedRows = await parseBankStatementRowsFromPdfBuffer(attachment.data);
      const filteredRows = config.gmailBankSync.importOnlyIncoming
        ? parsedRows.filter((row) => row.amount > 0)
        : parsedRows;

      if (filteredRows.length === 0) {
        skippedNoParsedRowsCount += 1;
        continue;
      }

      const rawCommitRows: BankStatementCommitRow[] = filteredRows.map((row) => ({
        occurredAt: row.occurredAt,
        amount: Number(Math.abs(row.amount).toFixed(2)),
        entryType: row.amount > 0 ? "PAYMENT" : "EXPENSE",
        description: row.description,
        reference: row.reference?.trim() || buildGmailFallbackReference(row),
        txType: row.txType,
        paymentMethod: derivePaymentMethod(row.txType),
      }));

      const commitRows = autoSplitMultiDoorPaymentRows(rawCommitRows, validDoorNosForSplit);

      const result = await processBankStatementImport({
        rows: commitRows,
        fileName: importFileName,
        uploadedById,
      });

      importedBatchCount += 1;
      importedPaymentCount += result.paymentCreatedCount;
      importedExpenseCount += result.expenseCreatedCount;
      skippedRowCount += result.skippedCount;
      batchIds.push(result.batchId);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Beklenmeyen hata";
      errors.push(`Attachment ${attachment.key}/${attachment.fileName}: ${text}`);
    }
  }

  return {
    query,
    scannedMessageCount,
    importedBatchCount,
    skippedDuplicateAttachmentCount,
    skippedNoParsedRowsCount,
    importedPaymentCount,
    importedExpenseCount,
    skippedRowCount,
    batchIds,
    errors: errors.slice(0, 100),
  };
}

async function processBankStatementImport(params: {
  rows: BankStatementCommitRow[];
  fileName: string;
  uploadedById?: string;
}) {
  const { rows, fileName, uploadedById } = params;
  const uncategorizedExpenseCode = "SINIFLANDIRILAMAYAN_GIDERLER";
  const uncategorizedExpenseName = "Siniflandirilamayan Giderler";
  const uncategorizedCollectionCode = "SINIFLANDIRILAMAYAN_TAHSILATLAR";
  const uncategorizedCollectionName = "Siniflandirilamayan Tahsilatlar";

  const batch = await prisma.importBatch.create({
    data: {
      kind: ImportBatchType.BANK_STATEMENT_UPLOAD,
      fileName,
      uploadedById,
      totalRows: rows.length,
    },
  });

  const apartments = await prisma.apartment.findMany({
    select: { id: true, doorNo: true },
  });
  const doorNoMap = new Map<string, string>();
  for (const apt of apartments) {
    doorNoMap.set(apt.doorNo, apt.id);
    doorNoMap.set(String(Number(apt.doorNo)), apt.id);
  }
  const doorNoSet = new Set(doorNoMap.keys());
  const activeDoorNoRules: DescriptionDoorNoRuleLookup[] = (
    await prisma.descriptionDoorNoRule.findMany({
      where: { isActive: true },
      select: { keyword: true, normalizedKeyword: true, doorNo: true },
      orderBy: [{ updatedAt: "desc" }],
    })
  ).map((rule) => ({
    keyword: rule.keyword,
    normalizedKeyword: rule.normalizedKeyword,
    doorNo: rule.doorNo,
  }));

  await prisma.expenseItemDefinition.upsert({
    where: { code: uncategorizedExpenseCode },
    update: { name: uncategorizedExpenseName, isActive: true },
    create: { code: uncategorizedExpenseCode, name: uncategorizedExpenseName, isActive: true },
  });
  await prisma.chargeTypeDefinition.upsert({
    where: { code: uncategorizedCollectionCode },
    update: { name: uncategorizedCollectionName, isActive: true },
    create: { code: uncategorizedCollectionCode, name: uncategorizedCollectionName, isActive: true },
  });

  const allExpenseItems = await prisma.expenseItemDefinition.findMany({
    select: { id: true, code: true, name: true, isActive: true },
  });
  const uncategorizedExpenseItemId =
    allExpenseItems.find((item) => item.code === uncategorizedExpenseCode)?.id ?? null;
  const activeExpenseItems = allExpenseItems
    .filter((item) => item.isActive)
    .map((item) => ({ id: item.id, code: item.code, name: item.name }));
  const allExpenseItemIdSet = new Set(allExpenseItems.map((x) => x.id));

  const activeExpenseRules: DescriptionExpenseRuleLookup[] = (
    await prisma.descriptionExpenseRule.findMany({
      where: { isActive: true, expenseItem: { isActive: true } },
      select: { normalizedKeyword: true, expenseItemId: true },
      orderBy: [{ updatedAt: "desc" }],
    })
  ).map((rule) => ({
    normalizedKeyword: rule.normalizedKeyword,
    expenseItemId: rule.expenseItemId,
  }));

  const normalizeExpenseDedupText = (value: string): string =>
    value
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("tr");

  const toDateOnlyKey = (value: Date): string => value.toISOString().slice(0, 10);

  const buildExpenseDedupKey = (input: {
    reference: string;
    occurredAt: Date;
    amount: number;
    description: string;
  }): string => {
    const normalizedRef = input.reference.trim();
    const normalizedAmount = Number(Math.abs(input.amount).toFixed(2)).toFixed(2);
    const normalizedDesc = normalizeExpenseDedupText(input.description);
    return [normalizedRef, toDateOnlyKey(input.occurredAt), normalizedAmount, normalizedDesc].join("|");
  };

  const paymentReferenceSet = new Set<string>();
  const expenseDedupKeySet = new Set<string>();
  const incomingExpenseReferences = [...new Set(
    rows
      .filter((r) => r.entryType === "EXPENSE")
      .map((r) => r.reference?.trim())
      .filter((ref): ref is string => Boolean(ref))
  )];
  const existingExpenseDedupKeySet = new Set(
    incomingExpenseReferences.length > 0
      ? (
          await prisma.expense.findMany({
            where: { reference: { in: incomingExpenseReferences } },
            select: { reference: true, spentAt: true, amount: true, description: true },
          })
        )
          .map((row) => {
            const ref = row.reference?.trim();
            if (!ref) {
              return null;
            }

            return buildExpenseDedupKey({
              reference: ref,
              occurredAt: row.spentAt,
              amount: Number(row.amount),
              description: row.description ?? "",
            });
          })
          .filter((key): key is string => Boolean(key))
      : []
  );
  const positiveCount = rows.filter((r) => r.entryType === "PAYMENT").length;
  const negativeCount = rows.filter((r) => r.entryType === "EXPENSE").length;

  const openChargeRows = await prisma.charge.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      apartmentId: true,
      periodYear: true,
      periodMonth: true,
      description: true,
      amount: true,
      dueDate: true,
      createdAt: true,
      chargeType: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  const openChargeIds = openChargeRows.map((row) => row.id);
  const paidByChargeId = new Map<string, number>();
  if (openChargeIds.length > 0) {
    const paymentSums = await prisma.paymentItem.groupBy({
      by: ["chargeId"],
      where: { chargeId: { in: openChargeIds } },
      _sum: { amount: true },
    });
    for (const sumRow of paymentSums) {
      paidByChargeId.set(sumRow.chargeId, Number(sumRow._sum.amount ?? 0));
    }
  }

  const openChargeStatesByApartment = new Map<
    string,
    Array<{ chargeId: string; remaining: number; closedInImport: boolean }>
  >();
  for (const charge of openChargeRows) {
    const paid = paidByChargeId.get(charge.id) ?? 0;
    const remaining = Number((Number(charge.amount) - paid).toFixed(2));
    if (remaining <= 0.0001) {
      continue;
    }

    const list = openChargeStatesByApartment.get(charge.apartmentId) ?? [];
    list.push({
      chargeId: charge.id,
      remaining,
      closedInImport: false,
    });
    openChargeStatesByApartment.set(charge.apartmentId, list);
  }

  const chargeSortMetaById = new Map(
    openChargeRows.map((row) => [row.id, { dueAt: row.dueDate.getTime(), createdAt: row.createdAt.getTime() }])
  );
  const chargeMetaById = new Map(
    openChargeRows.map((row) => [
      row.id,
      {
        periodYear: row.periodYear,
        periodMonth: row.periodMonth,
        chargeTypeCode: toAsciiLower(row.chargeType.code),
        chargeTypeName: toAsciiLower(row.chargeType.name),
        chargeDescription: toAsciiLower(row.description ?? ""),
      },
    ])
  );
  for (const list of openChargeStatesByApartment.values()) {
    list.sort((a, b) => {
      const aMeta = chargeSortMetaById.get(a.chargeId);
      const bMeta = chargeSortMetaById.get(b.chargeId);
      if (!aMeta || !bMeta) {
        return a.chargeId.localeCompare(b.chargeId);
      }

      const dueDiff = aMeta.dueAt - bMeta.dueAt;
      if (dueDiff !== 0) {
        return dueDiff;
      }

      const createdDiff = aMeta.createdAt - bMeta.createdAt;
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return a.chargeId.localeCompare(b.chargeId);
    });
  }

  const monthTokenToNumber = new Map<string, number>([
    ["ocak", 1],
    ["subat", 2],
    ["mart", 3],
    ["nisan", 4],
    ["mayis", 5],
    ["haziran", 6],
    ["temmuz", 7],
    ["agustos", 8],
    ["eylul", 9],
    ["ekim", 10],
    ["kasim", 11],
    ["aralik", 12],
  ]);

  function detectChargeTypeHints(normalizedDescription: string): Set<"aidat" | "dogalgaz" | "su" | "elektrik"> {
    const hints = new Set<"aidat" | "dogalgaz" | "su" | "elektrik">();
    if (/\baida[tr]\b/.test(normalizedDescription)) {
      hints.add("aidat");
    }
    if (
      normalizedDescription.includes("dogalgaz") ||
      normalizedDescription.includes("dogal gaz") ||
      normalizedDescription.includes("igdas")
    ) {
      hints.add("dogalgaz");
    }
    if (normalizedDescription.includes("iski") || normalizedDescription.includes("water")) {
      hints.add("su");
    }
    if (normalizedDescription.includes("elektrik") || normalizedDescription.includes("electric")) {
      hints.add("elektrik");
    }
    return hints;
  }

  function chargeMatchesTypeHints(
    chargeId: string,
    hints: Set<"aidat" | "dogalgaz" | "su" | "elektrik">
  ): boolean {
    if (hints.size === 0) {
      return true;
    }

    const meta = chargeMetaById.get(chargeId);
    if (!meta) {
      return false;
    }

    const haystack = `${meta.chargeTypeCode} ${meta.chargeTypeName} ${meta.chargeDescription}`;
    for (const hint of hints) {
      if (hint === "aidat" && haystack.includes("aidat")) {
        return true;
      }
      if (hint === "dogalgaz" && (haystack.includes("dogalgaz") || haystack.includes("dogal gaz") || haystack.includes("igdas"))) {
        return true;
      }
      if (hint === "su" && (haystack.includes("su") || haystack.includes("iski") || haystack.includes("water"))) {
        return true;
      }
      if (hint === "elektrik" && (haystack.includes("elektrik") || haystack.includes("electric"))) {
        return true;
      }
    }

    return false;
  }

  function pickPreferredOpenChargesFromDescription(
    openCharges: Array<{ chargeId: string; remaining: number; closedInImport: boolean }>,
    description: string | undefined,
    paymentAmount: number
  ): { charges: Array<{ chargeId: string; remaining: number; closedInImport: boolean }>; reason: string } | null {
    const normalizedDescription = normalizeKeywordForMatch(description ?? "");
    if (!normalizedDescription) {
      return null;
    }

    const monthHints = new Set<number>();
    for (const [monthToken, monthNo] of monthTokenToNumber.entries()) {
      const monthPattern = new RegExp(`(?:^|[^a-z])${monthToken}(?=$|[^a-z]|\\d)`, "g");
      if (monthPattern.test(normalizedDescription)) {
        monthHints.add(monthNo);
      }
    }

    // Month hint is required to keep this auto-selection safe.
    if (monthHints.size === 0) {
      return null;
    }

    const yearMatch = normalizedDescription.match(/(?:^|[^\d])(20\d{2})(?=$|[^\d])/);
    const yearHint = yearMatch ? Number(yearMatch[1]) : null;
    const typeHints = detectChargeTypeHints(normalizedDescription);

    const monthScoped = openCharges.filter((charge) => {
      const meta = chargeMetaById.get(charge.chargeId);
      if (!meta) {
        return false;
      }
      if (!monthHints.has(meta.periodMonth)) {
        return false;
      }
      if (yearHint !== null && meta.periodYear !== yearHint) {
        return false;
      }
      return true;
    });

    if (monthScoped.length === 0) {
      return null;
    }

    const monthAndTypeScoped =
      typeHints.size > 0 ? monthScoped.filter((charge) => chargeMatchesTypeHints(charge.chargeId, typeHints)) : monthScoped;
    const scoped = monthAndTypeScoped.length > 0 ? monthAndTypeScoped : monthScoped;

    const scopedExact = scoped.filter((charge) => Math.abs(charge.remaining - paymentAmount) <= 0.01);
    if (scopedExact.length === 1) {
      return { charges: scopedExact, reason: "DESCRIPTION_HINT:UNIQUE_EXACT" };
    }

    if (scopedExact.length > 1) {
      return null;
    }

    const scopedTotal = Number(scoped.reduce((sum, charge) => sum + charge.remaining, 0).toFixed(2));
    if (Math.abs(scopedTotal - paymentAmount) <= 0.01) {
      return { charges: scoped, reason: "DESCRIPTION_HINT:SUM_MATCH" };
    }

    if (scoped.length === 1) {
      return { charges: scoped, reason: "DESCRIPTION_HINT:SINGLE_CANDIDATE" };
    }

    return null;
  }

  function pickUniqueSubsetSumCharges(
    openCharges: Array<{ chargeId: string; remaining: number; closedInImport: boolean }>,
    description: string | undefined,
    paymentAmount: number
  ): { charges: Array<{ chargeId: string; remaining: number; closedInImport: boolean }>; reason: string } | null {
    const targetCents = Math.round(paymentAmount * 100);
    if (targetCents <= 0) {
      return null;
    }

    const normalizedDescription = normalizeKeywordForMatch(description ?? "");
    const typeHints = normalizedDescription ? detectChargeTypeHints(normalizedDescription) : new Set<"aidat" | "dogalgaz" | "su" | "elektrik">();
    const hintedCandidates =
      typeHints.size > 0 ? openCharges.filter((charge) => chargeMatchesTypeHints(charge.chargeId, typeHints)) : [];

    // Prefer type-hinted candidates when available, otherwise search on all open charges.
    const candidateBase = hintedCandidates.length >= 2 ? hintedCandidates : openCharges;

    // Safety cap: avoid expensive combinatorics on unusually large open debt sets.
    if (candidateBase.length < 2 || candidateBase.length > 18) {
      return null;
    }

    const candidates = candidateBase
      .map((charge, originalIndex) => ({
        originalIndex,
        charge,
        cents: Math.round(charge.remaining * 100),
      }))
      .filter((x) => x.cents > 0)
      .sort((a, b) => {
        const centsDiff = b.cents - a.cents;
        if (centsDiff !== 0) {
          return centsDiff;
        }
        return a.originalIndex - b.originalIndex;
      });

    if (candidates.length < 2) {
      return null;
    }

    const suffixSums = new Array<number>(candidates.length + 1).fill(0);
    for (let i = candidates.length - 1; i >= 0; i--) {
      suffixSums[i] = suffixSums[i + 1] + candidates[i].cents;
    }

    let solutionCount = 0;
    let firstSolutionIndexes: number[] = [];
    const selectedOriginalIndexes: number[] = [];

    function dfs(index: number, currentSum: number): void {
      if (solutionCount > 1) {
        return;
      }

      if (currentSum === targetCents) {
        solutionCount += 1;
        if (solutionCount === 1) {
          firstSolutionIndexes = [...selectedOriginalIndexes];
        }
        return;
      }

      if (index >= candidates.length) {
        return;
      }

      if (currentSum > targetCents) {
        return;
      }

      if (currentSum + suffixSums[index] < targetCents) {
        return;
      }

      const nextSum = currentSum + candidates[index].cents;
      if (nextSum <= targetCents) {
        selectedOriginalIndexes.push(candidates[index].originalIndex);
        dfs(index + 1, nextSum);
        selectedOriginalIndexes.pop();
      }

      dfs(index + 1, currentSum);
    }

    dfs(0, 0);

    if (solutionCount !== 1 || firstSolutionIndexes.length === 0) {
      return null;
    }

    const selectedChargeIds = new Set(firstSolutionIndexes.map((i: number) => candidateBase[i].chargeId));
    const orderedSelected = openCharges.filter((charge) => selectedChargeIds.has(charge.chargeId));

    // Ignore single-item matches here; they are already handled by unique exact-charge logic.
    if (orderedSelected.length <= 1) {
      return null;
    }

    const reason = hintedCandidates.length >= 2 ? "UNIQUE_SUBSET_SUM_MATCH:TYPE_HINT" : "UNIQUE_SUBSET_SUM_MATCH";
    return { charges: orderedSelected, reason };
  }

  let paymentCreatedCount = 0;
  let expenseCreatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const infos: string[] = [];

  // Process rows oldest-to-newest so allocations follow real payment chronology.
  const processingRows = rows
    .map((row, sourceIndex) => ({ row, rowNo: sourceIndex + 1, sourceIndex }))
    .sort((a, b) => {
      const dateDiff = a.row.occurredAt.getTime() - b.row.occurredAt.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.sourceIndex - b.sourceIndex;
    });

  for (const current of processingRows) {
    const row = current.row;
    const rowNo = current.rowNo;
    const reference = row.reference?.trim();
    const isSplitPaymentRow = row.entryType === "PAYMENT" && (row.isAutoSplit === true || Number.isFinite(row.splitSourceRowNo));

    try {
      if (row.entryType === "PAYMENT") {
        if (reference) {
          if (paymentReferenceSet.has(reference)) {
            if (!isSplitPaymentRow) {
              skippedCount += 1;
              errors.push(`Satir ${rowNo}: Ayni dosyada tekrar referans (${reference})`);
              continue;
            }
          } else {
            paymentReferenceSet.add(reference);
          }

          const existingPaymentWhere: Prisma.PaymentWhereInput = {
            note: {
              startsWith: `BANK_REF:${reference}`,
            },
          };

          if (isSplitPaymentRow) {
            existingPaymentWhere.NOT = { importBatchId: batch.id };
          }

          const existingPayment = await prisma.payment.findFirst({
            where: existingPaymentWhere,
            select: { id: true },
          });
          if (existingPayment) {
            skippedCount += 1;
            errors.push(`Satir ${rowNo}: Daha once islenmis referans (${reference})`);
            continue;
          }
        }

        const enteredDoorNo = row.doorNo?.trim();
        const detectedDoorNo =
          enteredDoorNo || extractDoorNoFromDescription(row.description, doorNoSet, activeDoorNoRules) || undefined;
        if (!detectedDoorNo) {
          const method = row.paymentMethod ?? derivePaymentMethod(row.txType);
          const noteParts = [
            reference ? `BANK_REF:${reference}` : undefined,
            row.description ? `BANK_DESC:${row.description}` : undefined,
            `UNCLASSIFIED_COLLECTION:${uncategorizedCollectionCode}`,
            "UNAPPLIED:NO_DOOR_NO",
          ].filter(Boolean) as string[];

          await prisma.payment.create({
            data: {
              importBatchId: batch.id,
              paidAt: row.occurredAt,
              method,
              note: noteParts.join(" | "),
              totalAmount: Number(row.amount.toFixed(2)),
              createdById: uploadedById,
            },
          });

          paymentCreatedCount += 1;
          infos.push(`Satir ${rowNo}: Daire no bulunamadi, tahsilat ${uncategorizedCollectionName} olarak dagitimsiz kaydedildi`);
          continue;
        }

        const apartmentId = doorNoMap.get(detectedDoorNo) ?? doorNoMap.get(String(Number(detectedDoorNo)));
        if (!apartmentId) {
          const method = row.paymentMethod ?? derivePaymentMethod(row.txType);
          const noteParts = [
            reference ? `BANK_REF:${reference}` : undefined,
            row.description ? `BANK_DESC:${row.description}` : undefined,
            detectedDoorNo ? `DOOR:${detectedDoorNo}` : undefined,
            `UNCLASSIFIED_COLLECTION:${uncategorizedCollectionCode}`,
            "UNAPPLIED:APARTMENT_NOT_FOUND",
          ].filter(Boolean) as string[];

          await prisma.payment.create({
            data: {
              importBatchId: batch.id,
              paidAt: row.occurredAt,
              method,
              note: noteParts.join(" | "),
              totalAmount: Number(row.amount.toFixed(2)),
              createdById: uploadedById,
            },
          });

          paymentCreatedCount += 1;
          infos.push(
            `Satir ${rowNo}: Daire bulunamadi (${detectedDoorNo}), tahsilat ${uncategorizedCollectionName} olarak dagitimsiz kaydedildi`
          );
          continue;
        }

        const infoDoorNo = detectedDoorNo && detectedDoorNo.trim().length > 0 ? detectedDoorNo.trim() : "-";
        const infoAmount = Number(row.amount.toFixed(2)).toFixed(2);
        const infoContextTag = `[DAIRE:${infoDoorNo} | TUTAR:${infoAmount}]`;

        const chargeStates = openChargeStatesByApartment.get(apartmentId) ?? [];
        const openCharges = chargeStates.filter((x) => x.remaining > 0.0001);

        if (openCharges.length === 0) {
          const method = row.paymentMethod ?? derivePaymentMethod(row.txType);
          const noteParts = [
            reference ? `BANK_REF:${reference}` : undefined,
            row.description ? `BANK_DESC:${row.description}` : undefined,
            detectedDoorNo ? `DOOR:${detectedDoorNo}` : undefined,
            "UNAPPLIED:NO_OPEN_DEBT",
          ].filter(Boolean) as string[];

          await prisma.payment.create({
            data: {
              importBatchId: batch.id,
              paidAt: row.occurredAt,
              method,
              note: noteParts.join(" | "),
              totalAmount: Number(row.amount.toFixed(2)),
              createdById: uploadedById,
            },
          });

          paymentCreatedCount += 1;
          infos.push(`Satir ${rowNo}: Dairede acik borc yoktu, odeme dagitimsiz kaydedildi (${detectedDoorNo}) ${infoContextTag}`);
          continue;
        }

        const paymentAmount = Number(row.amount.toFixed(2));
        const exactCharges = openCharges.filter((charge) => Math.abs(charge.remaining - paymentAmount) <= 0.01);
        const totalOpenDebt = Number(openCharges.reduce((sum, charge) => sum + charge.remaining, 0).toFixed(2));
        const safelyCoversAllOpenDebt = paymentAmount >= totalOpenDebt - 0.01;
        let autoMatchHintReason: string | undefined;
        let orderedCharges = openCharges;

        if (exactCharges.length === 1) {
          orderedCharges = exactCharges;
        } else if (exactCharges.length > 1) {
          // Deterministic tie-breaker: close the oldest exact-matching debt first.
          orderedCharges = [exactCharges[0]];
          autoMatchHintReason = "EXACT_OLDEST_MATCH";
        }

        // Safety gate: when debt is multi-target and there is no unique exact match,
        // keep payment unapplied instead of doing FIFO-like auto allocation.
        if (openCharges.length > 1 && exactCharges.length === 0 && !safelyCoversAllOpenDebt) {
          // First try: FIFO prefix-sum exact match.
          // If the payment equals the exact sum of the N oldest debts (in due-date order),
          // it is safe to auto-allocate — the resident paid exactly what was owed up to
          // a certain charge without month-hinting needed.
          let fifoSumMatchCharges: typeof openCharges | null = null;
          {
            let runningSum = 0;
            for (let i = 0; i < openCharges.length; i++) {
              runningSum = Number((runningSum + openCharges[i].remaining).toFixed(2));
              if (Math.abs(runningSum - paymentAmount) <= 0.01) {
                fifoSumMatchCharges = openCharges.slice(0, i + 1);
                break;
              }
              if (runningSum > paymentAmount + 0.01) {
                break; // exceeded — no prefix-sum match
              }
            }
          }

          if (fifoSumMatchCharges !== null) {
            const remainingOrdered = openCharges.filter((c) => !fifoSumMatchCharges!.includes(c));
            orderedCharges = [...fifoSumMatchCharges, ...remainingOrdered];
            autoMatchHintReason = "FIFO_SUM_MATCH";
          } else {
            const hintedSelection = pickPreferredOpenChargesFromDescription(openCharges, row.description, paymentAmount);
            const subsetSelection = hintedSelection
              ? null
              : pickUniqueSubsetSumCharges(openCharges, row.description, paymentAmount);

            if (hintedSelection) {
              const hintedChargeIds = new Set(hintedSelection.charges.map((charge) => charge.chargeId));
              const hintedOrdered = openCharges.filter((charge) => hintedChargeIds.has(charge.chargeId));
              const remainingOrdered = openCharges.filter((charge) => !hintedChargeIds.has(charge.chargeId));
              // Apply hinted candidates first but continue with remaining open debts for leftover amount.
              orderedCharges = [...hintedOrdered, ...remainingOrdered];
              autoMatchHintReason = hintedSelection.reason;
            } else if (subsetSelection) {
              const subsetChargeIds = new Set(subsetSelection.charges.map((charge) => charge.chargeId));
              const subsetOrdered = openCharges.filter((charge) => subsetChargeIds.has(charge.chargeId));
              const remainingOrdered = openCharges.filter((charge) => !subsetChargeIds.has(charge.chargeId));
              orderedCharges = [...subsetOrdered, ...remainingOrdered];
              autoMatchHintReason = subsetSelection.reason;
            }

          if (!fifoSumMatchCharges && !hintedSelection && !subsetSelection) {
            const method = row.paymentMethod ?? derivePaymentMethod(row.txType);
            let remainingToAllocate = paymentAmount;
            const provisionalItems: Array<{ chargeId: string; amount: number }> = [];
            const provisionalClosedChargeIds: string[] = [];

            // Manual-review rows are still pre-allocated to the detected apartment so they are visible in correction flows.
            for (const charge of openCharges) {
              if (remainingToAllocate <= 0.0001) {
                break;
              }

              const allocate = Math.min(remainingToAllocate, charge.remaining);
              if (allocate > 0.0001) {
                provisionalItems.push({ chargeId: charge.chargeId, amount: Number(allocate.toFixed(2)) });
                remainingToAllocate = Number((remainingToAllocate - allocate).toFixed(2));
                charge.remaining = Number((charge.remaining - allocate).toFixed(2));
                if (charge.remaining <= 0.0001 && !charge.closedInImport) {
                  charge.closedInImport = true;
                  provisionalClosedChargeIds.push(charge.chargeId);
                }
              }
            }

            const noteParts = [
              reference ? `BANK_REF:${reference}` : undefined,
              row.description ? `BANK_DESC:${row.description}` : undefined,
              detectedDoorNo ? `DOOR:${detectedDoorNo}` : undefined,
              `UNAPPLIED:MANUAL_REVIEW:NO_EXACT_MATCH:${openCharges.length}`,
              "MANUAL_REVIEW:PREALLOCATED_TO_APARTMENT",
            ].filter(Boolean) as string[];

            const lockedNote = withManualReconcileLock(noteParts.join(" | "), true);

            await prisma.$transaction(async (tx) => {
              const payment = await tx.payment.create({
                data: {
                  importBatchId: batch.id,
                  paidAt: row.occurredAt,
                  method,
                  note: lockedNote,
                  totalAmount: paymentAmount,
                  createdById: uploadedById,
                },
              });

              if (provisionalItems.length > 0) {
                await tx.paymentItem.createMany({
                  data: provisionalItems.map((item) => ({
                    paymentId: payment.id,
                    chargeId: item.chargeId,
                    amount: item.amount,
                  })),
                });
              }

              if (provisionalClosedChargeIds.length > 0) {
                await tx.charge.updateMany({
                  where: {
                    id: { in: provisionalClosedChargeIds },
                    status: "OPEN",
                  },
                  data: {
                    status: "CLOSED",
                    closedAt: new Date(),
                  },
                });
              }
            });

            paymentCreatedCount += 1;
            infos.push(
              `Satir ${rowNo}: Birden fazla acik borc bulundu ve exact eslesme yok, odeme daireye on dagitildi ve manuel incelemeye birakildi (${infoDoorNo}) ${infoContextTag}`
            );
            continue;
          }
          } // end else (no fifoSumMatch)
        }

        let remainingToAllocate = paymentAmount;
        const items: Array<{ chargeId: string; amount: number }> = [];
        const closedChargeIds: string[] = [];
        for (const charge of orderedCharges) {
          if (remainingToAllocate <= 0.0001) {
            break;
          }

          const allocate = Math.min(remainingToAllocate, charge.remaining);
          if (allocate > 0.0001) {
            items.push({ chargeId: charge.chargeId, amount: Number(allocate.toFixed(2)) });
            remainingToAllocate = Number((remainingToAllocate - allocate).toFixed(2));
            charge.remaining = Number((charge.remaining - allocate).toFixed(2));
            if (charge.remaining <= 0.0001 && !charge.closedInImport) {
              charge.closedInImport = true;
              closedChargeIds.push(charge.chargeId);
            }
          }
        }

        if (items.length === 0) {
          skippedCount += 1;
          errors.push(`Satir ${rowNo}: Tutar acik borca dagitilamadi`);
          continue;
        }

        const method = row.paymentMethod ?? derivePaymentMethod(row.txType);
        const noteParts = [
          reference ? `BANK_REF:${reference}` : undefined,
          row.description ? `BANK_DESC:${row.description}` : undefined,
          detectedDoorNo ? `DOOR:${detectedDoorNo}` : undefined,
          autoMatchHintReason ? `AUTO_MATCH:${autoMatchHintReason}` : undefined,
          remainingToAllocate > 0.01 ? `UNAPPLIED:OVERPAYMENT:${remainingToAllocate.toFixed(2)}` : undefined,
        ].filter(Boolean) as string[];

        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              importBatchId: batch.id,
              paidAt: row.occurredAt,
              method,
              note: noteParts.join(" | "),
              totalAmount: Number(row.amount.toFixed(2)),
              createdById: uploadedById,
            },
          });

          if (items.length > 0) {
            await tx.paymentItem.createMany({
              data: items.map((item) => ({
                paymentId: payment.id,
                chargeId: item.chargeId,
                amount: item.amount,
              })),
            });
          }

          if (closedChargeIds.length > 0) {
            await tx.charge.updateMany({
              where: {
                id: { in: closedChargeIds },
                status: "OPEN",
              },
              data: {
                status: "CLOSED",
                closedAt: new Date(),
              },
            });
          }
        });

        paymentCreatedCount += 1;
        if (remainingToAllocate > 0.01) {
          infos.push(
            `Satir ${rowNo}: Odeme acik borcu asti, ${remainingToAllocate.toFixed(2)} tutar dagitimsiz birakildi (${detectedDoorNo}) ${infoContextTag}`
          );
        }
        continue;
      }

      if (reference) {
        const expenseDedupKey = buildExpenseDedupKey({
          reference,
          occurredAt: row.occurredAt,
          amount: row.amount,
          description: row.description,
        });

        if (expenseDedupKeySet.has(expenseDedupKey)) {
          skippedCount += 1;
          errors.push(`Satir ${rowNo}: Ayni dosyada tekrar eden gider satiri (${reference})`);
          continue;
        }
        if (existingExpenseDedupKeySet.has(expenseDedupKey)) {
          skippedCount += 1;
          errors.push(`Satir ${rowNo}: Daha once islenmis ayni gider satiri (${reference})`);
          continue;
        }
        expenseDedupKeySet.add(expenseDedupKey);
      }

      const expenseAmount = Number(Math.abs(row.amount).toFixed(2));
      const selectedExpenseItemId = row.expenseItemId && allExpenseItemIdSet.has(row.expenseItemId)
        ? row.expenseItemId
        : undefined;
      const detectedExpenseItemId =
        selectedExpenseItemId ?? matchExpenseItemId(row.description, activeExpenseItems, activeExpenseRules) ?? undefined;
      const expenseItemIdToUse =
        detectedExpenseItemId && allExpenseItemIdSet.has(detectedExpenseItemId)
          ? detectedExpenseItemId
          : uncategorizedExpenseItemId;
      if (!expenseItemIdToUse) {
        skippedCount += 1;
        errors.push(`Satir ${rowNo}: Gider kalemi secilmedi veya bulunamadi`);
        continue;
      }
      if (!detectedExpenseItemId || !allExpenseItemIdSet.has(detectedExpenseItemId)) {
        infos.push(`Satir ${rowNo}: Gider kalemi otomatik olarak ${uncategorizedExpenseName} kalemine atandi`);
      }

      await prisma.expense.create({
        data: {
          importBatchId: batch.id,
          expenseItemId: expenseItemIdToUse,
          spentAt: row.occurredAt,
          amount: expenseAmount,
          paymentMethod: row.paymentMethod ?? PaymentMethod.BANK_TRANSFER,
          description: row.description,
          reference: reference || null,
          createdById: uploadedById,
        },
      });

      expenseCreatedCount += 1;
    } catch (err) {
      skippedCount += 1;
      errors.push(`Satir ${rowNo}: Beklenmeyen hata`);
      console.error(err);
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      createdPaymentCount: paymentCreatedCount,
      createdExpenseCount: expenseCreatedCount,
      skippedCount,
    },
  });

  return {
    batchId: batch.id,
    totalRows: rows.length,
    positiveCount,
    negativeCount,
    paymentCreatedCount,
    expenseCreatedCount,
    skippedCount,
    errors: errors.slice(0, 200),
    infos: infos.slice(0, 200),
  };
}

router.get("/banks", async (_req, res) => {
  const banks = await prisma.bankDefinition.findMany({
    include: {
      branches: {
        orderBy: [{ name: "asc" }],
      },
      _count: {
        select: {
          branches: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return res.json(
    banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      isActive: bank.isActive,
      branchCount: bank._count.branches,
      branches: bank.branches.map((branch) => ({
        id: branch.id,
        bankId: branch.bankId,
        bankName: bank.name,
        name: branch.name,
        branchCode: branch.branchCode,
        accountName: branch.accountName,
        accountNumber: branch.accountNumber,
        iban: branch.iban,
        phone: branch.phone,
        email: branch.email,
        address: branch.address,
        representativeName: branch.representativeName,
        representativePhone: branch.representativePhone,
        representativeEmail: branch.representativeEmail,
        notes: branch.notes,
        isActive: branch.isActive,
      })),
    }))
  );
});

function optionalBankText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    });
}

router.post("/banks", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const created = await prisma.bankDefinition.create({
      data: {
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Banka adi zaten var" });
    }

    throw err;
  }
});

router.put("/banks/:bankId", async (req, res) => {
  const { bankId } = req.params;
  const schema = z.object({
    name: z.string().min(2).max(120),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const updated = await prisma.bankDefinition.update({
      where: { id: bankId },
      data: {
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Banka bulunamadi" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Banka adi zaten var" });
      }
    }
    throw err;
  }
});

router.delete("/banks/:bankId", async (req, res) => {
  const { bankId } = req.params;
  const existing = await prisma.bankDefinition.findUnique({ where: { id: bankId } });
  if (!existing) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  const branchCount = await prisma.bankBranchDefinition.count({ where: { bankId } });
  if (branchCount > 0) {
    return res.status(409).json({ message: "Bankaya bagli subeler oldugu icin silinemez", branchCount });
  }

  await prisma.bankDefinition.delete({ where: { id: bankId } });
  return res.status(204).send();
});

router.post("/banks/branches", async (req, res) => {
  const schema = z.object({
    bankId: z.string().min(1),
    name: z.string().min(2).max(120),
    branchCode: optionalBankText(32),
    accountName: optionalBankText(160),
    accountNumber: optionalBankText(64),
    iban: optionalBankText(64),
    phone: optionalBankText(64),
    email: optionalBankText(255),
    address: optionalBankText(500),
    representativeName: optionalBankText(160),
    representativePhone: optionalBankText(64),
    representativeEmail: optionalBankText(255),
    notes: optionalBankText(1000),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  try {
    const created = await prisma.bankBranchDefinition.create({
      data: {
        bankId: parsed.data.bankId,
        name: parsed.data.name.trim(),
        branchCode: parsed.data.branchCode,
        accountName: parsed.data.accountName,
        accountNumber: parsed.data.accountNumber,
        iban: parsed.data.iban,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        representativeName: parsed.data.representativeName,
        representativePhone: parsed.data.representativePhone,
        representativeEmail: parsed.data.representativeEmail,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Bu bankada ayni sube adi zaten var" });
    }
    throw err;
  }
});

router.put("/banks/branches/:branchId", async (req, res) => {
  const { branchId } = req.params;
  const schema = z.object({
    bankId: z.string().min(1),
    name: z.string().min(2).max(120),
    branchCode: optionalBankText(32),
    accountName: optionalBankText(160),
    accountNumber: optionalBankText(64),
    iban: optionalBankText(64),
    phone: optionalBankText(64),
    email: optionalBankText(255),
    address: optionalBankText(500),
    representativeName: optionalBankText(160),
    representativePhone: optionalBankText(64),
    representativeEmail: optionalBankText(255),
    notes: optionalBankText(1000),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  try {
    const updated = await prisma.bankBranchDefinition.update({
      where: { id: branchId },
      data: {
        bankId: parsed.data.bankId,
        name: parsed.data.name.trim(),
        branchCode: parsed.data.branchCode,
        accountName: parsed.data.accountName,
        accountNumber: parsed.data.accountNumber,
        iban: parsed.data.iban,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        representativeName: parsed.data.representativeName,
        representativePhone: parsed.data.representativePhone,
        representativeEmail: parsed.data.representativeEmail,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Sube bulunamadi" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Bu bankada ayni sube adi zaten var" });
      }
    }
    throw err;
  }
});

router.delete("/banks/branches/:branchId", async (req, res) => {
  const { branchId } = req.params;
  const existing = await prisma.bankBranchDefinition.findUnique({ where: { id: branchId } });
  if (!existing) {
    return res.status(404).json({ message: "Sube bulunamadi" });
  }

  await prisma.bankBranchDefinition.delete({ where: { id: branchId } });
  return res.status(204).send();
});

function calculateTermDepositSummary(input: {
  principalAmount: number;
  annualInterestRate: number;
  withholdingTaxRate: number;
  startDate: Date;
  endDate: Date;
}): {
  dayCount: number;
  grossInterest: number;
  withholdingAmount: number;
  netInterest: number;
  netMaturityAmount: number;
} {
  const millisInDay = 1000 * 60 * 60 * 24;
  const dayDiff = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / millisInDay);
  const dayCount = Math.max(1, dayDiff);
  const grossInterest = input.principalAmount * (input.annualInterestRate / 100) * (dayCount / 365);
  const withholdingAmount = grossInterest * (input.withholdingTaxRate / 100);
  const netInterest = grossInterest - withholdingAmount;
  const netMaturityAmount = input.principalAmount + netInterest;

  return {
    dayCount,
    grossInterest: Number(grossInterest.toFixed(2)),
    withholdingAmount: Number(withholdingAmount.toFixed(2)),
    netInterest: Number(netInterest.toFixed(2)),
    netMaturityAmount: Number(netMaturityAmount.toFixed(2)),
  };
}

router.get("/banks/term-deposits", async (_req, res) => {
  const rows = await prisma.bankTermDeposit.findMany({
    include: {
      bank: {
        select: { id: true, name: true },
      },
      branch: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
  });

  const payload = rows.map((row) => {
    const principalAmount = Number(row.principalAmount);
    const annualInterestRate = Number(row.annualInterestRate);
    const withholdingTaxRate = Number(row.withholdingTaxRate);
    const summary = calculateTermDepositSummary({
      principalAmount,
      annualInterestRate,
      withholdingTaxRate,
      startDate: row.startDate,
      endDate: row.endDate,
    });

    return {
      id: row.id,
      bankId: row.bankId,
      bankName: row.bank.name,
      branchId: row.branchId,
      branchName: row.branch?.name ?? null,
      principalAmount,
      annualInterestRate,
      withholdingTaxRate,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      notes: row.notes,
      isActive: row.isActive,
      dayCount: summary.dayCount,
      grossInterest: summary.grossInterest,
      withholdingAmount: summary.withholdingAmount,
      netInterest: summary.netInterest,
      netMaturityAmount: summary.netMaturityAmount,
    };
  });

  return res.json(payload);
});

router.post("/banks/term-deposits", async (req, res) => {
  const schema = z.object({
    bankId: z.string().min(1),
    branchId: z
      .string()
      .optional()
      .transform((value) => {
        if (typeof value !== "string") {
          return undefined;
        }
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }),
    principalAmount: z.coerce.number().positive(),
    annualInterestRate: z.coerce.number().min(0).max(500),
    withholdingTaxRate: z.coerce.number().min(0).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    notes: optionalBankText(1000),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ message: "Bitis tarihi baslangic tarihinden once olamaz" });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  if (parsed.data.branchId) {
    const branch = await prisma.bankBranchDefinition.findUnique({
      where: { id: parsed.data.branchId },
      select: { id: true, bankId: true },
    });
    if (!branch || branch.bankId !== parsed.data.bankId) {
      return res.status(400).json({ message: "Secilen sube bankaya ait degil" });
    }
  }

  const created = await prisma.bankTermDeposit.create({
    data: {
      bankId: parsed.data.bankId,
      branchId: parsed.data.branchId,
      principalAmount: parsed.data.principalAmount,
      annualInterestRate: parsed.data.annualInterestRate,
      withholdingTaxRate: parsed.data.withholdingTaxRate,
      startDate,
      endDate,
      notes: parsed.data.notes,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return res.status(201).json(created);
});

router.put("/banks/term-deposits/:depositId", async (req, res) => {
  const { depositId } = req.params;
  const schema = z.object({
    bankId: z.string().min(1),
    branchId: z
      .string()
      .optional()
      .transform((value) => {
        if (typeof value !== "string") {
          return undefined;
        }
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }),
    principalAmount: z.coerce.number().positive(),
    annualInterestRate: z.coerce.number().min(0).max(500),
    withholdingTaxRate: z.coerce.number().min(0).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    notes: optionalBankText(1000),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ message: "Bitis tarihi baslangic tarihinden once olamaz" });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  if (parsed.data.branchId) {
    const branch = await prisma.bankBranchDefinition.findUnique({
      where: { id: parsed.data.branchId },
      select: { id: true, bankId: true },
    });
    if (!branch || branch.bankId !== parsed.data.bankId) {
      return res.status(400).json({ message: "Secilen sube bankaya ait degil" });
    }
  }

  try {
    const updated = await prisma.bankTermDeposit.update({
      where: { id: depositId },
      data: {
        bankId: parsed.data.bankId,
        branchId: parsed.data.branchId,
        principalAmount: parsed.data.principalAmount,
        annualInterestRate: parsed.data.annualInterestRate,
        withholdingTaxRate: parsed.data.withholdingTaxRate,
        startDate,
        endDate,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Vadeli mevduat kaydi bulunamadi" });
    }
    throw err;
  }
});

router.delete("/banks/term-deposits/:depositId", async (req, res) => {
  const { depositId } = req.params;
  try {
    await prisma.bankTermDeposit.delete({ where: { id: depositId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Vadeli mevduat kaydi bulunamadi" });
    }
    throw err;
  }
});

router.get("/initial-balances", async (_req, res) => {
  const openingPayments = await prisma.payment.findMany({
    where: {
      note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
      itemLinks: { none: {} },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      totalAmount: true,
      paidAt: true,
      note: true,
    },
  });

  const entries = openingPayments.map((payment) => {
    const parsed = parseOpeningBalanceNote(payment.note);
    return {
      id: payment.id,
      bankName: parsed.bankName,
      branchName: parsed.branchName,
      openingBalance: Number(payment.totalAmount),
      openingDate: payment.paidAt,
    };
  });

  const defaultOpeningDate = new Date();
  defaultOpeningDate.setHours(0, 0, 0, 0);

  return res.json({
    defaultOpeningDate,
    entries,
  });
});

router.post("/initial-balances/apply", async (req, res) => {
  const schema = z.object({
    entries: z
      .array(
        z.object({
          bankName: z.string().min(1),
          branchName: z.string().optional().nullable(),
          openingBalance: z.number().positive(),
          openingDate: z.string().datetime(),
        })
      )
      .max(200),
    replaceExisting: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const normalizedEntries = parsed.data.entries
    .map((entry) => ({
      bankName: entry.bankName.trim(),
      branchName: entry.branchName?.trim() ? entry.branchName.trim() : null,
      openingBalance: Number(entry.openingBalance.toFixed(2)),
      openingDate: new Date(entry.openingDate),
    }))
    .filter((entry) => entry.bankName.length > 0 && entry.openingBalance > 0);

  if (normalizedEntries.length === 0) {
    return res.status(400).json({ message: "En az bir banka acilis satiri girin" });
  }

  const effectiveReplaceExisting = parsed.data.replaceExisting ?? true;

  const result = await prisma.$transaction(async (tx) => {
    let deletedOpeningPayments = 0;
    if (effectiveReplaceExisting) {
      const deleted = await tx.payment.deleteMany({
        where: {
          note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
          itemLinks: { none: {} },
        },
      });
      deletedOpeningPayments = deleted.count;
    }

    let createdOpeningPayments = 0;
    for (const entry of normalizedEntries) {
      await tx.payment.create({
        data: {
          paidAt: entry.openingDate,
          totalAmount: entry.openingBalance,
          method: PaymentMethod.BANK_TRANSFER,
          note: buildOpeningBalanceNote(entry.bankName, entry.branchName),
          createdById: req.user?.userId,
        },
      });
      createdOpeningPayments += 1;
    }

    return {
      deletedOpeningPayments,
      createdOpeningPayments,
    };
  });

  return res.json({
    appliedEntryCount: normalizedEntries.length,
    ...result,
    totalOpeningBalance: Number(
      normalizedEntries.reduce((sum, entry) => sum + entry.openingBalance, 0).toFixed(2)
    ),
  });
});

router.post("/charges", async (req, res) => {
  const schema = z.object({
    apartmentId: z.string().min(1),
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12).optional(),
    amount: z.number().min(0).optional(),
    dueDate: z.string().datetime().optional(),
    description: z.string().optional(),
    entries: z
      .array(
        z.object({
          periodMonth: z.number().int().min(1).max(12),
          amount: z.number().min(0),
          dueDate: z.string().datetime(),
          description: z.string().optional(),
        })
      )
      .min(1)
      .max(24)
      .optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const [chargeType, apartment] = await Promise.all([
    prisma.chargeTypeDefinition.findUnique({
      where: { id: parsed.data.chargeTypeId },
      select: { id: true, code: true, name: true },
    }),
    prisma.apartment.findUnique({
      where: { id: parsed.data.apartmentId },
      select: { id: true, doorNo: true, ownerFullName: true, hasAidat: true, hasDogalgaz: true },
    }),
  ]);

  if (!chargeType) {
    return res.status(404).json({ message: "Tahakkuk tipi bulunamadi" });
  }

  if (!apartment) {
    return res.status(404).json({ message: "Daire bulunamadi" });
  }

  const restrictedChargeType = getRestrictedChargeTypeCode(chargeType.code);
  if (restrictedChargeType && isApartmentExemptForChargeType(apartment, restrictedChargeType)) {
    const fullName = apartment.ownerFullName?.trim() || "Adsiz";
    const apartmentLabel = `${apartment.doorNo}-${fullName}`;
    return res.status(409).json({
      message: `${apartmentLabel} dairesi ${restrictedChargeType} icin muaf oldugu icin tahakkuk olusturulamadi`,
      warningCode: "APARTMENT_EXEMPT_FOR_CHARGE_TYPE",
      blockedCount: 1,
      blockedApartments: [apartmentLabel],
    });
  }

  if (parsed.data.entries && parsed.data.entries.length > 0) {
    const created = await prisma.$transaction(
      parsed.data.entries.map((entry) =>
        prisma.charge.create({
          data: {
            apartmentId: parsed.data.apartmentId,
            chargeTypeId: parsed.data.chargeTypeId,
            periodYear: parsed.data.periodYear,
            periodMonth: entry.periodMonth,
            amount: entry.amount,
            dueDate: new Date(entry.dueDate),
            description: entry.description,
            createdByUserId: req.user?.userId,
          },
          select: { id: true },
        })
      )
    );

    return res.status(201).json({
      createdCount: created.length,
      createdIds: created.map((x) => x.id),
      firstId: created[0]?.id ?? null,
    });
  }

  if (
    parsed.data.periodMonth === undefined ||
    parsed.data.amount === undefined ||
    parsed.data.dueDate === undefined
  ) {
    return res.status(400).json({
      message: "Provide entries[] or periodMonth+amount+dueDate",
    });
  }

  const charge = await prisma.charge.create({
    data: {
      apartmentId: parsed.data.apartmentId,
      chargeTypeId: parsed.data.chargeTypeId,
      periodYear: parsed.data.periodYear,
      periodMonth: parsed.data.periodMonth,
      amount: parsed.data.amount,
      dueDate: new Date(parsed.data.dueDate),
      description: parsed.data.description,
      createdByUserId: req.user?.userId,
    },
  });

  return res.status(201).json(charge);
});

router.post("/charges/bulk", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12).optional(),
    periodMonths: z.array(z.number().int().min(1).max(12)).min(1).max(12).optional(),
    dueDate: z.string().datetime().optional(),
    dueDateByMonth: z.record(z.string().datetime()).optional(),
    description: z.string().optional(),
    apartmentType: z.nativeEnum(ApartmentType).optional(),
    apartmentClassId: z.string().min(1).optional(),
    apartmentDutyId: z.string().min(1).optional(),
    occupancyType: z.nativeEnum(OccupancyType).optional(),
    apartmentIds: z.array(z.string().min(1)).max(500).optional(),
    amount: z.number().positive().optional(),
    amountByType: z
      .object({
        KUCUK: z.number().positive(),
        BUYUK: z.number().positive(),
      })
      .optional(),
    skipIfExists: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const {
    periodYear,
    periodMonth,
    periodMonths,
    chargeTypeId,
    dueDate,
    dueDateByMonth,
    description,
    apartmentType,
    apartmentClassId,
    apartmentDutyId,
    occupancyType,
    apartmentIds,
    amount,
    amountByType,
    skipIfExists,
  } = parsed.data;

  const chargeType = await prisma.chargeTypeDefinition.findUnique({
    where: { id: chargeTypeId },
    select: { id: true, code: true, name: true },
  });
  if (!chargeType) {
    return res.status(404).json({ message: "Tahakkuk tipi bulunamadi" });
  }

  const restrictedChargeType = getRestrictedChargeTypeCode(chargeType.code);

  if (!amount && !amountByType) {
    return res.status(400).json({ message: "Provide amount or amountByType" });
  }

  const monthsRaw = periodMonths ?? (periodMonth ? [periodMonth] : []);
  const months = [...new Set(monthsRaw)].sort((a, b) => a - b);
  if (months.length === 0) {
    return res.status(400).json({ message: "Provide periodMonth or periodMonths" });
  }

  const dueDateMap = new Map<number, Date>();
  for (const month of months) {
    const monthKey = String(month);
    const perMonthDateRaw = dueDateByMonth?.[monthKey];
    if (perMonthDateRaw) {
      dueDateMap.set(month, new Date(perMonthDateRaw));
      continue;
    }

    if (dueDate) {
      dueDateMap.set(month, new Date(dueDate));
      continue;
    }

    return res.status(400).json({ message: `Missing due date for month ${month}` });
  }

  const apartmentWhere: Prisma.ApartmentWhereInput = {
    ...(apartmentType ? { type: apartmentType } : {}),
    ...(apartmentClassId ? { apartmentClassId } : {}),
    ...(apartmentDutyId ? { apartmentDutyId } : {}),
    ...(occupancyType ? { occupancyType } : {}),
    ...(apartmentIds?.length ? { id: { in: apartmentIds } } : {}),
  };

  const apartments = await prisma.apartment.findMany({
    where: apartmentWhere,
    select: {
      id: true,
      type: true,
      doorNo: true,
      ownerFullName: true,
      hasAidat: true,
      hasDogalgaz: true,
    },
  });

  if (apartments.length === 0) {
    return res.status(400).json({ message: "No apartments found for selected filter" });
  }

  if (restrictedChargeType) {
    const blockedApartments = apartments
      .filter((apartment) => isApartmentExemptForChargeType(apartment, restrictedChargeType))
      .map((apartment) => `${apartment.doorNo}-${apartment.ownerFullName?.trim() || "Adsiz"}`);

    if (blockedApartments.length > 0) {
      const preview = blockedApartments.slice(0, 5).join(", ");
      return res.status(409).json({
        message: `${restrictedChargeType} muaf daire secildigi icin toplu tahakkuk olusturulamadi. Ornek: ${preview}`,
        warningCode: "APARTMENT_EXEMPT_FOR_CHARGE_TYPE",
        blockedCount: blockedApartments.length,
        blockedApartments: blockedApartments.slice(0, 50),
      });
    }
  }

  const existing = await prisma.charge.findMany({
    where: {
      apartmentId: { in: apartments.map((a) => a.id) },
      periodYear,
      periodMonth: { in: months },
      chargeTypeId,
    },
    select: { apartmentId: true, periodMonth: true },
  });

  const existingKeys = new Set(existing.map((x) => `${x.apartmentId}|${x.periodMonth}`));
  const effectiveSkipIfExists = skipIfExists ?? true;

  const records = apartments.flatMap((apt) =>
    months
      .filter((month) => !effectiveSkipIfExists || !existingKeys.has(`${apt.id}|${month}`))
      .map((month) => ({
        apartmentId: apt.id,
        chargeTypeId,
        periodYear,
        periodMonth: month,
        amount: amount ?? (apt.type === "KUCUK" ? amountByType?.KUCUK : amountByType?.BUYUK) ?? 0,
        dueDate: dueDateMap.get(month) as Date,
        description,
        createdByUserId: req.user?.userId,
      }))
  );

  if (records.length === 0) {
    const totalTargetCount = apartments.length * months.length;
    return res.json({
      createdCount: 0,
      skippedCount: totalTargetCount,
      totalTargetCount,
      months,
      message: "All target apartments already have this charge",
    });
  }

  const result = await prisma.charge.createMany({
    data: records,
  });

  const totalTargetCount = apartments.length * months.length;

  return res.status(201).json({
    createdCount: result.count,
    skippedCount: totalTargetCount - result.count,
    totalTargetCount,
    months,
  });
});

router.post("/charges/distributed", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    dueDate: z.string().datetime(),
    invoiceDate: z.string().datetime().optional(),
    periodStartDate: z.string().datetime().optional(),
    periodEndDate: z.string().datetime().optional(),
    invoiceFileName: z.string().min(1).optional(),
    invoiceAmount: z.number().positive().optional(),
    description: z.string().optional(),
    skipIfExists: z.boolean().optional(),
    rows: z
      .array(
        z.object({
          apartmentId: z.string().min(1),
          amount: z.number().positive(),
        })
      )
      .min(1)
      .max(1000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const {
    chargeTypeId,
    periodYear,
    periodMonth,
    dueDate,
    invoiceDate,
    periodStartDate,
    periodEndDate,
    invoiceFileName,
    invoiceAmount,
    description,
    skipIfExists,
    rows,
  } = parsed.data;

  const chargeType = await prisma.chargeTypeDefinition.findUnique({
    where: { id: chargeTypeId },
    select: { id: true, code: true, name: true },
  });
  if (!chargeType) {
    return res.status(404).json({ message: "Tahakkuk tipi bulunamadi" });
  }

  const restrictedChargeType = getRestrictedChargeTypeCode(chargeType.code);

  const uniqueRows = Array.from(
    new Map(rows.map((row) => [row.apartmentId, row])).values()
  );

  const apartmentIds = uniqueRows.map((row) => row.apartmentId);
  const existingApartments = await prisma.apartment.findMany({
    where: { id: { in: apartmentIds } },
    select: {
      id: true,
      doorNo: true,
      ownerFullName: true,
      hasAidat: true,
      hasDogalgaz: true,
    },
  });
  const existingApartmentIds = new Set(existingApartments.map((apt) => apt.id));
  const missingApartmentIds = apartmentIds.filter((id) => !existingApartmentIds.has(id));
  if (missingApartmentIds.length > 0) {
    return res.status(400).json({ message: `Missing apartments: ${missingApartmentIds.join(", ")}` });
  }

  if (restrictedChargeType) {
    const blockedApartments = existingApartments
      .filter((apartment) => isApartmentExemptForChargeType(apartment, restrictedChargeType))
      .map((apartment) => `${apartment.doorNo}-${apartment.ownerFullName?.trim() || "Adsiz"}`);

    if (blockedApartments.length > 0) {
      const preview = blockedApartments.slice(0, 5).join(", ");
      return res.status(409).json({
        message: `${restrictedChargeType} muaf daire secildigi icin dagitim tahakkuku olusturulamadi. Ornek: ${preview}`,
        warningCode: "APARTMENT_EXEMPT_FOR_CHARGE_TYPE",
        blockedCount: blockedApartments.length,
        blockedApartments: blockedApartments.slice(0, 50),
      });
    }
  }

  const existingCharges = await prisma.charge.findMany({
    where: {
      apartmentId: { in: apartmentIds },
      chargeTypeId,
      periodYear,
      periodMonth,
    },
    select: { apartmentId: true },
  });
  const existingChargeApartmentIds = new Set(existingCharges.map((row) => row.apartmentId));
  const effectiveSkipIfExists = skipIfExists ?? true;

  const invoiceDateDisplay = (() => {
    if (!invoiceDate) {
      return null;
    }

    const dateOnly = String(invoiceDate).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!dateOnly) {
      return String(invoiceDate).trim() || null;
    }

    const [year, month, day] = dateOnly.split("-");
    return `${day}.${month}.${year}`;
  })();

  const isDogalgazCharge =
    toAsciiLower(chargeType.code) === "dogalgaz" || toAsciiLower(chargeType.name).includes("dogalgaz");

  let finalDescription: string | undefined;
  if (isDogalgazCharge) {
    const dogalgazParts = [
      "Dogalgaz",
      invoiceDate ? `Fatura tarihi: ${invoiceDate}` : "",
      periodStartDate ? `Baslangic: ${periodStartDate}` : "",
      periodEndDate ? `Bitis: ${periodEndDate}` : "",
      invoiceFileName ? `Fatura: ${invoiceFileName}` : "",
      invoiceAmount ? `Fatura tutari: ${invoiceAmount.toFixed(2)}` : "",
      `Vade: ${dueDate}`,
    ].filter(Boolean);
    finalDescription = dogalgazParts.join(" | ");
  } else {
    const metaParts = [
      description?.trim() || "",
      invoiceAmount ? `Fatura tutari: ${invoiceAmount.toFixed(2)}` : "",
      invoiceDate ? `Fatura tarihi: ${invoiceDate}` : "",
      periodStartDate ? `Baslangic: ${periodStartDate}` : "",
      periodEndDate ? `Bitis: ${periodEndDate}` : "",
      invoiceFileName ? `Fatura: ${invoiceFileName}` : "",
    ].filter(Boolean);
    finalDescription = metaParts.length > 0 ? metaParts.join(" | ") : undefined;
  }

  const createRows = uniqueRows
    .filter((row) => !effectiveSkipIfExists || !existingChargeApartmentIds.has(row.apartmentId))
    .map((row) => ({
      apartmentId: row.apartmentId,
      chargeTypeId,
      periodYear,
      periodMonth,
      amount: row.amount,
      dueDate: new Date(dueDate),
      description: finalDescription,
      createdByUserId: req.user?.userId,
    }));

  if (createRows.length === 0) {
    return res.json({
      createdCount: 0,
      skippedCount: uniqueRows.length,
      totalTargetCount: uniqueRows.length,
      message: "All target apartments already have this charge",
    });
  }

  const result = await prisma.charge.createMany({
    data: createRows,
  });

  return res.status(201).json({
    createdCount: result.count,
    skippedCount: uniqueRows.length - result.count,
    totalTargetCount: uniqueRows.length,
  });
});

router.post("/charges/distributed/invoices/list", async (req, res) => {
  const schema = z.object({
    periodYear: z.number().int().min(2000).max(2100).optional(),
    periodMonths: z.array(z.number().int().min(1).max(12)).max(12).optional(),
    chargeTypeId: z.string().min(1).optional(),
    accrualDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    accrualDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });

  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const { periodYear, periodMonths, chargeTypeId, accrualDateFrom, accrualDateTo } = parsed.data;
  const months = periodMonths && periodMonths.length > 0 ? [...new Set(periodMonths)] : undefined;

  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    accrualDateFrom || accrualDateTo
      ? {
          gte: accrualDateFrom ? new Date(`${accrualDateFrom}T00:00:00.000Z`) : undefined,
          lte: accrualDateTo ? new Date(`${accrualDateTo}T23:59:59.999Z`) : undefined,
        }
      : undefined;

  const charges = await prisma.charge.findMany({
    where: {
      chargeTypeId,
      periodYear,
      periodMonth: months ? { in: months } : undefined,
      createdAt: createdAtFilter,
    },
    select: {
      id: true,
      chargeTypeId: true,
      periodYear: true,
      periodMonth: true,
      dueDate: true,
      description: true,
      amount: true,
      createdAt: true,
      _count: {
        select: {
          paymentItems: true,
        },
      },
      chargeType: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const grouped = new Map<
    string,
    {
      chargeTypeId: string;
      chargeTypeName: string;
      chargeTypeCode: string;
      periodYear: number;
      periodMonth: number;
      dueDate: string;
      description: string | null;
      invoiceFileName: string;
      createdAt: string;
      chargeCount: number;
      totalAmount: number;
      linkedPaymentCount: number;
    }
  >();

  for (const charge of charges) {
    const invoiceFileName = extractChargeInvoiceFileName(charge.description);
    const normalizedDescription = charge.description ?? null;
    const resolvedInvoiceName = invoiceFileName ?? "(Fatura dosyasi yok)";

    const groupKey = [
      charge.chargeTypeId,
      charge.periodYear,
      charge.periodMonth,
      normalizedDescription ?? "(NULL)"
    ].join("|");
    const amount = Number(charge.amount);
    const linkedPaymentCount = charge._count.paymentItems;

    const existing = grouped.get(groupKey);
    if (!existing) {
      grouped.set(groupKey, {
        chargeTypeId: charge.chargeTypeId,
        chargeTypeName: charge.chargeType.name,
        chargeTypeCode: charge.chargeType.code,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        dueDate: charge.dueDate.toISOString(),
        description: normalizedDescription,
        invoiceFileName: resolvedInvoiceName,
        createdAt: charge.createdAt.toISOString(),
        chargeCount: 1,
        totalAmount: amount,
        linkedPaymentCount,
      });
      continue;
    }

    existing.chargeCount += 1;
    existing.totalAmount += amount;
    existing.linkedPaymentCount += linkedPaymentCount;
    if (charge.createdAt.getTime() < new Date(existing.createdAt).getTime()) {
      existing.createdAt = charge.createdAt.toISOString();
    }
  }

  const rows = [...grouped.values()]
    .map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount.toFixed(2)),
      canDelete: row.linkedPaymentCount === 0,
    }))
    .sort((a, b) => {
      if (a.periodYear !== b.periodYear) {
        return b.periodYear - a.periodYear;
      }
      if (a.periodMonth !== b.periodMonth) {
        return b.periodMonth - a.periodMonth;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return res.json({ rows, totalCount: rows.length });
});

router.post("/charges/distributed/invoices/details", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    description: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const { chargeTypeId, periodYear, periodMonth, description } = parsed.data;

  const charges = await prisma.charge.findMany({
    where: {
      chargeTypeId,
      periodYear,
      periodMonth,
      description: description ?? null,
    },
    select: {
      id: true,
      apartmentId: true,
      periodYear: true,
      periodMonth: true,
      amount: true,
      dueDate: true,
      description: true,
      apartment: {
        select: {
          block: { select: { name: true } },
          doorNo: true,
          type: true,
          ownerFullName: true,
        },
      },
      chargeType: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          paymentItems: true,
        },
      },
    },
    orderBy: [{ apartment: { block: { name: "asc" } } }, { apartment: { doorNo: "asc" } }],
  });

  return res.json({
    rows: charges.map((charge) => ({
      id: charge.id,
      apartmentId: charge.apartmentId,
      blockName: charge.apartment.block.name,
      doorNo: charge.apartment.doorNo,
      apartmentType: charge.apartment.type,
      ownerFullName: charge.apartment.ownerFullName,
      chargeTypeId: charge.chargeType.id,
      chargeTypeCode: charge.chargeType.code,
      chargeTypeName: charge.chargeType.name,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      amount: Number(charge.amount),
      dueDate: charge.dueDate.toISOString(),
      description: charge.description,
      linkedPaymentCount: charge._count.paymentItems,
    })),
    totalCount: charges.length,
  });
});

router.post("/charges/distributed/invoices/delete", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    description: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const { chargeTypeId, periodYear, periodMonth, description } = parsed.data;

  const targetCharges = await prisma.charge.findMany({
    where: {
      chargeTypeId,
      periodYear,
      periodMonth,
      description: description ?? null,
    },
    select: {
      id: true,
    },
  });

  if (targetCharges.length === 0) {
    return res.status(404).json({ message: "Silinecek toplu dagitim bulunamadi" });
  }

  const targetChargeIds = targetCharges.map((x) => x.id);
  const linkedPaymentCount = await prisma.paymentItem.count({
    where: {
      chargeId: { in: targetChargeIds },
    },
  });

  if (linkedPaymentCount > 0) {
    return res.status(409).json({
      message: "Bu faturaya bagli tahsilat kayitlari oldugu icin toplu silme yapilamadi",
      linkedPaymentCount,
    });
  }

  const deleted = await prisma.charge.deleteMany({
    where: {
      id: { in: targetChargeIds },
    },
  });

  return res.json({ deletedCount: deleted.count });
});

router.post("/charges/distributed/invoices/update", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    matchDescription: z.string().nullable().optional(),
    dueDate: z.string().datetime().optional(),
    description: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const { chargeTypeId, periodYear, periodMonth, matchDescription, dueDate, description } = parsed.data;

  if (!dueDate && description === undefined) {
    return res.status(400).json({ message: "Duzeltme icin en az bir alan gonderin" });
  }

  const targetCharges = await prisma.charge.findMany({
    where: {
      chargeTypeId,
      periodYear,
      periodMonth,
      description: matchDescription ?? null,
    },
    select: {
      id: true,
    },
  });

  if (targetCharges.length === 0) {
    return res.status(404).json({ message: "Duzeltilecek toplu dagitim bulunamadi" });
  }

  const updateData: { dueDate?: Date; description?: string | null } = {};
  if (dueDate) {
    updateData.dueDate = new Date(dueDate);
  }
  if (description !== undefined) {
    const trimmed = description?.trim() ?? "";
    updateData.description = trimmed.length > 0 ? trimmed : null;
  }

  const updated = await prisma.charge.updateMany({
    where: {
      id: { in: targetCharges.map((x) => x.id) },
    },
    data: updateData,
  });

  return res.json({ updatedCount: updated.count });
});

router.post("/charges/bulk-correct", async (req, res) => {
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12).optional(),
    periodMonths: z.array(z.number().int().min(1).max(12)).min(1).max(12).optional(),
    apartmentType: z.nativeEnum(ApartmentType).optional(),
    apartmentIds: z.array(z.string().min(1)).max(500).optional(),
    amount: z.number().positive().optional(),
    amountByType: z
      .object({
        KUCUK: z.number().positive(),
        BUYUK: z.number().positive(),
      })
      .optional(),
    dueDate: z.string().datetime().optional(),
    dueDateByMonth: z.record(z.string().datetime()).optional(),
    description: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const {
    chargeTypeId,
    periodYear,
    periodMonth,
    periodMonths,
    apartmentType,
    apartmentIds,
    amount,
    amountByType,
    dueDate,
    dueDateByMonth,
    description,
  } = parsed.data;

  if (!amount && !amountByType && !dueDate && !dueDateByMonth && description === undefined) {
    return res.status(400).json({ message: "At least one correction value is required" });
  }

  const monthsRaw = periodMonths ?? (periodMonth ? [periodMonth] : []);
  const months = [...new Set(monthsRaw)].sort((a, b) => a - b);
  if (months.length === 0) {
    return res.status(400).json({ message: "Provide periodMonth or periodMonths" });
  }

  const dueDateMap = new Map<number, Date>();
  if (dueDate || dueDateByMonth) {
    for (const month of months) {
      const monthKey = String(month);
      const perMonthDateRaw = dueDateByMonth?.[monthKey];
      if (perMonthDateRaw) {
        dueDateMap.set(month, new Date(perMonthDateRaw));
        continue;
      }

      if (dueDate) {
        dueDateMap.set(month, new Date(dueDate));
      }
    }
  }

  const normalizedApartmentIds: string[] = apartmentIds && apartmentIds.length > 0 ? [...new Set(apartmentIds)] : [];

  const charges = await prisma.charge.findMany({
    where: {
      chargeTypeId,
      periodYear,
      periodMonth: { in: months },
      apartmentId: normalizedApartmentIds.length > 0 ? { in: normalizedApartmentIds } : undefined,
      apartment: apartmentType ? { type: apartmentType } : undefined,
    },
    include: {
      apartment: {
        select: { type: true },
      },
    },
  });

  if (charges.length === 0) {
    return res.json({ updatedCount: 0, matchedCount: 0, months });
  }

  const updates = charges.map((charge) => {
    const data: { amount?: number; dueDate?: Date; description?: string | null } = {};

    if (typeof amount === "number") {
      data.amount = amount;
    } else if (amountByType) {
      data.amount = charge.apartment.type === "KUCUK" ? amountByType.KUCUK : amountByType.BUYUK;
    }

    const byMonthDate = dueDateMap.get(charge.periodMonth);
    if (byMonthDate) {
      data.dueDate = byMonthDate;
    }

    if (description !== undefined) {
      const trimmed = description.trim();
      data.description = trimmed.length > 0 ? trimmed : null;
    }

    return prisma.charge.update({
      where: { id: charge.id },
      data,
    });
  });

  await prisma.$transaction(updates);

  return res.json({
    updatedCount: updates.length,
    matchedCount: charges.length,
    months,
  });
});

router.post("/payments", async (req, res) => {
  const schema = z.object({
    paidAt: z.string().datetime(),
    method: z.nativeEnum(PaymentMethod).optional(),
    reference: z.string().optional(),
    note: z.string().optional(),
    items: z.array(
      z.object({
        chargeId: z.string().min(1),
        amount: z.number().positive(),
      })
    ).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.amount, 0);
  const method = parsed.data.method ?? PaymentMethod.BANK_TRANSFER;
  const normalizedNote = buildPaymentNote(null, parsed.data.note, parsed.data.reference);
  const chargeIds = [...new Set(parsed.data.items.map((item) => item.chargeId))];

  const existingCharges = await prisma.charge.findMany({
    where: { id: { in: chargeIds } },
    select: { id: true },
  });
  const existingChargeIdSet = new Set(existingCharges.map((row) => row.id));
  const missingChargeIds = chargeIds.filter((id) => !existingChargeIdSet.has(id));
  if (missingChargeIds.length > 0) {
    return res.status(400).json({
      message: `Charge ID bulunamadi: ${missingChargeIds.join(", ")}`,
    });
  }

  await ensurePaymentMethodDefinitions();
  const methodDefinition = await prisma.paymentMethodDefinition.findUnique({ where: { code: method } });
  if (!methodDefinition || !methodDefinition.isActive) {
    return res.status(400).json({ message: "Selected payment method is not active" });
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          paidAt: new Date(parsed.data.paidAt),
          method,
          note: normalizedNote,
          totalAmount,
          createdById: req.user?.userId,
        },
      });

      for (const item of parsed.data.items) {
        await tx.paymentItem.create({
          data: {
            paymentId: createdPayment.id,
            chargeId: item.chargeId,
            amount: item.amount,
          },
        });
      }

      return createdPayment;
    });

    await refreshChargeStatusesForIds(chargeIds);

    return res.status(201).json(payment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({ message: "Gecersiz Charge ID veya bagli tahakkuk iliskisi" });
    }
    throw error;
  }
});

router.post("/payments/carry-forward", async (req, res) => {
  const schema = z.object({
    apartmentId: z.string().min(1),
    paidAt: z.string().datetime(),
    amount: z.number().positive(),
    reference: z.string().optional(),
    note: z.string().optional(),
    autoReconcile: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const apartment = await prisma.apartment.findUnique({
    where: { id: parsed.data.apartmentId },
    select: { id: true, doorNo: true },
  });
  if (!apartment) {
    return res.status(404).json({ message: "Daire bulunamadi" });
  }

  const normalizedAmount = Number(parsed.data.amount.toFixed(2));
  const normalizedDoorNo = apartment.doorNo.trim();
  if (!normalizedDoorNo) {
    return res.status(400).json({ message: "Daire kapi numarasi eksik" });
  }

  const noteParts = [
    CARRY_FORWARD_PAYMENT_NOTE_TAG,
    `DOOR:${normalizedDoorNo}`,
    "UNAPPLIED:CARRY_FORWARD",
    parsed.data.reference?.trim() ? `REF:${parsed.data.reference.trim()}` : undefined,
    parsed.data.note?.trim() || undefined,
  ].filter(Boolean) as string[];

  const created = await prisma.payment.create({
    data: {
      paidAt: new Date(parsed.data.paidAt),
      method: PaymentMethod.CASH,
      totalAmount: normalizedAmount,
      note: noteParts.join(" | "),
      createdById: req.user?.userId,
    },
    select: { id: true },
  });

  const autoReconcile = parsed.data.autoReconcile ?? true;
  const reconcileResult = autoReconcile ? await reconcileApartmentPaymentLinks(apartment.id) : null;

  return res.status(201).json({
    id: created.id,
    apartmentId: apartment.id,
    doorNo: apartment.doorNo,
    amount: normalizedAmount,
    autoReconcileApplied: Boolean(reconcileResult),
    reconcileResult,
  });
});

router.get("/payments/list", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    source: z.enum(["MANUAL", "BANK_STATEMENT_UPLOAD", "PAYMENT_UPLOAD", "GMAIL"]).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { from, to, source } = parsed.data;

  const payments = await prisma.payment.findMany({
    where: {
      paidAt:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: {
      importBatch: {
        select: { kind: true, fileName: true },
      },
      itemLinks: {
        include: {
          charge: {
            include: {
              apartment: {
                include: {
                  block: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  const creatorIds = [...new Set(payments.map((p) => p.createdById).filter(Boolean))] as string[];
  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const creatorMap = new Map(creators.map((x) => [x.id, x]));

  function detectSource(payment: (typeof payments)[number]): "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD" | "GMAIL" {
    if (payment.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD) {
      if ((payment.importBatch.fileName ?? "").toLowerCase().startsWith("gmail:")) {
        return "GMAIL";
      }
      return "BANK_STATEMENT_UPLOAD";
    }
    if (payment.importBatch?.kind === ImportBatchType.PAYMENT_UPLOAD) {
      return "PAYMENT_UPLOAD";
    }

    const value = (payment.note ?? "").toUpperCase();
    if (value.includes("BANK_REF:")) {
      return "BANK_STATEMENT_UPLOAD";
    }
    if (value.includes("PAYMENT_UPLOAD:")) {
      return "PAYMENT_UPLOAD";
    }
    return "MANUAL";
  }

  function parsePaymentNote(note: string | null): { reference: string | null; description: string | null } {
    if (!note) {
      return { reference: null, description: null };
    }

    const parts = note
      .split(" | ")
      .map((x) => x.trim())
      .filter(Boolean);

    let reference: string | null = null;
    let bankDescription: string | null = null;
    const descriptionParts: string[] = [];

    for (const part of parts) {
      if (part.startsWith("BANK_REF:")) {
        reference = part.slice("BANK_REF:".length).trim() || null;
        continue;
      }
      if (part.startsWith("REF:")) {
        reference = reference ?? (part.slice("REF:".length).trim() || null);
        continue;
      }
      if (part.startsWith("BANK_DESC:")) {
        bankDescription = part.slice("BANK_DESC:".length).trim() || null;
        continue;
      }
      if (part.startsWith("PAYMENT_UPLOAD:")) {
        continue;
      }
      if (part.startsWith("DOOR:")) {
        continue;
      }
      if (part.startsWith("UNAPPLIED:")) {
        continue;
      }
      if (part.startsWith("CARRY_FORWARD:")) {
        continue;
      }

      descriptionParts.push(part);
    }

    const isCarryForward = parts.some((part) => part.startsWith("CARRY_FORWARD:"));

    return {
      reference,
      description:
        bankDescription ??
        (descriptionParts.length > 0 ? descriptionParts.join(" | ") : isCarryForward ? "Devir alacak girisi" : null),
    };
  }

    const rows = payments.map((payment) => {
      const apartmentDoorNos = [...new Set(payment.itemLinks.map((item) => item.charge.apartment.doorNo))];
      const apartmentIds = [...new Set(payment.itemLinks.map((item) => item.charge.apartment.id))];

      const creator = payment.createdById ? creatorMap.get(payment.createdById) : undefined;
      const detectedSource = detectSource(payment);
      const noteParts = parsePaymentNote(payment.note);

      return {
        id: payment.id,
        paidAt: payment.paidAt,
        totalAmount: Number(payment.totalAmount),
        method: payment.method,
        note: payment.note,
        reference: noteParts.reference,
        description: noteParts.description,
        createdAt: payment.createdAt,
        source: detectedSource,
        createdByUserId: payment.createdById,
        createdByName: creator?.fullName ?? (detectedSource === "GMAIL" ? "Railway" : null),
        createdByEmail: creator?.email ?? (detectedSource === "GMAIL" ? "system@railway" : null),
        apartments: apartmentDoorNos,
        apartmentId: apartmentIds.length === 1 ? apartmentIds[0] : null,
      };
    });

  if (!source) {
    return res.json(rows);
  }

  return res.json(rows.filter((x) => x.source === source));
});

router.get("/reports/manual-review-matches", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    doorNo: z.string().min(1).max(50).optional(),
    limit: z.coerce.number().int().min(1).max(2000).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { from, to, doorNo, limit } = parsed.data;
  const normalizedDoorNoFilter = doorNo?.trim() || "";

  const payments = await prisma.payment.findMany({
    where: {
      note: {
        contains: "UNAPPLIED:MANUAL_REVIEW",
      },
      paidAt:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: {
      importBatch: {
        select: { id: true, kind: true, fileName: true, uploadedAt: true },
      },
      itemLinks: {
        include: {
          charge: {
            select: {
              apartment: {
                select: {
                  id: true,
                  doorNo: true,
                  block: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: limit ?? 500,
  });

  function parseManualReviewNote(note: string | null): {
    doorNo: string | null;
    reference: string | null;
    description: string | null;
    reasonCode: "NO_EXACT_MATCH" | "MULTIPLE_EXACT_MATCH" | "UNKNOWN";
    reasonCount: number | null;
  } {
    if (!note) {
      return {
        doorNo: null,
        reference: null,
        description: null,
        reasonCode: "UNKNOWN",
        reasonCount: null,
      };
    }

    const parts = note
      .split(" | ")
      .map((x) => x.trim())
      .filter(Boolean);

    const doorPart = parts.find((x) => x.startsWith("DOOR:"));
    const refPart = parts.find((x) => x.startsWith("BANK_REF:"));
    const descPart = parts.find((x) => x.startsWith("BANK_DESC:"));
    const reasonPart = parts.find((x) => x.startsWith("UNAPPLIED:MANUAL_REVIEW:"));

    let reasonCode: "NO_EXACT_MATCH" | "MULTIPLE_EXACT_MATCH" | "UNKNOWN" = "UNKNOWN";
    let reasonCount: number | null = null;
    if (reasonPart) {
      const segments = reasonPart.split(":");
      const codeSegment = segments[2] ?? "";
      const countSegment = segments[3] ?? "";
      if (codeSegment === "NO_EXACT_MATCH") {
        reasonCode = "NO_EXACT_MATCH";
      } else if (codeSegment === "MULTIPLE_EXACT_MATCH") {
        reasonCode = "MULTIPLE_EXACT_MATCH";
      }
      const parsedCount = Number(countSegment);
      reasonCount = Number.isFinite(parsedCount) ? parsedCount : null;
    }

    return {
      doorNo: doorPart ? doorPart.slice("DOOR:".length).trim() || null : null,
      reference: refPart ? refPart.slice("BANK_REF:".length).trim() || null : null,
      description: descPart ? descPart.slice("BANK_DESC:".length).trim() || null : null,
      reasonCode,
      reasonCount,
    };
  }

  const rows = payments
    .map((payment) => {
      const parsedNote = parseManualReviewNote(payment.note);
      const apartmentLabels = [...new Set(payment.itemLinks.map((item) => {
        const blockName = item.charge.apartment.block?.name ?? "-";
        const door = item.charge.apartment.doorNo;
        return `${blockName}/${door}`;
      }))];

      return {
        paymentId: payment.id,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        totalAmount: Number(payment.totalAmount),
        method: payment.method,
        source:
          payment.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD
            ? "BANK_STATEMENT_UPLOAD"
            : payment.importBatch?.kind === ImportBatchType.PAYMENT_UPLOAD
              ? "PAYMENT_UPLOAD"
              : "MANUAL",
        importBatchId: payment.importBatch?.id ?? null,
        importFileName: payment.importBatch?.fileName ?? null,
        importUploadedAt: payment.importBatch?.uploadedAt ?? null,
        note: payment.note,
        doorNo: parsedNote.doorNo,
        reference: parsedNote.reference,
        description: parsedNote.description,
        reasonCode: parsedNote.reasonCode,
        reasonCount: parsedNote.reasonCount,
        apartmentLabels,
      };
    })
    .filter((row) => {
      if (!normalizedDoorNoFilter) {
        return true;
      }
      return (row.doorNo ?? "").trim() === normalizedDoorNoFilter;
    });

  return res.json({
    totalCount: rows.length,
    rows,
  });
});

router.get("/reports/reference-search", async (req, res) => {
  const querySchema = z.object({
    reference: z.string().min(1).max(200),
    limit: z.coerce.number().int().min(1).max(2000).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const reference = parsed.data.reference.trim();
  if (!reference) {
    return res.status(400).json({ message: "Reference is required" });
  }

  const referenceLower = reference.toLocaleLowerCase("tr");
  const limit = parsed.data.limit ?? 500;

  function parsePaymentNoteReference(note: string | null): string | null {
    if (!note) {
      return null;
    }

    const parts = note
      .split(" | ")
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.startsWith("BANK_REF:")) {
        return part.slice("BANK_REF:".length).trim() || null;
      }
      if (part.startsWith("REF:")) {
        return part.slice("REF:".length).trim() || null;
      }
    }

    return null;
  }

  function detectPaymentSource(payment: {
    importBatch: { kind: ImportBatchType; fileName: string | null } | null;
    note: string | null;
  }): "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD" {
    if (payment.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD) {
      return "BANK_STATEMENT_UPLOAD";
    }
    if (payment.importBatch?.kind === ImportBatchType.PAYMENT_UPLOAD) {
      return "PAYMENT_UPLOAD";
    }

    const noteUpper = (payment.note ?? "").toUpperCase();
    if (noteUpper.includes("BANK_REF:")) {
      return "BANK_STATEMENT_UPLOAD";
    }
    if (noteUpper.includes("PAYMENT_UPLOAD:")) {
      return "PAYMENT_UPLOAD";
    }

    return "MANUAL";
  }

  const [paymentsRaw, expensesRaw] = await Promise.all([
    prisma.payment.findMany({
      where: {
        note: {
          contains: reference,
          mode: "insensitive",
        },
      },
      include: {
        importBatch: {
          select: { kind: true, fileName: true },
        },
        itemLinks: {
          select: {
            charge: {
              select: {
                apartment: {
                  select: {
                    doorNo: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.expense.findMany({
      where: {
        OR: [
          {
            reference: {
              contains: reference,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: reference,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        expenseItem: {
          select: { id: true },
        },
        importBatch: {
          select: { kind: true, fileName: true },
        },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  ]);

  const payments = paymentsRaw.filter((payment) => {
    const parsedReference = parsePaymentNoteReference(payment.note);
    if (!parsedReference) {
      return false;
    }
    return parsedReference.toLocaleLowerCase("tr") === referenceLower;
  });

  const expenses = expensesRaw.filter((expense) => {
    const expenseReference = expense.reference?.trim();
    if (expenseReference && expenseReference.toLocaleLowerCase("tr") === referenceLower) {
      return true;
    }

    const parsedFromDescription = (expense.description ?? "")
      .split(" | ")
      .map((x) => x.trim())
      .find((part) => part.startsWith("BANK_REF:"))
      ?.slice("BANK_REF:".length)
      .trim();

    return (parsedFromDescription ?? "").toLocaleLowerCase("tr") === referenceLower;
  });

  const rows = [
    ...payments.map((payment) => ({
      movementId: payment.id,
      movementType: "PAYMENT" as const,
      expenseItemId: undefined,
      occurredAt: payment.paidAt,
      amount: Number(payment.totalAmount),
      method: payment.method,
      reference: parsePaymentNoteReference(payment.note),
      description: payment.note,
      source: detectPaymentSource(payment),
      apartmentDoorNos: [...new Set(payment.itemLinks.map((item) => item.charge.apartment.doorNo))],
      fileName: payment.importBatch?.fileName ?? null,
      createdAt: payment.createdAt,
    })),
    ...expenses.map((expense) => ({
      movementId: expense.id,
      movementType: "EXPENSE" as const,
      expenseItemId: expense.expenseItem.id,
      occurredAt: expense.spentAt,
      amount: Number(expense.amount),
      method: expense.paymentMethod,
      reference: expense.reference,
      description: expense.description,
      source:
        expense.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD
          ? "BANK_STATEMENT_UPLOAD"
          : expense.importBatch?.kind === ImportBatchType.PAYMENT_UPLOAD
            ? "PAYMENT_UPLOAD"
            : "MANUAL",
      apartmentDoorNos: [],
      fileName: expense.importBatch?.fileName ?? null,
      createdAt: expense.createdAt,
    })),
  ]
    .sort((a, b) => {
      const occurredDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (occurredDiff !== 0) {
        return occurredDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit)
    .map((row) => ({
      movementId: row.movementId,
      movementType: row.movementType,
      expenseItemId: row.expenseItemId,
      occurredAt: row.occurredAt.toISOString(),
      amount: Number(row.amount.toFixed(2)),
      method: row.method,
      reference: row.reference,
      description: row.description,
      source: row.source,
      apartmentDoorNos: row.apartmentDoorNos,
      fileName: row.fileName,
    }));

  const paymentTotal = Number(
    rows
      .filter((row) => row.movementType === "PAYMENT")
      .reduce((sum, row) => sum + row.amount, 0)
      .toFixed(2)
  );
  const expenseTotal = Number(
    rows
      .filter((row) => row.movementType === "EXPENSE")
      .reduce((sum, row) => sum + row.amount, 0)
      .toFixed(2)
  );

  return res.json({
    snapshotAt: new Date(),
    criteria: {
      reference,
    },
    totals: {
      movementCount: rows.length,
      paymentCount: rows.filter((row) => row.movementType === "PAYMENT").length,
      expenseCount: rows.filter((row) => row.movementType === "EXPENSE").length,
      paymentTotal,
      expenseTotal,
      net: Number((paymentTotal - expenseTotal).toFixed(2)),
    },
    rows,
  });
});

router.put("/payments/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  const schema = z.object({
    paidAt: z.string().datetime(),
    amount: z.number().positive().optional(),
    allowImportedAmountEdit: z.boolean().optional(),
    method: z.nativeEnum(PaymentMethod),
    description: z.string().optional(),
    reference: z.string().optional(),
    apartmentId: z.string().min(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  await ensurePaymentMethodDefinitions();
  const methodDefinition = await prisma.paymentMethodDefinition.findUnique({ where: { code: parsed.data.method } });
  if (!methodDefinition || !methodDefinition.isActive) {
    return res.status(400).json({ message: "Selected payment method is not active" });
  }

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      itemLinks: {
        select: { id: true, chargeId: true, amount: true, charge: { select: { apartmentId: true } } },
        orderBy: [{ id: "asc" }],
      },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const paymentSource = detectPaymentSourceForEdit(existing);
  const currentTotal = Number(existing.totalAmount);
  const requestedAmount = parsed.data.amount;
  if (
    paymentSource === "UPLOAD" &&
    typeof requestedAmount === "number" &&
    Math.abs(requestedAmount - currentTotal) > 0.0001 &&
    !parsed.data.allowImportedAmountEdit
  ) {
    return res.status(409).json({
      message: "Kaynakli odemede tutar degisimi kilitli. Onay kutusunu acip tekrar deneyin.",
    });
  }

  const currentApartmentIdSet = new Set(existing.itemLinks.map((item) => item.charge.apartmentId));
  const requestedApartmentId = parsed.data.apartmentId?.trim();
  const affectedApartmentIdSet = new Set(currentApartmentIdSet);
  if (requestedApartmentId) {
    affectedApartmentIdSet.add(requestedApartmentId);
  }

  const shouldReassignApartment =
    !!requestedApartmentId &&
    (currentApartmentIdSet.size !== 1 || !currentApartmentIdSet.has(requestedApartmentId));

  const targetApartment = requestedApartmentId
    ? await prisma.apartment.findUnique({
        where: { id: requestedApartmentId },
        select: { id: true, doorNo: true },
      })
    : null;

  if (requestedApartmentId && !targetApartment) {
    return res.status(400).json({ message: "Hedef daire bulunamadi" });
  }

  const note = buildPaymentNote(
    existing.note,
    parsed.data.description,
    parsed.data.reference,
    shouldReassignApartment ? targetApartment?.doorNo : undefined
  );

  const beforeSnapshot = mapPaymentSnapshot(existing);
  const affectedChargeIdSet = new Set(existing.itemLinks.map((x) => x.chargeId));

  await prisma.$transaction(async (tx) => {
    if (shouldReassignApartment && requestedApartmentId) {
      const effectiveAmount = typeof requestedAmount === "number" ? requestedAmount : currentTotal;
      if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
        throw new Error("Tutar gecersiz. Daire degisikligi icin pozitif tutar gerekli.");
      }

      const targetCharges = await tx.charge.findMany({
        where: {
          apartmentId: requestedApartmentId,
        },
        select: {
          id: true,
          amount: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });

      if (targetCharges.length === 0) {
        throw new Error("Hedef dairede tahakkuk bulunamadi. Esleme degistirilemedi.");
      }

      const chargeIds = targetCharges.map((charge) => charge.id);
      const paidSums = await tx.paymentItem.groupBy({
        by: ["chargeId"],
        where: {
          chargeId: { in: chargeIds },
          paymentId: { not: paymentId },
        },
        _sum: { amount: true },
      });
      const paidByChargeId = new Map(paidSums.map((row) => [row.chargeId, Number(row._sum.amount ?? 0)]));

      const allocations: Array<{ chargeId: string; amount: number }> = [];
      let remainingToAllocate = Number(effectiveAmount.toFixed(2));

      for (const charge of targetCharges) {
        if (remainingToAllocate <= 0.0001) {
          break;
        }

        const paid = paidByChargeId.get(charge.id) ?? 0;
        const remainingDebt = Number((Number(charge.amount) - paid).toFixed(2));
        if (remainingDebt <= 0.0001) {
          continue;
        }

        const alloc = Math.min(remainingToAllocate, remainingDebt);
        if (alloc > 0.0001) {
          allocations.push({ chargeId: charge.id, amount: Number(alloc.toFixed(2)) });
          remainingToAllocate = Number((remainingToAllocate - alloc).toFixed(2));
        }
      }

      if (allocations.length === 0 || remainingToAllocate > 0.01) {
        throw new Error("Hedef dairede yeterli acik borc yok. Esleme degistirilemedi.");
      }

      await tx.paymentItem.deleteMany({ where: { paymentId } });
      await tx.paymentItem.createMany({
        data: allocations.map((item) => ({
          paymentId,
          chargeId: item.chargeId,
          amount: item.amount,
        })),
      });

      for (const item of allocations) {
        affectedChargeIdSet.add(item.chargeId);
      }
    } else if (typeof requestedAmount === "number" && existing.itemLinks.length > 0) {
      const currentItemTotal = existing.itemLinks.reduce((sum, item) => sum + Number(item.amount), 0);
      if (currentItemTotal <= 0) {
        return;
      }

      if (requestedAmount < existing.itemLinks.length * 0.01) {
        throw new Error("Tutar, dagitim satir sayisina gore cok kucuk. Daha buyuk bir tutar girin.");
      }

      if (existing.itemLinks.length === 1) {
        await tx.paymentItem.update({
          where: { id: existing.itemLinks[0].id },
          data: { amount: Number(requestedAmount.toFixed(2)) },
        });
      } else {
        let allocated = 0;
        for (let i = 0; i < existing.itemLinks.length; i += 1) {
          const item = existing.itemLinks[i];
          const isLast = i === existing.itemLinks.length - 1;
          const nextAmount = isLast
            ? Number((requestedAmount - allocated).toFixed(2))
            : Number(((Number(item.amount) / currentItemTotal) * requestedAmount).toFixed(2));
          allocated += nextAmount;

          await tx.paymentItem.update({
            where: { id: item.id },
            data: { amount: Math.max(0.01, nextAmount) },
          });
        }
      }
    }

    const total = await tx.paymentItem.aggregate({
      where: { paymentId },
      _sum: { amount: true },
    });

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        paidAt: new Date(parsed.data.paidAt),
        totalAmount: Number(total._sum.amount ?? 0),
        method: parsed.data.method,
        note,
      },
    });
  });

  if (affectedApartmentIdSet.size > 0) {
    const apartmentChargeIds = await prisma.charge.findMany({
      where: { apartmentId: { in: [...affectedApartmentIdSet] } },
      select: { id: true },
    });
    for (const charge of apartmentChargeIds) {
      affectedChargeIdSet.add(charge.id);
    }
  }

  await refreshChargeStatusesForIds([...affectedChargeIdSet]);

  const updated = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      itemLinks: {
        select: { id: true, chargeId: true, amount: true },
        orderBy: [{ id: "asc" }],
      },
    },
  });
  if (!updated) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const afterSnapshot = mapPaymentSnapshot(updated);
  const actionLog = await pushActionLog({
    actionType: "EDIT",
    entityType: "PAYMENT",
    entityId: updated.id,
    actorUserId: req.user?.userId ?? null,
    before: beforeSnapshot,
    after: afterSnapshot,
    undoKind: "PAYMENT_EDIT",
    undoPayload: {
      paymentId: updated.id,
      before: beforeSnapshot,
    },
    undoable: true,
  });

  return res.json({
    id: updated.id,
    paidAt: updated.paidAt,
    amount: Number(updated.totalAmount),
    method: updated.method,
    note: updated.note,
    actionLogId: actionLog.id,
    undoUntil: actionLog.undoUntil,
  });
});

router.delete("/payments/:paymentId", async (req, res) => {
  const { paymentId } = req.params;

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      itemLinks: {
        select: { id: true, chargeId: true, amount: true },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const paymentSnapshot = mapPaymentSnapshot(existing);
  const affectedChargeIds = [...new Set(existing.itemLinks.map((x) => x.chargeId))];

  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshChargeStatusesForIds(affectedChargeIds);

  const actionLog = await pushActionLog({
    actionType: "DELETE",
    entityType: "PAYMENT",
    entityId: paymentId,
    actorUserId: req.user?.userId ?? null,
    before: paymentSnapshot,
    after: null,
    undoKind: "PAYMENT_DELETE",
    undoPayload: {
      snapshot: paymentSnapshot,
    },
    undoable: true,
  });

  return res.json({
    deletedPaymentId: paymentId,
    actionLogId: actionLog.id,
    undoUntil: actionLog.undoUntil,
  });
});

router.get("/actions/logs", async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().positive().max(200).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  await pruneActionLogs();
  const limit = parsed.data.limit ?? 50;
  const rowsRaw = await prisma.auditActionLog.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }],
  });
  const rows = rowsRaw.map((x) => mapAuditEntry(x));
  const userIds = [...new Set(rows.map((x) => x.actorUserId).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((x) => [x.id, x]));

  return res.json(
    rows.map((row) => ({
      ...row,
      canUndo: isUndoAvailable(row),
      actorName: row.actorUserId ? userMap.get(row.actorUserId)?.fullName ?? null : null,
      actorEmail: row.actorUserId ? userMap.get(row.actorUserId)?.email ?? null : null,
    }))
  );
});

router.post("/actions/undo/:actionId", async (req, res) => {
  const { actionId } = req.params;
  await pruneActionLogs();

  const targetRaw = await prisma.auditActionLog.findUnique({ where: { id: actionId } });
  const target = targetRaw ? mapAuditEntry(targetRaw) : null;
  if (!target) {
    return res.status(404).json({ message: "Action log not found" });
  }
  if (!isUndoAvailable(target) || !target.undoKind) {
    return res.status(409).json({ message: "Bu islem artik geri alinamaz" });
  }

  if (target.undoKind === "PAYMENT_EDIT") {
    const payload = target.undoPayload as { paymentId: string; before: PaymentSnapshot };
    const before = payload.before;
    const affectedChargeIds = [...new Set(before.items.map((x) => x.chargeId))];

    await prisma.$transaction(async (tx) => {
      for (const item of before.items) {
        await tx.paymentItem.update({
          where: { id: item.id },
          data: { chargeId: item.chargeId, amount: item.amount },
        });
      }

      await tx.payment.update({
        where: { id: payload.paymentId },
        data: {
          paidAt: new Date(before.paidAt),
          totalAmount: before.totalAmount,
          method: before.method,
          note: before.note,
        },
      });
    });

    await refreshChargeStatusesForIds(affectedChargeIds);
  }

  if (target.undoKind === "PAYMENT_DELETE") {
    const payload = target.undoPayload as { snapshot: PaymentSnapshot };
    const snapshot = payload.snapshot;

    const alreadyExists = await prisma.payment.findUnique({ where: { id: snapshot.id } });
    if (!alreadyExists) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            id: snapshot.id,
            importBatchId: snapshot.importBatchId,
            paidAt: new Date(snapshot.paidAt),
            totalAmount: snapshot.totalAmount,
            method: snapshot.method,
            note: snapshot.note,
            createdById: snapshot.createdById,
            createdAt: new Date(snapshot.createdAt),
          },
        });

        for (const item of snapshot.items) {
          await tx.paymentItem.create({
            data: {
              id: item.id,
              paymentId: snapshot.id,
              chargeId: item.chargeId,
              amount: item.amount,
            },
          });
        }
      });
    }

    await refreshChargeStatusesForIds(snapshot.items.map((x) => x.chargeId));
  }

  if (target.undoKind === "EXPENSE_EDIT") {
    const payload = target.undoPayload as { expenseId: string; before: ExpenseSnapshot };
    const before = payload.before;

    await prisma.expense.update({
      where: { id: payload.expenseId },
      data: {
        expenseItemId: before.expenseItemId,
        importBatchId: before.importBatchId,
        spentAt: new Date(before.spentAt),
        amount: before.amount,
        paymentMethod: before.paymentMethod,
        description: before.description,
        reference: before.reference,
      },
    });
  }

  if (target.undoKind === "EXPENSE_DELETE") {
    const payload = target.undoPayload as { snapshot: ExpenseSnapshot };
    const snapshot = payload.snapshot;

    const exists = await prisma.expense.findUnique({ where: { id: snapshot.id } });
    if (!exists) {
      await prisma.expense.create({
        data: {
          id: snapshot.id,
          expenseItemId: snapshot.expenseItemId,
          importBatchId: snapshot.importBatchId,
          spentAt: new Date(snapshot.spentAt),
          amount: snapshot.amount,
          paymentMethod: snapshot.paymentMethod,
          description: snapshot.description,
          reference: snapshot.reference,
          createdById: snapshot.createdById,
          createdAt: new Date(snapshot.createdAt),
        },
      });
    }
  }

  const undoneAt = new Date();
  await prisma.auditActionLog.update({
    where: { id: target.id },
    data: { undoneAt },
  });

  await pushActionLog({
    actionType: "UNDO",
    entityType: target.entityType,
    entityId: target.entityId,
    actorUserId: req.user?.userId ?? null,
    before: { actionId: target.id },
    after: { undoneAt: undoneAt.toISOString() },
    undoKind: null,
    undoPayload: null,
    undoable: false,
  });

  return res.json({ undoneActionId: target.id });
});

router.get("/upload-batches/uploaders", async (_req, res) => {
  const batches = await prisma.importBatch.findMany({
    where: { uploadedById: { not: null } },
    select: { uploadedById: true },
    distinct: ["uploadedById"],
  });

  const ids = batches.map((x) => x.uploadedById).filter(Boolean) as string[];
  if (ids.length === 0) {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, email: true },
    orderBy: [{ fullName: "asc" }],
  });

  return res.json(users);
});

router.get("/upload-batches", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    uploadedByUserId: z.string().optional(),
    kind: z.union([z.nativeEnum(ImportBatchType), z.literal("GMAIL")]).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { from, to, uploadedByUserId, kind } = parsed.data;
  const gmailOnly = kind === "GMAIL";
  const normalizedKind = gmailOnly ? ImportBatchType.BANK_STATEMENT_UPLOAD : kind;
  const limit = parsed.data.limit ?? 200;
  const offset = parsed.data.offset ?? 0;

  const batches = await prisma.importBatch.findMany({
    where: {
      uploadedAt:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
      uploadedById: uploadedByUserId || undefined,
      kind: normalizedKind || undefined,
      fileName: gmailOnly
        ? {
            startsWith: "gmail:",
            mode: "insensitive",
          }
        : undefined,
    },
    include: {
      uploadedBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: [{ uploadedAt: "desc" }],
    take: limit,
    skip: offset,
  });

  return res.json(
    batches.map((batch) => ({
      id: batch.id,
      kind: batch.kind,
      fileName: batch.fileName,
      uploadedAt: batch.uploadedAt,
      uploadedByUserId: batch.uploadedById,
      uploadedByName: batch.uploadedBy?.fullName ?? null,
      uploadedByEmail: batch.uploadedBy?.email ?? null,
      totalRows: batch.totalRows,
      createdPaymentCount: batch.createdPaymentCount,
      createdExpenseCount: batch.createdExpenseCount,
      skippedCount: batch.skippedCount,
    }))
  );
});

router.get("/upload-batches/:batchId/details", async (req, res) => {
  const { batchId } = req.params;

  const extractPaymentReference = (note: string | null): string | null => {
    if (!note) {
      return null;
    }
    const match = note.match(/(?:^|\|)\s*(?:BANK_REF|REF):\s*([^|]+)/i);
    return match?.[1]?.trim() || null;
  };

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      uploadedBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!batch) {
    return res.status(404).json({ message: "Upload batch not found" });
  }

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { importBatchId: batchId },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        method: true,
        note: true,
        itemLinks: {
          select: {
            charge: {
              select: {
                apartment: {
                  select: {
                    doorNo: true,
                    block: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    }),
    prisma.expense.findMany({
      where: { importBatchId: batchId },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        paymentMethod: true,
        description: true,
        reference: true,
        expenseItem: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ spentAt: "desc" }, { id: "desc" }],
    }),
  ]);

  return res.json({
    batch: {
      id: batch.id,
      kind: batch.kind,
      fileName: batch.fileName,
      uploadedAt: batch.uploadedAt,
      uploadedByName: batch.uploadedBy?.fullName ?? null,
      uploadedByEmail: batch.uploadedBy?.email ?? null,
      totalRows: batch.totalRows,
      createdPaymentCount: batch.createdPaymentCount,
      createdExpenseCount: batch.createdExpenseCount,
      skippedCount: batch.skippedCount,
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      paidAt: payment.paidAt,
      totalAmount: Number(payment.totalAmount),
      method: payment.method,
      reference: extractPaymentReference(payment.note),
      note: payment.note,
      apartmentLabels: [
        ...new Set(
          payment.itemLinks.map((item) => `${item.charge.apartment.block.name}/${item.charge.apartment.doorNo}`)
        ),
      ],
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      spentAt: expense.spentAt,
      amount: Number(expense.amount),
      paymentMethod: expense.paymentMethod,
      expenseItemName: expense.expenseItem.name,
      description: expense.description,
      reference: expense.reference,
    })),
  });
});

router.delete("/upload-batches/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        payments: {
          include: {
            itemLinks: {
              select: { chargeId: true },
            },
          },
        },
        expenses: {
          select: { id: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Upload batch not found" });
    }

    const paymentIds = batch.payments.map((x) => x.id);
    const expenseIds = batch.expenses.map((x) => x.id);
    const affectedChargeIds = [...new Set(batch.payments.flatMap((x) => x.itemLinks.map((i) => i.chargeId)))];

    await prisma.$transaction(async (tx) => {
      if (paymentIds.length > 0) {
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }

      if (expenseIds.length > 0) {
        await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
      }

      await tx.importBatch.delete({ where: { id: batchId } });
    });

    await refreshChargeStatusesForIds(affectedChargeIds);

    return res.json({
      deletedBatchId: batchId,
      deletedPayments: paymentIds.length,
      deletedExpenses: expenseIds.length,
      affectedCharges: affectedChargeIds.length,
    });
  } catch (err) {
    console.error("upload-batch delete failed", { batchId, err });
    return res.status(500).json({ message: "Yukleme silinirken hata olustu. Islem tamamlanmadi." });
  }
});

router.post("/payments/upload", upload.single("file"), async (req, res) => {
  const methodSchema = z.object({
    method: z.nativeEnum(PaymentMethod).optional(),
  });

  const parsedMethod = methodSchema.safeParse(req.body);
  if (!parsedMethod.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsedMethod.error.issues });
  }

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (req.file.originalname.toLowerCase().endsWith(".xls")) {
    return res.status(400).json({ message: LEGACY_XLS_UNSUPPORTED_MESSAGE });
  }

  await ensurePaymentMethodDefinitions();
  const method = parsedMethod.data.method ?? PaymentMethod.BANK_TRANSFER;
  const methodDefinition = await prisma.paymentMethodDefinition.findUnique({ where: { code: method } });
  if (!methodDefinition || !methodDefinition.isActive) {
    return res.status(400).json({ message: "Selected payment method is not active" });
  }

  const rows = await parseUploadRows(req.file);
  if (rows.length === 0) {
    return res.status(400).json({ message: "No valid rows found in file" });
  }

  const batch = await prisma.importBatch.create({
    data: {
      kind: ImportBatchType.PAYMENT_UPLOAD,
      fileName: req.file.originalname,
      uploadedById: req.user?.userId,
      totalRows: rows.length,
    },
  });

  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];

    try {
      const apartment = await prisma.apartment.findFirst({
        where: { doorNo: row.doorNo },
        orderBy: [{ block: { name: "asc" } }],
      });

      if (!apartment) {
        skippedCount += 1;
        errors.push(`Satir ${idx + 1}: Daire bulunamadi (${row.doorNo})`);
        continue;
      }

      const charges = await prisma.charge.findMany({
        where: {
          apartmentId: apartment.id,
        },
        include: {
          paymentItems: true,
        },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
      });

      const openCharges = charges
        .map((charge) => {
          const paid = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);
          const remaining = Number(charge.amount) - paid;
          return { chargeId: charge.id, remaining };
        })
        .filter((x) => x.remaining > 0.0001);

      if (openCharges.length === 0) {
        skippedCount += 1;
        errors.push(`Satir ${idx + 1}: Daire icin acik borc yok (${row.doorNo})`);
        continue;
      }

      const totalRemaining = openCharges.reduce((sum, x) => sum + x.remaining, 0);
      if (row.amount - totalRemaining > 0.0001) {
        skippedCount += 1;
        errors.push(
          `Satir ${idx + 1}: Tutar kalan borctan buyuk (${row.doorNo}, tutar=${row.amount}, kalan=${totalRemaining.toFixed(2)})`
        );
        continue;
      }

      const exactCharges = openCharges.filter((charge) => Math.abs(charge.remaining - row.amount) <= 0.01);
      if (openCharges.length > 1 && exactCharges.length !== 1) {
        skippedCount += 1;
        errors.push(
          exactCharges.length === 0
            ? `Satir ${idx + 1}: Birden fazla acik borc var ve exact eslesme yok, manuel tahsilat gerekli (${row.doorNo})`
            : `Satir ${idx + 1}: Birden fazla exact borc eslesmesi var, manuel tahsilat gerekli (${row.doorNo})`
        );
        continue;
      }

      let remainingToAllocate = row.amount;
      const items: Array<{ chargeId: string; amount: number }> = [];

      const orderedCharges = exactCharges.length === 1 ? exactCharges : openCharges;
      for (const charge of orderedCharges) {
        if (remainingToAllocate <= 0.0001) {
          break;
        }

        const allocate = Math.min(remainingToAllocate, charge.remaining);
        if (allocate > 0.0001) {
          items.push({ chargeId: charge.chargeId, amount: Number(allocate.toFixed(2)) });
          remainingToAllocate -= allocate;
        }
      }

      const noteParts = [
        "PAYMENT_UPLOAD:1",
        row.description?.trim(),
        row.reference?.trim() ? `REF:${row.reference.trim()}` : undefined,
      ].filter(Boolean) as string[];
      const note = noteParts.length > 0 ? noteParts.join(" | ") : undefined;

      await prisma.$transaction(async (tx) => {
        const createdPayment = await tx.payment.create({
          data: {
            importBatchId: batch.id,
            paidAt: row.paidAt,
            method,
            note,
            totalAmount: row.amount,
            createdById: req.user?.userId,
          },
        });

        for (const item of items) {
          await tx.paymentItem.create({
            data: {
              paymentId: createdPayment.id,
              chargeId: item.chargeId,
              amount: item.amount,
            },
          });
        }
      });

      createdCount += 1;
    } catch (err) {
      skippedCount += 1;
      errors.push(`Satir ${idx + 1}: Beklenmeyen hata`);
      console.error(err);
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      createdPaymentCount: createdCount,
      createdExpenseCount: 0,
      skippedCount,
    },
  });

  return res.json({
    batchId: batch.id,
    totalRows: rows.length,
    createdCount,
    skippedCount,
    errors: errors.slice(0, 100),
  });
});

router.post("/bank-statement/preview", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (req.file.originalname.toLowerCase().endsWith(".xls")) {
    return res.status(400).json({ message: LEGACY_XLS_UNSUPPORTED_MESSAGE });
  }

  const rows = await parseBankStatementRows(req.file);
  if (rows.length === 0) {
    return res.status(400).json({ message: "No valid bank statement rows found" });
  }

  const apartments = await prisma.apartment.findMany({
    select: { doorNo: true },
  });
  const doorNoSet = new Set<string>();
  for (const apt of apartments) {
    doorNoSet.add(apt.doorNo);
    doorNoSet.add(String(Number(apt.doorNo)));
  }

  const expenseItems = await prisma.expenseItemDefinition.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
  });

  const activeDoorNoRules: DescriptionDoorNoRuleLookup[] = (
    await prisma.descriptionDoorNoRule.findMany({
      where: { isActive: true },
      select: { keyword: true, normalizedKeyword: true, doorNo: true },
      orderBy: [{ updatedAt: "desc" }],
    })
  ).map((rule) => ({
    keyword: rule.keyword,
    normalizedKeyword: rule.normalizedKeyword,
    doorNo: rule.doorNo,
  }));

  const activeExpenseRules: DescriptionExpenseRuleLookup[] = (
    await prisma.descriptionExpenseRule.findMany({
      where: { isActive: true, expenseItem: { isActive: true } },
      select: { normalizedKeyword: true, expenseItemId: true },
      orderBy: [{ updatedAt: "desc" }],
    })
  ).map((rule) => ({
    normalizedKeyword: rule.normalizedKeyword,
    expenseItemId: rule.expenseItemId,
  }));

  const previewRows = rows.map((row, idx) => {
    const isPayment = row.amount > 0;
    return {
      rowNo: idx + 1,
      occurredAt: row.occurredAt.toISOString(),
      amount: Number(Math.abs(row.amount).toFixed(2)),
      entryType: isPayment ? "PAYMENT" : "EXPENSE",
      doorNo: isPayment ? extractDoorNoFromDescription(row.description, doorNoSet, activeDoorNoRules) : null,
      expenseItemId: !isPayment ? matchExpenseItemId(row.description, expenseItems, activeExpenseRules) : null,
      description: row.description,
      reference: row.reference ?? null,
      txType: row.txType ?? null,
      paymentMethod: derivePaymentMethod(row.txType),
    };
  });

  return res.json({
    fileName: req.file.originalname,
    totalRows: rows.length,
    rows: previewRows,
  });
});

router.post("/bank-statement/check-references", async (req, res) => {
  try {
    const bodySchema = z.object({
      references: z.array(z.string().min(1)).min(1).max(500),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const refs = [...new Set(parsed.data.references.map((r) => r.trim()).filter(Boolean))];
    // A payment is considered a duplicate if its note starts with BANK_REF:<reference>
    const existingPayments = await prisma.payment.findMany({
      where: {
        note: {
          in: refs.map((r) => `BANK_REF:${r}`),
        },
      },
      select: { note: true },
    });
    // Also check notes that start with BANK_REF:<ref> (split payments have extra suffix)
    const noteStartMatches = await prisma.payment.findMany({
      where: {
        OR: refs.map((r) => ({ note: { startsWith: `BANK_REF:${r}` } })),
      },
      select: { note: true },
    });
    const existingRefSet = new Set<string>();
    for (const p of [...existingPayments, ...noteStartMatches]) {
      if (!p.note) continue;
      const match = p.note.match(/^BANK_REF:(.+?)(?:\|.*)?$/);
      if (match) existingRefSet.add(match[1]);
    }

    return res.json({ existingReferences: [...existingRefSet] });
  } catch (err) {
    console.error("[bank-statement-check-references-failed]", err);
    return res.status(500).json({ message: "Referans kontrolu basarisiz" });
  }
});

router.post("/bank-statement/commit", async (req, res) => {
  try {
    await ensurePaymentMethodDefinitions();

    const commitSchema = z.object({
      fileName: z.string().min(1).optional(),
      rows: z
        .array(
          z.object({
            occurredAt: z.string().datetime(),
            amount: z.number().positive(),
            entryType: z.enum(["PAYMENT", "EXPENSE"]),
            isAutoSplit: z.boolean().optional(),
            splitSourceRowNo: z.number().int().positive().optional(),
            doorNo: z.string().optional(),
            expenseItemId: z.string().optional(),
            description: z.string().min(1),
            reference: z.string().optional(),
            txType: z.string().optional(),
            paymentMethod: z.nativeEnum(PaymentMethod).optional(),
          })
        )
        .min(1),
    });

    const parsed = commitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const commitRows: BankStatementCommitRow[] = parsed.data.rows.map((row) => ({
      occurredAt: new Date(row.occurredAt),
      amount: row.amount,
      entryType: row.entryType,
      isAutoSplit: row.isAutoSplit,
      splitSourceRowNo: row.splitSourceRowNo,
      doorNo: row.doorNo?.trim() || undefined,
      expenseItemId: row.expenseItemId?.trim() || undefined,
      description: row.description.trim(),
      reference: row.reference?.trim() || undefined,
      txType: row.txType?.trim() || undefined,
      paymentMethod: row.paymentMethod,
    }));

    const result = await processBankStatementImport({
      rows: commitRows,
      fileName: parsed.data.fileName ?? "bank-statement-review",
      uploadedById: req.user?.userId,
    });

    return res.json(result);
  } catch (err) {
    console.error("[bank-statement-commit-failed]", err);
    const detail = err instanceof Error ? err.message : "Beklenmeyen hata";
    return res.status(500).json({ message: `Banka ekstresi kaydedilemedi: ${detail}` });
  }
});

router.post("/bank-statement/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    if (req.file.originalname.toLowerCase().endsWith(".xls")) {
      return res.status(400).json({ message: LEGACY_XLS_UNSUPPORTED_MESSAGE });
    }

    await ensurePaymentMethodDefinitions();

    const rows = await parseBankStatementRows(req.file);
    if (rows.length === 0) {
      return res.status(400).json({ message: "No valid bank statement rows found" });
    }

    const commitRows: BankStatementCommitRow[] = rows.map((row) => ({
      occurredAt: row.occurredAt,
      amount: Number(Math.abs(row.amount).toFixed(2)),
      entryType: row.amount > 0 ? "PAYMENT" : "EXPENSE",
      description: row.description,
      reference: row.reference,
      txType: row.txType,
      paymentMethod: derivePaymentMethod(row.txType),
    }));

    const result = await processBankStatementImport({
      rows: commitRows,
      fileName: req.file.originalname,
      uploadedById: req.user?.userId,
    });

    return res.json(result);
  } catch (err) {
    console.error("[bank-statement-import-failed]", err);
    const detail = err instanceof Error ? err.message : "Beklenmeyen hata";
    return res.status(500).json({ message: `Banka ekstresi islenemedi: ${detail}` });
  }
});

router.post("/bank-statement/gmail-sync", async (req, res) => {
  try {
    const result = await runGmailBankSync(req.user?.userId);
    return res.json({
      message: "Gmail banka ekstresi senkronizasyonu tamamlandi",
      ...result,
    });
  } catch (err) {
    console.error("[bank-statement-gmail-sync-failed]", err);
    const detail = err instanceof Error ? err.message : "Beklenmeyen hata";
    return res.status(500).json({ message: `Gmail senkronizasyonu basarisiz: ${detail}` });
  }
});

router.post("/charges/:chargeId/close", async (req, res) => {
  const { chargeId } = req.params;

  const totals = await prisma.paymentItem.aggregate({
    where: { chargeId },
    _sum: { amount: true },
  });

  const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
  if (!charge) {
    return res.status(404).json({ message: "Charge not found" });
  }

  const paid = Number(totals._sum.amount ?? 0);
  const chargeAmount = Number(charge.amount);

  if (paid + 0.0001 < chargeAmount) {
    return res.status(400).json({
      message: "Cannot close charge before full payment",
      paid,
      chargeAmount,
    });
  }

  const updated = await prisma.charge.update({
    where: { id: chargeId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  return res.json(updated);
});

router.get("/apartments/:apartmentId/statement", async (req, res) => {
  const { apartmentId } = req.params;
  const { statement, accountingStatement } = await getApartmentStatements(apartmentId);

  return res.json({ apartmentId, statement, accountingStatement });
});

router.post("/apartments/:apartmentId/statement-email", async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        doorNo: true,
        ownerFullName: true,
        email1: true,
        email2: true,
        email3: true,
        email4: true,
        landlordEmail: true,
        block: {
          select: { name: true },
        },
      },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Daire bulunamadi" });
    }

    const recipients = collectApartmentStatementRecipients(apartment);
    if (recipients.length === 0) {
      return res.status(400).json({
        message: "Kayitli bir email yok- GONDERILMEDI",
      });
    }

    const { statement, accountingStatement } = await getApartmentStatements(apartmentId);
    const rowMarkup =
      accountingStatement.length > 0
        ? accountingStatement
            .map((row) => {
              const movementLabel = row.movementType === "BORC" ? "BORC" : "ALACAK";
              const year = row.periodYear ?? row.date.getFullYear();
              const month = row.periodMonth ?? row.date.getMonth() + 1;
              const description = trimEmailStatementDescription(formatAccountingEmailDescription(row.description));
              const debitText = row.debit > 0.0001 ? tryCurrencyFormatter.format(row.debit) : "-";
              const creditText = row.credit > 0.0001 ? tryCurrencyFormatter.format(row.credit) : "-";

              return `<tr>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; white-space:nowrap;">${escapeHtml(String(year))}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; white-space:nowrap;">${escapeHtml(String(month).padStart(2, "0"))}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; white-space:nowrap;">${escapeHtml(row.date.toLocaleDateString("tr-TR"))}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; white-space:nowrap;">${escapeHtml(movementLabel)}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; font-size:11px; line-height:1.25;">${escapeHtml(description)}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; white-space:nowrap;">${escapeHtml(debitText)}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; white-space:nowrap;">${escapeHtml(creditText)}</td>
<td style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; white-space:nowrap; font-weight:700; color:#184267;">${escapeHtml(tryCurrencyFormatter.format(row.balance))}</td>
</tr>`;
            })
            .join("")
        : "<tr><td colspan=\"8\" style=\"border:1px solid #d2dbe5; padding:10px; text-align:left;\">Muhasebe ekstre kaydi bulunmuyor.</td></tr>";

    const mobileRowMarkup =
      accountingStatement.length > 0
        ? accountingStatement
            .map((row) => {
              const movementLabel = row.movementType === "BORC" ? "BORC" : "ALACAK";
              const year = row.periodYear ?? row.date.getFullYear();
              const month = row.periodMonth ?? row.date.getMonth() + 1;
              const description = trimEmailStatementDescription(formatAccountingEmailDescription(row.description), 76);
              const debitText = row.debit > 0.0001 ? tryCurrencyFormatter.format(row.debit) : "-";
              const creditText = row.credit > 0.0001 ? tryCurrencyFormatter.format(row.credit) : "-";

              return `<div style="border:1px solid #d6e0eb; border-radius:12px; background:#fff; padding:10px; margin-bottom:10px; box-shadow:0 2px 8px rgba(24,66,103,0.08);">
  <div style="font-size:10px; color:#325b82; font-weight:700; letter-spacing:0.3px; margin-bottom:6px;">${escapeHtml(movementLabel)}</div>
  <div style="font-size:11px; color:#5a6b7c; margin-bottom:6px;">${escapeHtml(String(year))}/${escapeHtml(String(month).padStart(2, "0"))} - ${escapeHtml(row.date.toLocaleDateString("tr-TR"))}</div>
  <div style="font-size:11px; line-height:1.35; color:#1f2f40; margin-bottom:8px;">${escapeHtml(description)}</div>
  <table role="presentation" style="width:100%; border-collapse:collapse; font-size:11px; background:#f7f9fc; border:1px solid #e1e8f0; border-radius:8px;">
    <tr>
      <td style="color:#5a6b7c; padding:6px 7px 4px;">Borc</td>
      <td style="text-align:right; padding:6px 7px 4px; white-space:nowrap;">${escapeHtml(debitText)}</td>
    </tr>
    <tr>
      <td style="color:#5a6b7c; padding:0 7px 4px;">Alacak</td>
      <td style="text-align:right; padding:0 7px 4px; white-space:nowrap;">${escapeHtml(creditText)}</td>
    </tr>
    <tr>
      <td style="color:#184267; padding:0 7px 6px; font-weight:700;">Bakiye</td>
      <td style="text-align:right; padding:0 7px 6px; white-space:nowrap; font-weight:700; color:#184267;">${escapeHtml(tryCurrencyFormatter.format(row.balance))}</td>
    </tr>
  </table>
</div>`;
            })
            .join("")
        : "<div style=\"border:1px solid #d2dbe5; border-radius:10px; background:#fff; padding:10px; font-size:12px;\">Muhasebe ekstre kaydi bulunmuyor.</div>";

    const now = new Date();
    const overdueDebt = Number(
      statement
        .filter((row) => row.remaining > 0.0001)
        .filter((row) => row.dueDate.getTime() < now.getTime())
        .reduce((sum, row) => sum + row.remaining, 0)
        .toFixed(2)
    );
    const apartmentLabel = `${apartment.block.name} - ${apartment.doorNo}`;
    const ownerLabel = apartment.ownerFullName?.trim() ? ` (${apartment.ownerFullName.trim()})` : "";

    const html = `
<div style="margin:0; padding:20px 0; background:#eef3f8; font-family: Arial, Helvetica, sans-serif; color:#1e2f40;">
  <style>
    @media only screen and (max-width: 600px) {
      .statement-email-shell {
        margin: 0 10px !important;
      }
      .statement-email-title {
        font-size: 15px !important;
        white-space: normal !important;
        word-break: break-word !important;
      }
      .statement-email-body {
        padding: 18px 14px !important;
      }
      .statement-meta-table {
        table-layout: fixed !important;
      }
      .statement-apartment-cell {
        width: 72% !important;
      }
      .statement-debt-cell {
        width: 28% !important;
      }
      .statement-apartment-line {
        display: block !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .statement-desktop-only {
        display: none !important;
      }
      .statement-mobile-only {
        display: block !important;
      }
      .statement-email-table th,
      .statement-email-table td {
        padding: 6px 5px !important;
        font-size: 10.5px !important;
      }
      .statement-email-meta {
        font-size: 12px !important;
      }
    }
  </style>
  <div class="statement-email-shell" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid #dbe5f1; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(30,47,64,0.08);">
    <div style="background:linear-gradient(135deg,#1f4e79 0%,#2a6aa1 100%); padding:18px 20px; color:#ffffff;">
      <table role="presentation" style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top; padding-bottom:10px;">
            <div style="width:44px; height:44px; border-radius:10px; background:#ffffff; color:#1f4e79; font-weight:700; font-size:18px; line-height:44px; text-align:center;">AW</div>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:13px; opacity:0.9; margin-bottom:3px;">ApartmanWeb</div>
            <h2 class="statement-email-title" style="margin:0; font-size:20px; line-height:1.2; white-space:normal; word-break:break-word;">ApartmanWeb Ekstre Bilgilendirmesi</h2>
          </td>
        </tr>
      </table>
    </div>

    <div class="statement-email-body" style="padding:22px 20px 20px;">
      <table role="presentation" class="statement-meta-table" style="width:100%; border-collapse:collapse; margin-bottom:14px;">
        <tr>
          <td class="statement-email-meta statement-apartment-cell" style="font-size:14px; padding:0 0 8px;">Daire: <strong class="statement-apartment-line">${escapeHtml(apartmentLabel + ownerLabel)}</strong></td>
          <td class="statement-email-meta statement-debt-cell" style="font-size:14px; padding:0 0 8px; text-align:right;">Geciken borc: <strong>${escapeHtml(tryCurrencyFormatter.format(overdueDebt))}</strong></td>
        </tr>
      </table>

      <table class="statement-email-table statement-desktop-only" style="border-collapse:collapse; width:100%; table-layout:fixed; font-size:12px; background:#ffffff; border:1px solid #d2dbe5;">
        <thead>
          <tr style="background:#e9f0f8;">
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; width:52px;">Yil</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; width:42px;">Ay</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; width:96px;">Tarih</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left; width:76px;">Hareket</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:left;">Aciklama</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; width:96px;">Borc</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; width:96px;">Alacak</th>
            <th style="border:1px solid #d2dbe5; padding:7px 6px; text-align:right; width:96px;">Bakiye</th>
          </tr>
        </thead>
        <tbody>
          ${rowMarkup}
        </tbody>
      </table>
      <div class="statement-mobile-only" style="display:none;">
        ${mobileRowMarkup}
      </div>
    </div>
  </div>
</div>`;

    const textLines = [
      "ApartmanWeb Ekstre Bilgilendirmesi",
      `Daire: ${apartmentLabel}${ownerLabel}`,
      `Geciken borc: ${tryCurrencyFormatter.format(overdueDebt)}`,
      "",
      "Tarih | Aciklama | Borc | Alacak | Bakiye",
      ...accountingStatement.map(
        (row) =>
          `${row.date.toLocaleDateString("tr-TR")} | ${(row.movementType === "BORC" ? "Borc" : "Alacak") + " - " + formatAccountingEmailDescription(row.description)} | ${tryCurrencyFormatter.format(row.debit)} | ${tryCurrencyFormatter.format(row.credit)} | ${tryCurrencyFormatter.format(row.balance)}`
      ),
    ];

    const transporter = getStatementEmailTransporter();
    const fromAddress =
      process.env.STATEMENT_EMAIL_FROM?.trim() ||
      process.env.STATEMENT_EMAIL_SMTP_USER?.trim() ||
      config.gmailBankSync.gmailUser?.trim() ||
      "";
    if (!fromAddress) {
      return res.status(500).json({ message: "Ekstre e-mail gonderici adresi tanimli degil" });
    }

    const fromName = process.env.STATEMENT_EMAIL_FROM_NAME?.trim() || "ApartmanWeb";

    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: recipients.join(", "),
      subject: `ApartmanWeb Muhasebe Ekstresi - ${apartmentLabel}`,
      html,
      text: textLines.join("\n"),
    });

    return res.json({
      message: "E-mail gonderildi",
      recipients,
      rowCount: accountingStatement.length,
      overdueDebt,
    });
  } catch (err) {
    console.error("[statement-email-send-failed]", err);
    const detail = err instanceof Error ? err.message : "Bilinmeyen hata";
    return res.status(500).json({ message: `Ekstre e-mail gonderilemedi: ${detail}` });
  }
});

router.post("/apartments/:apartmentId/reconcile", async (req, res) => {
  const { apartmentId } = req.params;
  const result = await reconcileApartmentPaymentLinks(apartmentId);

  if (!result) {
    return res.status(404).json({ message: "Apartment not found" });
  }

  return res.json({
    ...result,
    message: "Daire yeniden eslestirme tamamlandi",
  });
});

router.post("/reconcile/all", async (_req, res) => {
  const apartments = await prisma.apartment.findMany({
    select: { id: true },
    orderBy: [{ doorNo: "asc" }, { createdAt: "asc" }],
  });

  const results: ReconcileApartmentResult[] = [];
  for (const apartment of apartments) {
    const row = await reconcileApartmentPaymentLinks(apartment.id);
    if (row) {
      results.push(row);
    }
  }

  return res.json({
    apartmentCount: results.length,
    totals: {
      chargeCount: results.reduce((sum, row) => sum + row.chargeCount, 0),
      processedPaymentCount: results.reduce((sum, row) => sum + row.processedPaymentCount, 0),
      skippedMixedPaymentCount: results.reduce((sum, row) => sum + row.skippedMixedPaymentCount, 0),
      createdPaymentItemCount: results.reduce((sum, row) => sum + row.createdPaymentItemCount, 0),
      unappliedPaymentCount: results.reduce((sum, row) => sum + row.unappliedPaymentCount, 0),
      unappliedTotal: Number(results.reduce((sum, row) => sum + row.unappliedTotal, 0).toFixed(2)),
    },
    results,
    message: "Tum daireler icin toplu yeniden eslestirme tamamlandi",
  });
});

router.get("/reconcile/mixed-payments", async (req, res) => {
  const schema = z.object({
    apartmentId: z.string().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { apartmentId, limit } = parsed.data;
  const rows = await buildMixedPaymentReport(apartmentId);
  const effectiveLimit = limit ?? 200;

  return res.json({
    totalCount: rows.length,
    rows: rows.slice(0, effectiveLimit),
  });
});

router.get("/reconcile/door-mismatch-report", async (req, res) => {
  const querySchema = z.object({
    limit: z.coerce.number().int().positive().max(1000).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const links = await prisma.paymentItem.findMany({
    where: {
      payment: {
        importBatch: { kind: ImportBatchType.BANK_STATEMENT_UPLOAD },
      },
    },
    select: {
      id: true,
      amount: true,
      payment: {
        select: {
          id: true,
          paidAt: true,
          totalAmount: true,
          note: true,
          importBatch: { select: { fileName: true, uploadedAt: true } },
        },
      },
      charge: {
        select: {
          id: true,
          periodYear: true,
          periodMonth: true,
          description: true,
          chargeType: { select: { name: true } },
          apartment: { select: { doorNo: true, block: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ payment: { paidAt: "desc" } }, { id: "desc" }],
  });

  const rows = links
    .map((link) => {
      const paymentDoorNoRaw = extractDoorNoTagFromPaymentNote(link.payment.note);
      const paymentDoorNoNormalized = normalizeDoorNoForCompare(paymentDoorNoRaw);
      if (!paymentDoorNoNormalized) {
        return null;
      }

      const chargeDoorNoNormalized = normalizeDoorNoForCompare(link.charge.apartment.doorNo);
      if (paymentDoorNoNormalized === chargeDoorNoNormalized) {
        return null;
      }

      return {
        paymentItemId: link.id,
        paymentId: link.payment.id,
        paidAt: link.payment.paidAt,
        paymentTotal: Number(link.payment.totalAmount),
        allocatedAmount: Number(link.amount),
        paymentDoorNo: paymentDoorNoRaw,
        linkedDoorNo: link.charge.apartment.doorNo,
        linkedBlockName: link.charge.apartment.block.name,
        periodYear: link.charge.periodYear,
        periodMonth: link.charge.periodMonth,
        chargeTypeName: link.charge.chargeType.name,
        chargeDescription: link.charge.description,
        paymentNote: link.payment.note,
        sourceFileName: link.payment.importBatch?.fileName ?? null,
        sourceUploadedAt: link.payment.importBatch?.uploadedAt ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const limit = parsed.data.limit ?? 200;

  return res.json({
    totals: {
      bankStatementPaymentItemCount: links.length,
      mismatchPaymentItemCount: rows.length,
      mismatchPaymentCount: new Set(rows.map((row) => row.paymentId)).size,
      mismatchAllocatedTotal: Number(rows.reduce((sum, row) => sum + row.allocatedAmount, 0).toFixed(2)),
    },
    rows: rows.slice(0, limit),
  });
});

router.get("/reports/overdue-payments", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    blockId: z.string().optional(),
    doorNo: z.string().optional(),
    chargeTypeId: z.string().optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { from, to, blockId, doorNo, chargeTypeId } = parsed.data;
  const now = new Date();

  function formatOverdueChargeDescription(
    description: string | null,
    chargeTypeName: string | null | undefined
  ): string | null {
    if (!description) {
      return null;
    }

    const parts = description
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    const title = parts[0] ?? "";
    const normalizedTitle = toAsciiLower(title).replace(/\s+/g, " ").trim();
    const normalizedChargeType = toAsciiLower(chargeTypeName ?? "").replace(/\s+/g, " ").trim();
    const normalizedDescription = toAsciiLower(description).replace(/\s+/g, " ").trim();
    const isDistribution = normalizedChargeType.includes("dagitim");
    const isDogalgaz =
      normalizedChargeType.includes("dogalgaz") ||
      normalizedTitle.includes("dogalgaz") ||
      normalizedDescription.includes("dogalgaz");
    const shouldCompact = isDistribution || isDogalgaz;
    if (!shouldCompact) {
      return description;
    }

    const normalizedDisplayTitle = title.replace(/\s+/g, " ").trim();
    const displayTitle = normalizedDisplayTitle || (isDogalgaz ? "Dogalgaz" : "Dagitim");

    const isoDate = description.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    if (isoDate) {
      const [year, month, day] = isoDate.split("-");
      return `${displayTitle} | Fatura tarihi: ${day}.${month}.${year}`;
    }

    const trDate = description.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? null;
    if (trDate) {
      return `${displayTitle} | Fatura tarihi: ${trDate}`;
    }

    return displayTitle;
  }

  const charges = await prisma.charge.findMany({
    where: {
      status: "OPEN",
      dueDate: {
        lt: now,
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      apartment: {
        blockId: blockId || undefined,
        doorNo: doorNo?.trim() ? { equals: doorNo.trim() } : undefined,
      },
      chargeTypeId: chargeTypeId?.trim() ? chargeTypeId.trim() : undefined,
    },
    include: {
      chargeType: {
        select: { name: true },
      },
      apartment: {
        include: {
          block: {
            select: { name: true },
          },
        },
      },
      paymentItems: {
        select: {
          amount: true,
          payment: {
            select: {
              paidAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const rows = charges
    .map((charge) => {
      const paidTotal = charge.paymentItems.reduce((sum, x) => sum + Number(x.amount), 0);
      const remaining = Math.max(0, Number(charge.amount) - paidTotal);
      const lastPaymentAt =
        charge.paymentItems.length > 0
          ? charge.paymentItems
              .map((x) => x.payment.paidAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;

      const overdueDays = Math.max(
        1,
        Math.floor((now.getTime() - new Date(charge.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        chargeId: charge.id,
        apartmentId: charge.apartment.id,
        blockName: charge.apartment.block.name,
        apartmentDoorNo: charge.apartment.doorNo,
        apartmentOwnerName: charge.apartment.ownerFullName,
        chargeTypeName: charge.chargeType.name,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        dueDate: charge.dueDate,
        amount: Number(charge.amount),
        paidTotal: Number(paidTotal.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        overdueDays,
        description: formatOverdueChargeDescription(charge.description, charge.chargeType.name),
        lastPaymentAt,
      };
    })
    .filter((x) => x.remaining > 0.0001);

  const responseRows = rows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString(),
    lastPaymentAt: row.lastPaymentAt ? row.lastPaymentAt.toISOString() : null,
  }));

  const totals = {
    rowCount: rows.length,
    totalAmount: Number(rows.reduce((sum, x) => sum + x.amount, 0).toFixed(2)),
    totalPaid: Number(rows.reduce((sum, x) => sum + x.paidTotal, 0).toFixed(2)),
    totalRemaining: Number(rows.reduce((sum, x) => sum + x.remaining, 0).toFixed(2)),
  };

  return res.json({
    snapshotAt: now,
    totals,
    rows: responseRows,
  });
});

router.get("/reports/staff-open-aidat", async (req, res) => {
  const querySchema = z.object({
    apartmentId: z.string().min(1),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const now = new Date();
  const apartmentId = parsed.data.apartmentId.trim();

  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: {
      id: true,
      doorNo: true,
      ownerFullName: true,
      block: {
        select: { name: true },
      },
    },
  });

  if (!apartment) {
    return res.status(404).json({ message: "Daire bulunamadi" });
  }

  const charges = await prisma.charge.findMany({
    where: {
      apartmentId,
      status: "OPEN",
    },
    include: {
      chargeType: {
        select: {
          code: true,
          name: true,
        },
      },
      paymentItems: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });

  const rows = charges
    .map((charge) => {
      const paidTotal = charge.paymentItems.reduce((sum, x) => sum + Number(x.amount), 0);
      const remaining = Math.max(0, Number(charge.amount) - paidTotal);
      const overdueDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(charge.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        chargeId: charge.id,
        apartmentId,
        blockName: apartment.block.name,
        apartmentDoorNo: apartment.doorNo,
        apartmentOwnerName: apartment.ownerFullName,
        chargeTypeName: charge.chargeType.name,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        dueDate: charge.dueDate,
        amount: Number(charge.amount),
        paidTotal: Number(paidTotal.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        overdueDays,
        description: charge.description,
      };
    })
    .filter((row) => row.remaining > 0.0001);

  return res.json({
    snapshotAt: now,
    apartment: {
      apartmentId,
      blockName: apartment.block.name,
      apartmentDoorNo: apartment.doorNo,
      apartmentOwnerName: apartment.ownerFullName,
    },
    totals: {
      rowCount: rows.length,
      totalAmount: Number(rows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
      totalPaid: Number(rows.reduce((sum, row) => sum + row.paidTotal, 0).toFixed(2)),
      totalRemaining: Number(rows.reduce((sum, row) => sum + row.remaining, 0).toFixed(2)),
    },
    rows: rows.map((row) => ({
      ...row,
      dueDate: row.dueDate.toISOString(),
    })),
  });
});

router.get("/reports/fractional-closures", async (req, res) => {
  const querySchema = z.object({});

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const now = new Date();

  const charges = await prisma.charge.findMany({
    where: {
      status: "OPEN",
      paymentItems: {
        some: {},
      },
    },
    include: {
      chargeType: {
        select: { name: true },
      },
      apartment: {
        include: {
          block: {
            select: { name: true },
          },
        },
      },
      paymentItems: {
        select: {
          amount: true,
          payment: {
            select: {
              paidAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const rows = charges
    .map((charge) => {
      const paidTotal = charge.paymentItems.reduce((sum, x) => sum + Number(x.amount), 0);
      const remaining = Number((Math.max(0, Number(charge.amount) - paidTotal)).toFixed(2));
      if (paidTotal <= 0.0001 || remaining <= 0.0001) {
        return null;
      }

      const lastPaymentAt =
        charge.paymentItems.length > 0
          ? charge.paymentItems
              .map((x) => x.payment.paidAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;

      const chargeMonthLabel = `${String(charge.periodMonth).padStart(2, "0")}/${charge.periodYear}`;
      const paymentMonthLabels = [...new Set(
        charge.paymentItems
          .map((x) => {
            const paidAt = x.payment.paidAt;
            return `${String(paidAt.getUTCMonth() + 1).padStart(2, "0")}/${paidAt.getUTCFullYear()}`;
          })
          .sort((a, b) => {
            const [am, ay] = a.split("/").map(Number);
            const [bm, by] = b.split("/").map(Number);
            if (ay !== by) {
              return ay - by;
            }
            return am - bm;
          })
      )];

      const differentMonthLabels = paymentMonthLabels.filter((x) => x !== chargeMonthLabel);
      const sourceMonth =
        differentMonthLabels.length > 0
          ? differentMonthLabels.join(", ")
          : paymentMonthLabels[0] ?? null;

      return {
        chargeId: charge.id,
        blockName: charge.apartment.block.name,
        apartmentDoorNo: charge.apartment.doorNo,
        apartmentOwnerName: charge.apartment.ownerFullName,
        chargeTypeName: charge.chargeType.name,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        dueDate: charge.dueDate,
        amount: Number(charge.amount),
        paidTotal: Number(paidTotal.toFixed(2)),
        remaining,
        description: charge.description,
        lastPaymentAt,
        sourceMonth,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const responseRows = rows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString(),
    lastPaymentAt: row.lastPaymentAt ? row.lastPaymentAt.toISOString() : null,
  }));

  const totals = {
    rowCount: rows.length,
    totalAmount: Number(rows.reduce((sum, x) => sum + x.amount, 0).toFixed(2)),
    totalPaid: Number(rows.reduce((sum, x) => sum + x.paidTotal, 0).toFixed(2)),
    totalRemaining: Number(rows.reduce((sum, x) => sum + x.remaining, 0).toFixed(2)),
  };

  return res.json({
    snapshotAt: now,
    criteria: {
      openPartialOnly: true,
    },
    totals,
    rows: responseRows,
  });
});

router.get("/reports/summary", async (_req, res) => {
  const now = new Date();
  const endOfNextMonthFifthDay = new Date(now.getFullYear(), now.getMonth() + 1, 5, 23, 59, 59, 999);
  const next30Days = new Date(now);
  next30Days.setDate(next30Days.getDate() + 30);

  const [
    apartmentCount,
    residentCount,
    apartmentsForOverview,
    openCharges,
    paymentTotalAgg,
    expenseTotalAgg,
    bankInAgg,
    bankOutAgg,
    latestBankPayment,
    latestBankExpense,
    latestUploadBatches,
    topExpenseGroups,
    latestBankTransferPayments,
    latestBankTransferExpenses,
  ] = await Promise.all([
    prisma.apartment.count(),
    prisma.user.count({ where: { role: UserRole.RESIDENT } }),
    prisma.apartment.findMany({
      select: {
        apartmentClassId: true,
        apartmentClass: {
          select: { name: true },
        },
        doorNo: true,
        ownerFullName: true,
        occupancyType: true,
        type: true,
        apartmentDuty: {
          select: { code: true, name: true },
        },
      },
      orderBy: [{ doorNo: "asc" }],
    }),
    prisma.charge.findMany({
      where: { status: "OPEN" },
      select: { id: true, amount: true, dueDate: true, apartmentId: true },
    }),
    prisma.payment.aggregate({
      where: {
        NOT: {
          OR: [
            { note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX } },
            { note: { contains: CARRY_FORWARD_PAYMENT_NOTE_TAG } },
          ],
        },
      },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { method: PaymentMethod.BANK_TRANSFER }, _sum: { totalAmount: true } }),
    prisma.expense.aggregate({ where: { paymentMethod: PaymentMethod.BANK_TRANSFER }, _sum: { amount: true } }),
    prisma.payment.findFirst({
      where: { method: PaymentMethod.BANK_TRANSFER },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: { paidAt: true },
    }),
    prisma.expense.findFirst({
      where: { paymentMethod: PaymentMethod.BANK_TRANSFER },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      select: { spentAt: true },
    }),
    prisma.importBatch.findMany({
      orderBy: [{ uploadedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        kind: true,
        fileName: true,
        uploadedAt: true,
        totalRows: true,
        createdPaymentCount: true,
        createdExpenseCount: true,
        skippedCount: true,
      },
    }),
    prisma.expense.groupBy({
      by: ["expenseItemId"],
      _sum: { amount: true },
      _count: { _all: true },
      _max: { spentAt: true },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 10,
    }),
    prisma.payment.findMany({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        createdAt: true,
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 25,
    }),
    prisma.expense.findMany({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        description: true,
        createdAt: true,
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 25,
    }),
  ]);

  const latestBankPaymentRows = latestBankTransferPayments
    .map((row) => {
      if (row.note?.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)) {
        return null;
      }

      const parts = (row.note ?? "")
        .split(" | ")
        .map((x) => x.trim())
        .filter(Boolean);

      let parsedDescription: string | null = null;
      const freeTextParts: string[] = [];
      for (const part of parts) {
        const upper = part.toUpperCase();

        if (upper.startsWith("BANK_DESC:")) {
          parsedDescription = part.slice(part.indexOf(":") + 1).trim() || null;
          continue;
        }

        if (
          upper.startsWith("BANK_REF:") ||
          upper.startsWith("REF:") ||
          upper.startsWith("DOOR:") ||
          upper.startsWith("PAYMENT_UPLOAD:") ||
          upper.startsWith("UNAPPLIED:") ||
          upper.startsWith("CARRY_FORWARD:") ||
          upper === "RECONCILE_LOCK:MANUAL"
        ) {
          continue;
        }

        freeTextParts.push(part);
      }

      const description = parsedDescription ?? (freeTextParts.length > 0 ? freeTextParts.join(" | ") : "Banka Tahsilati");

      return {
        id: row.id,
        occurredAt: row.paidAt,
        createdAt: row.createdAt,
        movementType: "PAYMENT" as const,
        amount: Number(row.totalAmount.toFixed(2)),
        description,
      };
    })
    .filter(
      (row): row is { id: string; occurredAt: Date; createdAt: Date; movementType: "PAYMENT"; amount: number; description: string } =>
        Boolean(row)
    );

  const latestBankExpenseRows = latestBankTransferExpenses.map((row) => ({
    id: row.id,
    occurredAt: row.spentAt,
    createdAt: row.createdAt,
    movementType: "EXPENSE" as const,
    amount: Number(row.amount.toFixed(2)),
    description: row.description?.trim() || "Banka Gideri",
  }));

  const latestBankMovements = [...latestBankPaymentRows, ...latestBankExpenseRows]
    .sort((a, b) => {
      const occurredDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (occurredDiff !== 0) {
        return occurredDiff;
      }
      const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return b.id.localeCompare(a.id);
    })
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt,
      movementType: row.movementType,
      amount: row.amount,
      description: row.description,
    }));

  const topExpenseItemIds = topExpenseGroups.map((item) => item.expenseItemId).filter(Boolean);
  const topExpenseItems =
    topExpenseItemIds.length > 0
      ? await prisma.expenseItemDefinition.findMany({
          where: { id: { in: topExpenseItemIds } },
          select: { id: true, name: true },
        })
      : [];
  const topExpenseItemNameMap = new Map(topExpenseItems.map((item) => [item.id, item.name]));

  const openChargeIds = openCharges.map((x) => x.id);
  const paidGrouped =
    openChargeIds.length > 0
      ? await prisma.paymentItem.groupBy({
          by: ["chargeId"],
          where: { chargeId: { in: openChargeIds } },
          _sum: { amount: true },
        })
      : [];

  const paidMap = new Map(paidGrouped.map((x) => [x.chargeId, Number(x._sum.amount ?? 0)]));

  let openRemainingTotal = 0;
  let overdueRemainingTotal = 0;
  let overdueChargeCount = 0;
  const overdueApartmentSet = new Set<string>();
  const overdueByApartmentId = new Map<string, { remainingTotal: number; chargeCount: number }>();
  let nextMonthFifthUpcomingTotal = 0;
  let upcoming30DaysTotal = 0;
  let oldestOverdueDate: Date | null = null;

  for (const charge of openCharges) {
    const remaining = Math.max(0, Number(charge.amount) - (paidMap.get(charge.id) ?? 0));
    openRemainingTotal += remaining;

    if (remaining <= 0) {
      continue;
    }

    if (charge.dueDate < now) {
      overdueRemainingTotal += remaining;
      overdueChargeCount += 1;
      overdueApartmentSet.add(charge.apartmentId);
      const existing = overdueByApartmentId.get(charge.apartmentId) ?? { remainingTotal: 0, chargeCount: 0 };
      overdueByApartmentId.set(charge.apartmentId, {
        remainingTotal: Number((existing.remainingTotal + remaining).toFixed(2)),
        chargeCount: existing.chargeCount + 1,
      });
      if (!oldestOverdueDate || charge.dueDate < oldestOverdueDate) {
        oldestOverdueDate = charge.dueDate;
      }
      continue;
    }

    if (charge.dueDate <= endOfNextMonthFifthDay) {
      nextMonthFifthUpcomingTotal += remaining;
    }

    if (charge.dueDate <= next30Days) {
      upcoming30DaysTotal += remaining;
    }
  }

  const bankInTotal = Number(bankInAgg._sum.totalAmount ?? 0);
  const bankOutTotal = Number(bankOutAgg._sum.amount ?? 0);
  const estimatedBankBalance = bankInTotal - bankOutTotal;

  const kucukApartmentCount = apartmentsForOverview.filter((x) => x.type === ApartmentType.KUCUK).length;
  const buyukApartmentCount = apartmentsForOverview.filter((x) => x.type === ApartmentType.BUYUK).length;
  const apartmentClassCount = new Set(apartmentsForOverview.map((x) => x.apartmentClassId).filter(Boolean)).size;
  const apartmentClassBreakdownMap = new Map<string, number>();
  for (const apartment of apartmentsForOverview) {
    const className = apartment.apartmentClass?.name?.trim() || "Sinifsiz";
    apartmentClassBreakdownMap.set(className, (apartmentClassBreakdownMap.get(className) ?? 0) + 1);
  }
  const apartmentClassBreakdown = [...apartmentClassBreakdownMap.entries()]
    .map(([className, count]) => ({ className, count }))
    .sort((a, b) => a.className.localeCompare(b.className, "tr"));
  const ownerCount = apartmentsForOverview.filter((x) => x.occupancyType === OccupancyType.OWNER).length;
  const tenantCount = apartmentsForOverview.filter((x) => x.occupancyType === OccupancyType.TENANT).length;
  const managers = apartmentsForOverview
    .filter((x) => x.apartmentDuty?.code === "YONETICI")
    .map((x) => `${x.doorNo}-${x.ownerFullName?.trim() || "Adsiz"}`);
  const dutyAssignments = apartmentsForOverview
    .filter((x) => x.apartmentDuty && x.apartmentDuty.code !== "YONETICI")
    .map((x) => ({
      dutyName: x.apartmentDuty?.name ?? "Gorev",
      apartment: `${x.doorNo}-${x.ownerFullName?.trim() || "Adsiz"}`,
    }));

  const latestBankMovementAt =
    latestBankPayment?.paidAt && latestBankExpense?.spentAt
      ? latestBankPayment.paidAt > latestBankExpense.spentAt
        ? latestBankPayment.paidAt
        : latestBankExpense.spentAt
      : latestBankPayment?.paidAt ?? latestBankExpense?.spentAt ?? null;

  const overdueApartmentIds = [...overdueByApartmentId.keys()];
  const overdueApartments =
    overdueApartmentIds.length > 0
      ? await prisma.apartment.findMany({
          where: { id: { in: overdueApartmentIds } },
          select: {
            id: true,
            doorNo: true,
            ownerFullName: true,
          },
        })
      : [];
  const overdueApartmentMap = new Map(overdueApartments.map((item) => [item.id, item]));
  const topOverdueApartments = overdueApartmentIds
    .map((apartmentId) => {
      const summary = overdueByApartmentId.get(apartmentId);
      const apartment = overdueApartmentMap.get(apartmentId);
      if (!summary || !apartment) {
        return null;
      }

      return {
        apartmentId,
        apartmentLabel: `${apartment.doorNo}-${apartment.ownerFullName?.trim() || "Adsiz"}`,
        remainingTotal: Number(summary.remainingTotal.toFixed(2)),
        overdueChargeCount: summary.chargeCount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.remainingTotal - a.remainingTotal)
    .slice(0, 10);

  return res.json({
    snapshotAt: now,
    bankBalance: {
      estimatedBalance: Number(estimatedBankBalance.toFixed(2)),
      totalBankIn: Number(bankInTotal.toFixed(2)),
      totalBankOut: Number(bankOutTotal.toFixed(2)),
      latestMovementAt: latestBankMovementAt,
    },
    collectionsAndExpenses: {
      totalCollections: Number(Number(paymentTotalAgg._sum.totalAmount ?? 0).toFixed(2)),
      totalExpenses: Number(Number(expenseTotalAgg._sum.amount ?? 0).toFixed(2)),
      netCollections: Number(
        (Number(paymentTotalAgg._sum.totalAmount ?? 0) - Number(expenseTotalAgg._sum.amount ?? 0)).toFixed(2)
      ),
    },
    receivables: {
      openChargeCount: openCharges.length,
      openRemainingTotal: Number(openRemainingTotal.toFixed(2)),
      overdueChargeCount,
      overdueApartmentCount: overdueApartmentSet.size,
      overdueRemainingTotal: Number(overdueRemainingTotal.toFixed(2)),
      monthEndUpcomingTotal: Number(nextMonthFifthUpcomingTotal.toFixed(2)),
      upcoming30DaysTotal: Number(upcoming30DaysTotal.toFixed(2)),
      oldestOverdueDate,
    },
    occupancy: {
      apartmentCount,
      residentUserCount: residentCount,
    },
    apartmentOverview: {
      totalApartmentCount: apartmentCount,
      kucukApartmentCount,
      buyukApartmentCount,
      apartmentClassCount,
      apartmentClassBreakdown,
      ownerCount,
      tenantCount,
      managers,
      dutyAssignments,
    },
    latestBankMovements,
    latestUploadBatches,
    topExpenses: topExpenseGroups.map((item) => ({
      id: item.expenseItemId,
      expenseItemName: topExpenseItemNameMap.get(item.expenseItemId) ?? "Bilinmeyen Gider Kalemi",
      totalAmount: Number(item._sum.amount ?? 0),
      expenseCount: item._count._all,
      latestSpentAt: item._max.spentAt,
    })),
    topOverdueApartments,
  });
});

router.get("/reports/bank-reconciliation", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(2000).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const fromDate = parsed.data.from ? new Date(parsed.data.from) : null;
  const toDateExclusive = parsed.data.to ? new Date(new Date(parsed.data.to).getTime() + 24 * 60 * 60 * 1000) : null;
  const limit = parsed.data.limit ?? 500;

  const paidAtFilter: Prisma.DateTimeFilter | undefined =
    fromDate || toDateExclusive
      ? {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDateExclusive ? { lt: toDateExclusive } : {}),
        }
      : undefined;
  const spentAtFilter: Prisma.DateTimeFilter | undefined =
    fromDate || toDateExclusive
      ? {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDateExclusive ? { lt: toDateExclusive } : {}),
        }
      : undefined;

  const [payments, expenses, expenseAgg, openingAgg, priorPaymentAgg, priorExpenseAgg] = await Promise.all([
    prisma.payment.findMany({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        createdAt: true,
        importBatch: {
          select: {
            kind: true,
            fileName: true,
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expense.findMany({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        ...(spentAtFilter ? { spentAt: spentAtFilter } : {}),
      },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        description: true,
        reference: true,
        createdAt: true,
        importBatch: {
          select: {
            kind: true,
            fileName: true,
          },
        },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expense.aggregate({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        ...(spentAtFilter ? { spentAt: spentAtFilter } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
      },
      _sum: { totalAmount: true },
      _min: { paidAt: true },
    }),
    prisma.payment.aggregate({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        ...(fromDate ? { paidAt: { lt: fromDate } } : {}),
      },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        ...(fromDate ? { spentAt: { lt: fromDate } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const paymentRows = payments.map((row) => {
      const isOpeningBalance = Boolean(row.note?.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX));
      const parts = (row.note ?? "")
        .split(" | ")
        .map((x) => x.trim())
        .filter(Boolean);

      let parsedReference: string | null = null;
      let parsedDescription: string | null = null;
      const freeTextParts: string[] = [];

      for (const part of parts) {
        const upperPart = part.toUpperCase();

        if (upperPart.startsWith("BANK_REF:")) {
          parsedReference = part.slice(part.indexOf(":") + 1).trim() || null;
          continue;
        }

        if (upperPart.startsWith("REF:")) {
          parsedReference = parsedReference ?? (part.slice(part.indexOf(":") + 1).trim() || null);
          continue;
        }

        const refMatch = part.match(/(?:^|\s)(BANK_REF|REF)\s*:\s*(\S.+)$/i);
        if (refMatch) {
          parsedReference = parsedReference ?? (refMatch[2].trim() || null);
          continue;
        }

        if (upperPart.startsWith("BANK_DESC:")) {
          parsedDescription = part.slice(part.indexOf(":") + 1).trim() || null;
          continue;
        }

        const descMatch = part.match(/(?:^|\s)BANK_DESC\s*:\s*(.+)$/i);
        if (descMatch) {
          parsedDescription = descMatch[1].trim() || null;
          continue;
        }

        if (
          upperPart.startsWith("DOOR:") ||
          upperPart.startsWith("PAYMENT_UPLOAD:") ||
          upperPart.startsWith("UNAPPLIED:") ||
          upperPart.startsWith("CARRY_FORWARD:")
        ) {
          continue;
        }
        if (upperPart.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)) {
          continue;
        }

        freeTextParts.push(part);
      }

      const openingBalanceMeta = row.note?.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)
        ? parseOpeningBalanceNote(row.note)
        : null;

      const resolvedDescription =
        parsedDescription ??
        (freeTextParts.length > 0 ? freeTextParts.join(" | ") : null) ??
        (openingBalanceMeta
          ? `Sistem Acilis Bakiyesi${openingBalanceMeta.bankName ? ` (${openingBalanceMeta.bankName})` : ""}`
          : null);

      return {
        id: row.id,
        occurredAt: row.paidAt,
        entryType: "IN" as const,
        amount: Number(row.totalAmount),
        description: resolvedDescription,
        reference: parsedReference,
        isOpeningBalance,
        source:
          row.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD
            ? "BANK_STATEMENT_UPLOAD"
            : row.importBatch?.kind === ImportBatchType.PAYMENT_UPLOAD
              ? "PAYMENT_UPLOAD"
              : "MANUAL",
        fileName: row.importBatch?.fileName ?? null,
        createdAt: row.createdAt,
      };
    });

  const movementPaymentRows = paymentRows.filter((row) => !row.isOpeningBalance);

  const rows = [
    ...movementPaymentRows,
    ...expenses.map((row) => ({
      id: row.id,
      occurredAt: row.spentAt,
      entryType: "OUT" as const,
      amount: Number(row.amount),
      description: row.description,
      reference: row.reference,
      isOpeningBalance: false,
      source: row.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD ? "BANK_STATEMENT_UPLOAD" : "MANUAL",
      fileName: row.importBatch?.fileName ?? null,
      createdAt: row.createdAt,
    })),
  ]
    .sort((a, b) => {
      const occurredDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (occurredDiff !== 0) {
        return occurredDiff;
      }
      const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return b.id.localeCompare(a.id);
    });

  const totalIn = movementPaymentRows.reduce((sum, row) => sum + row.amount, 0);
  const totalOut = Number(expenseAgg._sum.amount ?? 0);
  const openingBalance = Number(openingAgg._sum.totalAmount ?? 0);
  const priorIn = Number(priorPaymentAgg._sum.totalAmount ?? 0);
  const priorOut = Number(priorExpenseAgg._sum.amount ?? 0);
  const startingBalance = fromDate ? priorIn - priorOut : openingBalance;
  const openingDate = openingAgg._min.paidAt;

  return res.json({
    snapshotAt: new Date(),
    criteria: {
      from: parsed.data.from ?? null,
      to: parsed.data.to ?? null,
      limit,
    },
    totals: {
      totalIn: Number(totalIn.toFixed(2)),
      totalOut: Number(totalOut.toFixed(2)),
      net: Number((totalIn - totalOut).toFixed(2)),
      openingBalance: Number(openingBalance.toFixed(2)),
      startingBalance: Number(startingBalance.toFixed(2)),
      openingDate: openingDate ? openingDate.toISOString() : null,
      paymentCount: movementPaymentRows.length,
      expenseCount: expenses.length,
      movementCount: movementPaymentRows.length + expenses.length,
    },
    rows: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      entryType: row.entryType,
      amount: Number(row.amount.toFixed(2)),
      description: row.description,
      reference: row.reference,
      isOpeningBalance: row.isOpeningBalance,
      source: row.source,
      fileName: row.fileName,
    })),
  });
});

router.get("/reports/monthly-ledger-print", async (req, res) => {
  const querySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const year = parsed.data.year;
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEndExclusive = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  function toUtcDateOnlyIso(value: Date): string {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0)).toISOString();
  }

  function parsePaymentLedgerNote(note: string | null | undefined): { description: string | null; reference: string | null } {
    if (!note) {
      return { description: null, reference: null };
    }

    const parts = note
      .split(" | ")
      .map((x) => x.trim())
      .filter(Boolean);

    let reference: string | null = null;
    let description: string | null = null;
    const freeText: string[] = [];

    for (const part of parts) {
      const upper = part.toUpperCase();

      if (upper.startsWith("BANK_REF:")) {
        reference = part.slice(part.indexOf(":") + 1).trim() || null;
        continue;
      }
      if (upper.startsWith("REF:")) {
        reference = reference ?? (part.slice(part.indexOf(":") + 1).trim() || null);
        continue;
      }
      if (upper.startsWith("BANK_DESC:")) {
        description = part.slice(part.indexOf(":") + 1).trim() || null;
        continue;
      }

      if (
        upper.startsWith("DOOR:") ||
        upper.startsWith("PAYMENT_UPLOAD:") ||
        upper.startsWith("UNAPPLIED:") ||
        upper.startsWith("CARRY_FORWARD:") ||
        upper.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)
      ) {
        continue;
      }

      freeText.push(part);
    }

    return {
      description: description ?? (freeText.length > 0 ? freeText.join(" | ") : null),
      reference,
    };
  }

  const [
    incomeBeforeYearAgg,
    expenseBeforeYearAgg,
    openingBeforeYearAgg,
    openingInYearAgg,
    paymentsInYearRaw,
    expensesInYearRaw,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        paidAt: { lt: yearStart },
        NOT: {
          note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
        },
      },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        spentAt: { lt: yearStart },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
        paidAt: { lt: yearStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX },
        paidAt: { gte: yearStart, lt: yearEndExclusive },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.findMany({
      where: {
        method: PaymentMethod.BANK_TRANSFER,
        paidAt: { gte: yearStart, lt: yearEndExclusive },
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.expense.findMany({
      where: {
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        spentAt: { gte: yearStart, lt: yearEndExclusive },
      },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        description: true,
        reference: true,
        expenseItem: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ spentAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const openingBeforeYear = Number(openingBeforeYearAgg._sum.totalAmount ?? 0);
  const openingInYear = Number(openingInYearAgg._sum.totalAmount ?? 0);
  const openingBalanceForYear = Number((openingBeforeYear + openingInYear).toFixed(2));

  const previousIncomeTotal = Number(incomeBeforeYearAgg._sum.totalAmount ?? 0);
  const previousExpenseTotal = Number(expenseBeforeYearAgg._sum.amount ?? 0);

  const paymentsInYear = paymentsInYearRaw
    .filter((row) => !row.note?.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX))
    .map((row) => {
      const parsedNote = parsePaymentLedgerNote(row.note);
      return {
        id: row.id,
        date: row.paidAt,
        amount: Number(row.totalAmount),
        description: parsedNote.description ?? "Odeme",
        reference: parsedNote.reference,
      };
    });

  const expensesInYear = expensesInYearRaw.map((row) => ({
    id: row.id,
    date: row.spentAt,
    amount: Number(row.amount),
    description: row.description ?? row.expenseItem.name,
    reference: row.reference,
  }));

  let incomeRunningYear = 0;
  let expenseRunningYear = 0;
  const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const months = monthNumbers.map((month) => {
    const monthIncomeRows = paymentsInYear
      .filter((row) => row.date.getUTCMonth() + 1 === month)
      .map((row, idx) => ({
        seqNo: idx + 1,
        id: row.id,
        date: toUtcDateOnlyIso(row.date),
        description: row.description,
        reference: row.reference,
        amount: Number(row.amount.toFixed(2)),
      }));

    const monthExpenseRows = expensesInYear
      .filter((row) => row.date.getUTCMonth() + 1 === month)
      .map((row, idx) => ({
        seqNo: idx + 1,
        id: row.id,
        date: toUtcDateOnlyIso(row.date),
        description: row.description,
        reference: row.reference,
        amount: Number(row.amount.toFixed(2)),
      }));

    const monthIncomeTotal = Number(monthIncomeRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
    const monthExpenseTotal = Number(monthExpenseRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));

    const incomeCarryInTotal = Number((previousIncomeTotal + incomeRunningYear).toFixed(2));
    const expenseCarryInTotal = Number((previousExpenseTotal + expenseRunningYear).toFixed(2));

    incomeRunningYear = Number((incomeRunningYear + monthIncomeTotal).toFixed(2));
    expenseRunningYear = Number((expenseRunningYear + monthExpenseTotal).toFixed(2));

    const incomeCumulativeTotal = Number((previousIncomeTotal + incomeRunningYear).toFixed(2));
    const expenseCumulativeTotal = Number((previousExpenseTotal + expenseRunningYear).toFixed(2));

    const monthNet = Number((monthIncomeTotal - monthExpenseTotal).toFixed(2));
    const closingBankBalance = Number((openingBalanceForYear + incomeRunningYear - expenseRunningYear).toFixed(2));

    return {
      month,
      incomeRows: monthIncomeRows,
      expenseRows: monthExpenseRows,
      incomeMonthTotal: monthIncomeTotal,
      expenseMonthTotal: monthExpenseTotal,
      incomeCarryInTotal,
      expenseCarryInTotal,
      incomeCumulativeTotal,
      expenseCumulativeTotal,
      monthNet,
      closingBankBalance,
    };
  });

  const incomeYearTotal = Number(incomeRunningYear.toFixed(2));
  const expenseYearTotal = Number(expenseRunningYear.toFixed(2));
  const yearNet = Number((incomeYearTotal - expenseYearTotal).toFixed(2));
  const yearEndBankBalance = Number((openingBalanceForYear + incomeYearTotal - expenseYearTotal).toFixed(2));

  return res.json({
    snapshotAt: new Date(),
    criteria: {
      year,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    },
    opening: {
      openingBalance: openingBalanceForYear,
      previousIncomeTotal: Number(previousIncomeTotal.toFixed(2)),
      previousExpenseTotal: Number(previousExpenseTotal.toFixed(2)),
      openingBeforeYear: Number(openingBeforeYear.toFixed(2)),
      openingInYear: Number(openingInYear.toFixed(2)),
    },
    totals: {
      incomeYearTotal,
      expenseYearTotal,
      yearNet,
      yearEndBankBalance,
    },
    months,
  });
});

router.get("/reports/charge-consistency", async (req, res) => {
  const querySchema = z.object({
    periodYear: z.coerce.number().int().min(2000).max(2100),
    periodMonths: z.string().optional(),
    chargeTypeId: z.string().optional(),
    apartmentType: z.nativeEnum(ApartmentType).optional(),
    expectedBuyukAmount: z.coerce.number().nonnegative().optional(),
    expectedKucukAmount: z.coerce.number().nonnegative().optional(),
    requireMonthEndDueDate: z.enum(["YES", "NO"]).optional(),
    includeMissing: z.enum(["YES", "NO"]).optional(),
    limit: z.coerce.number().int().min(1).max(5000).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const {
    periodYear,
    periodMonths,
    chargeTypeId,
    apartmentType,
    expectedBuyukAmount,
    expectedKucukAmount,
    requireMonthEndDueDate,
    includeMissing,
    limit,
  } = parsed.data;

  const selectedChargeType = chargeTypeId
    ? await prisma.chargeTypeDefinition.findUnique({
        where: { id: chargeTypeId },
        select: { id: true, code: true, name: true },
      })
    : null;
  if (chargeTypeId && !selectedChargeType) {
    return res.status(404).json({ message: "Tahakkuk tipi bulunamadi" });
  }

  const months = (periodMonths ?? "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x >= 1 && x <= 12);
  const effectiveMonths = [...new Set(months)].sort((a, b) => a - b);
  if (effectiveMonths.length === 0) {
    return res.status(400).json({ message: "Provide periodMonths with values 1..12" });
  }

  const targetApartments = await prisma.apartment.findMany({
    where: apartmentType ? { type: apartmentType } : undefined,
    select: {
      id: true,
      doorNo: true,
      type: true,
      hasAidat: true,
      hasDogalgaz: true,
      ownerFullName: true,
      apartmentDuty: { select: { name: true } },
      users: {
        where: { role: UserRole.RESIDENT },
        select: { fullName: true },
        orderBy: [{ fullName: "asc" }],
      },
      block: { select: { name: true } },
    },
    orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
  });

  if (targetApartments.length === 0) {
    return res.json({
      snapshotAt: new Date(),
      criteria: {
        periodYear,
        periodMonths: effectiveMonths,
        chargeTypeId: chargeTypeId ?? null,
        apartmentType: apartmentType ?? null,
      },
      totals: {
        totalApartmentCount: 0,
        targetApartmentCount: 0,
        excludedApartmentCount: 0,
        scannedChargeCount: 0,
        warningCount: 0,
        byCode: {},
      },
      excludedApartments: [],
      rows: [],
    });
  }

  const restrictedChargeType = getRestrictedChargeTypeCode(selectedChargeType?.code);
  const eligibleApartments = restrictedChargeType
    ? targetApartments.filter((apartment) => !isApartmentExemptForChargeType(apartment, restrictedChargeType))
    : targetApartments;
  const exemptApartments = restrictedChargeType
    ? targetApartments.filter((apartment) => isApartmentExemptForChargeType(apartment, restrictedChargeType))
    : [];
  const eligibleApartmentIds = new Set(eligibleApartments.map((x) => x.id));
  const excludedApartments = exemptApartments.map((apartment) => ({
    apartmentId: apartment.id,
    blockName: apartment.block.name,
    apartmentDoorNo: apartment.doorNo,
    apartmentType: apartment.type,
    apartmentDutyName: apartment.apartmentDuty?.name ?? null,
    reason:
      restrictedChargeType === "AIDAT"
        ? "Aidat gorevi kapali (hasAidat=false)"
        : "Dogalgaz gorevi kapali (hasDogalgaz=false)",
  }));

  const charges = await prisma.charge.findMany({
    where: {
      apartmentId: { in: targetApartments.map((x) => x.id) },
      periodYear,
      periodMonth: { in: effectiveMonths },
      chargeTypeId: chargeTypeId || undefined,
    },
    include: {
      chargeType: { select: { name: true } },
      apartment: {
        select: {
          id: true,
          doorNo: true,
          type: true,
          ownerFullName: true,
          users: {
            where: { role: UserRole.RESIDENT },
            select: { fullName: true },
            orderBy: [{ fullName: "asc" }],
          },
          block: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { apartment: { block: { name: "asc" } } },
      { apartment: { doorNo: "asc" } },
      { periodMonth: "asc" },
      { createdAt: "asc" },
    ],
  });

  const grouped = new Map<string, typeof charges>();
  const groupedChargeTypeIdsByApartmentMonth = new Map<string, Set<string>>();
  for (const charge of charges) {
    const key = `${charge.apartmentId}|${charge.periodMonth}|${charge.chargeTypeId}`;
    const apartmentMonthKey = `${charge.apartmentId}|${charge.periodMonth}`;

    const existingTypeSet = groupedChargeTypeIdsByApartmentMonth.get(apartmentMonthKey) ?? new Set<string>();
    existingTypeSet.add(charge.chargeTypeId);
    groupedChargeTypeIdsByApartmentMonth.set(apartmentMonthKey, existingTypeSet);

    const rows = grouped.get(key) ?? [];
    rows.push(charge);
    grouped.set(key, rows);
  }

  function inferExpectedAmountByTypeAndMonth(type: ApartmentType, month: number, effectiveChargeTypeId: string): number | null {
    const values = charges
      .filter(
        (charge) =>
          charge.chargeTypeId === effectiveChargeTypeId &&
          charge.apartment.type === type &&
          charge.periodMonth === month &&
          eligibleApartmentIds.has(charge.apartmentId)
      )
      .map((charge) => Number(charge.amount))
      .filter((amount) => amount > 0.0001);

    if (values.length === 0) {
      return null;
    }

    const freq = new Map<string, number>();
    for (const value of values) {
      const key = value.toFixed(2);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }

    const ranked = [...freq.entries()].sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) {
        return countDiff;
      }
      return Number(b[0]) - Number(a[0]);
    });

    return Number(ranked[0][0]);
  }

  const resolvedExpectedByMonth = new Map<number, { BUYUK: number | null; KUCUK: number | null }>();
  const canCheckExpectedAmount = !!selectedChargeType;
  for (const month of effectiveMonths) {
    resolvedExpectedByMonth.set(month, {
      BUYUK:
        !canCheckExpectedAmount
          ? null
          : typeof expectedBuyukAmount === "number"
          ? expectedBuyukAmount
          : inferExpectedAmountByTypeAndMonth("BUYUK", month, selectedChargeType.id),
      KUCUK:
        !canCheckExpectedAmount
          ? null
          : typeof expectedKucukAmount === "number"
          ? expectedKucukAmount
          : inferExpectedAmountByTypeAndMonth("KUCUK", month, selectedChargeType.id),
    });
  }

  type WarningRow = {
    code:
      | "MISSING_CHARGE"
      | "DUPLICATE_CHARGE"
      | "AMOUNT_MISMATCH"
      | "DUE_DATE_NOT_MONTH_END"
      | "NONPOSITIVE_AMOUNT"
      | "EXEMPT_APARTMENT_HAS_CHARGE";
    severity: "WARN";
    message: string;
    apartmentId: string;
    blockName: string;
    apartmentDoorNo: string;
    apartmentType: ApartmentType;
    apartmentOwnerName: string | null;
    residentNames: string[];
    periodYear: number;
    periodMonth: number;
    chargeId: string | null;
    chargeTypeName: string | null;
    actualAmount: number | null;
    expectedAmount: number | null;
    actualDueDate: Date | null;
    expectedDueDate: Date | null;
  };

  const warningRows: WarningRow[] = [];
  const isRecurringChargeType = selectedChargeType?.code === "AIDAT";
  const selectedChargeTypeCode = toAsciiLower(selectedChargeType?.code ?? "");
  const selectedChargeTypeName = toAsciiLower(selectedChargeType?.name ?? "");
  const isDogalgazChargeType =
    selectedChargeTypeCode.includes("dogalgaz") ||
    selectedChargeTypeCode.includes("igdas") ||
    selectedChargeTypeName.includes("dogalgaz") ||
    selectedChargeTypeName.includes("igdas");
  const includeMissingRows = includeMissing !== "NO" && !!restrictedChargeType;
  const enforceMonthEndBase = requireMonthEndDueDate === "YES";
  const enforceMonthEnd = enforceMonthEndBase && !!selectedChargeType && isRecurringChargeType;

  if (includeMissingRows && !chargeTypeId) {
    return res.status(400).json({
      message: "Eksik tahakkuk kontrolu icin Tahakkuk Tipi secimi zorunlu",
    });
  }

  const dogalgazInvoiceMonths = new Set<number>();
  if (includeMissingRows && isDogalgazChargeType) {
    const gasExpenseItems = await prisma.expenseItemDefinition.findMany({
      where: {
        OR: [
          { code: { contains: "DOGALGAZ", mode: "insensitive" } },
          { name: { contains: "DOGALGAZ", mode: "insensitive" } },
          { code: { contains: "IGDAS", mode: "insensitive" } },
          { name: { contains: "IGDAS", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (gasExpenseItems.length > 0) {
      const gasExpenses = await prisma.expense.findMany({
        where: {
          expenseItemId: { in: gasExpenseItems.map((x) => x.id) },
          spentAt: {
            gte: new Date(Date.UTC(periodYear, 0, 1)),
            lt: new Date(Date.UTC(periodYear + 1, 0, 1)),
          },
        },
        select: { spentAt: true },
      });

      for (const expense of gasExpenses) {
        const month = expense.spentAt.getUTCMonth() + 1;
        if (effectiveMonths.includes(month)) {
          dogalgazInvoiceMonths.add(month);
        }
      }
    }
  }

  if (restrictedChargeType) {
    for (const apartment of exemptApartments) {
      for (const month of effectiveMonths) {
        const key = `${apartment.id}|${month}|${selectedChargeType?.id ?? ""}`;
        const rows = grouped.get(key) ?? [];

        for (const charge of rows) {
          const actualAmount = Number(charge.amount);
          if (actualAmount <= 0.0001) {
            continue;
          }

          warningRows.push({
            code: "EXEMPT_APARTMENT_HAS_CHARGE",
            severity: "WARN",
            message: `${restrictedChargeType} muaf dairede bu tip icin tahakkuk kaydi var.`,
            apartmentId: apartment.id,
            blockName: apartment.block.name,
            apartmentDoorNo: apartment.doorNo,
            apartmentType: apartment.type,
            apartmentOwnerName: apartment.ownerFullName,
            residentNames: apartment.users.map((u) => u.fullName),
            periodYear,
            periodMonth: month,
            chargeId: charge.id,
            chargeTypeName: charge.chargeType.name,
            actualAmount,
            expectedAmount: null,
            actualDueDate: charge.dueDate,
            expectedDueDate: null,
          });
        }
      }
    }
  }

  for (const apartment of eligibleApartments) {
    for (const month of effectiveMonths) {
      const apartmentMonthKey = `${apartment.id}|${month}`;
      const chargeTypeIdsForChecks = selectedChargeType
        ? [selectedChargeType.id]
        : [...(groupedChargeTypeIdsByApartmentMonth.get(apartmentMonthKey) ?? new Set<string>())];

      const monthExpected = resolvedExpectedByMonth.get(month) ?? { BUYUK: null, KUCUK: null };
      const expectedDueDateForMonth = enforceMonthEnd ? new Date(Date.UTC(periodYear, month, 0)) : null;
      const shouldCheckMissingForMonth =
        includeMissingRows && (!isDogalgazChargeType || dogalgazInvoiceMonths.has(month));

      for (const effectiveChargeTypeId of chargeTypeIdsForChecks) {
        const key = `${apartment.id}|${month}|${effectiveChargeTypeId}`;
        const rows = grouped.get(key) ?? [];
        const expectedAmountForApartment = apartment.type === "BUYUK" ? monthExpected.BUYUK : monthExpected.KUCUK;

        if (shouldCheckMissingForMonth && rows.length === 0) {
          warningRows.push({
            code: "MISSING_CHARGE",
            severity: "WARN",
            message: "Bu daire/ay icin tahakkuk kaydi bulunamadi.",
            apartmentId: apartment.id,
            blockName: apartment.block.name,
            apartmentDoorNo: apartment.doorNo,
            apartmentType: apartment.type,
            apartmentOwnerName: apartment.ownerFullName,
            residentNames: apartment.users.map((u) => u.fullName),
            periodYear,
            periodMonth: month,
            chargeId: null,
            chargeTypeName: selectedChargeType?.name ?? null,
            actualAmount: null,
            expectedAmount: expectedAmountForApartment,
            actualDueDate: null,
            expectedDueDate: expectedDueDateForMonth,
          });
          continue;
        }

        if (rows.length > 1) {
          warningRows.push({
            code: "DUPLICATE_CHARGE",
            severity: "WARN",
            message: `Ayni daire/ay/tip icin birden fazla tahakkuk var (${rows.length} adet).`,
            apartmentId: apartment.id,
            blockName: apartment.block.name,
            apartmentDoorNo: apartment.doorNo,
            apartmentType: apartment.type,
            apartmentOwnerName: apartment.ownerFullName,
            residentNames: apartment.users.map((u) => u.fullName),
            periodYear,
            periodMonth: month,
            chargeId: rows[0]?.id ?? null,
            chargeTypeName: rows[0]?.chargeType.name ?? null,
            actualAmount: rows[0] ? Number(rows[0].amount) : null,
            expectedAmount: expectedAmountForApartment,
            actualDueDate: rows[0]?.dueDate ?? null,
            expectedDueDate: expectedDueDateForMonth,
          });
        }

        for (const charge of rows) {
          const expectedAmount = expectedAmountForApartment;
          const actualAmount = Number(charge.amount);

          if (actualAmount <= 0.0001) {
            warningRows.push({
              code: "NONPOSITIVE_AMOUNT",
              severity: "WARN",
              message: "Tahakkuk tutari sifir veya negatif olmamali.",
              apartmentId: apartment.id,
              blockName: apartment.block.name,
              apartmentDoorNo: apartment.doorNo,
              apartmentType: apartment.type,
              apartmentOwnerName: apartment.ownerFullName,
              residentNames: charge.apartment.users.map((u) => u.fullName),
              periodYear,
              periodMonth: month,
              chargeId: charge.id,
              chargeTypeName: charge.chargeType.name,
              actualAmount,
              expectedAmount,
              actualDueDate: charge.dueDate,
              expectedDueDate: expectedDueDateForMonth,
            });
          }

          if (expectedAmount !== null && Math.abs(actualAmount - expectedAmount) > 0.0001) {
            warningRows.push({
              code: "AMOUNT_MISMATCH",
              severity: "WARN",
              message: "Tahakkuk tutari beklenen degerle uyusmuyor.",
              apartmentId: apartment.id,
              blockName: apartment.block.name,
              apartmentDoorNo: apartment.doorNo,
              apartmentType: apartment.type,
              apartmentOwnerName: apartment.ownerFullName,
              residentNames: charge.apartment.users.map((u) => u.fullName),
              periodYear,
              periodMonth: month,
              chargeId: charge.id,
              chargeTypeName: charge.chargeType.name,
              actualAmount,
              expectedAmount,
              actualDueDate: charge.dueDate,
              expectedDueDate: expectedDueDateForMonth,
            });
          }

          if (enforceMonthEnd) {
            const expectedDueDate = expectedDueDateForMonth as Date;
            const actualUtcY = charge.dueDate.getUTCFullYear();
            const actualUtcM = charge.dueDate.getUTCMonth() + 1;
            const actualUtcD = charge.dueDate.getUTCDate();
            const expectedUtcY = expectedDueDate.getUTCFullYear();
            const expectedUtcM = expectedDueDate.getUTCMonth() + 1;
            const expectedUtcD = expectedDueDate.getUTCDate();

            const isMatch = actualUtcY === expectedUtcY && actualUtcM === expectedUtcM && actualUtcD === expectedUtcD;
            if (!isMatch) {
              warningRows.push({
                code: "DUE_DATE_NOT_MONTH_END",
                severity: "WARN",
                message: "Son odeme tarihi ilgili ayin son gunu degil.",
                apartmentId: apartment.id,
                blockName: apartment.block.name,
                apartmentDoorNo: apartment.doorNo,
                apartmentType: apartment.type,
                apartmentOwnerName: apartment.ownerFullName,
                residentNames: charge.apartment.users.map((u) => u.fullName),
                periodYear,
                periodMonth: month,
                chargeId: charge.id,
                chargeTypeName: charge.chargeType.name,
                actualAmount,
                expectedAmount,
                actualDueDate: charge.dueDate,
                expectedDueDate,
              });
            }
          }
        }
      }
    }
  }

  const byCode = warningRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.code] = (acc[row.code] ?? 0) + 1;
    return acc;
  }, {});

  const effectiveLimit = limit ?? 2000;

  return res.json({
    snapshotAt: new Date(),
    criteria: {
      periodYear,
      periodMonths: effectiveMonths,
      chargeTypeId: chargeTypeId ?? null,
      apartmentType: apartmentType ?? null,
      expectedBuyukAmount: typeof expectedBuyukAmount === "number" ? expectedBuyukAmount : null,
      expectedKucukAmount: typeof expectedKucukAmount === "number" ? expectedKucukAmount : null,
      requireMonthEndDueDate: enforceMonthEnd,
      includeMissing: includeMissingRows,
    },
    totals: {
      totalApartmentCount: targetApartments.length,
      targetApartmentCount: eligibleApartments.length,
      excludedApartmentCount: excludedApartments.length,
      scannedChargeCount: charges.length,
      warningCount: warningRows.length,
      byCode,
    },
    excludedApartments,
    rows: warningRows.slice(0, effectiveLimit),
  });
});

router.get("/reports/apartment-balance-matrix", async (req, res) => {
  const querySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { year } = parsed.data;
  const snapshotAt = new Date();

  const apartments = await prisma.apartment.findMany({
    include: {
      block: { select: { name: true } },
      users: {
        where: { role: UserRole.RESIDENT },
        select: { fullName: true },
        orderBy: [{ fullName: "asc" }],
      },
    },
    orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
  });

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthEnd = new Date(Date.UTC(year, month, 0));
    return {
      month,
      monthEnd,
    };
  });

  if (apartments.length === 0) {
    return res.json({
      snapshotAt,
      criteria: { year },
      months: months.map((x) => ({
        month: x.month,
        monthEnd: x.monthEnd.toISOString(),
      })),
      totals: {
        apartmentCount: 0,
        monthlyTotals: months.map(() => 0),
        yearEndTotal: 0,
      },
      rows: [],
    });
  }

  const apartmentIds = apartments.map((x) => x.id);
  const [charges, paymentItems, overdueCharges, overduePaymentItems] = await Promise.all([
    prisma.charge.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        periodYear: year,
      },
      select: {
        id: true,
        apartmentId: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
      },
    }),
    prisma.paymentItem.findMany({
      where: {
        charge: {
          apartmentId: { in: apartmentIds },
          periodYear: year,
        },
      },
      select: {
        amount: true,
        chargeId: true,
        charge: {
          select: {
            apartmentId: true,
            periodYear: true,
            periodMonth: true,
          },
        },
      },
    }),
    prisma.charge.findMany({
      where: {
        apartmentId: { in: apartmentIds },
        dueDate: { lte: snapshotAt },
      },
      select: {
        id: true,
        apartmentId: true,
        amount: true,
      },
    }),
    prisma.paymentItem.findMany({
      where: {
        charge: {
          apartmentId: { in: apartmentIds },
          dueDate: { lte: snapshotAt },
        },
      },
      select: {
        amount: true,
        chargeId: true,
      },
    }),
  ]);

  const apartmentBalanceMap = new Map<
    string,
    {
      monthDeltas: number[];
      monthCharges: number[];
      monthPayments: number[];
    }
  >();

  for (const apartment of apartments) {
    apartmentBalanceMap.set(apartment.id, {
      monthDeltas: months.map(() => 0),
      monthCharges: months.map(() => 0),
      monthPayments: months.map(() => 0),
    });
  }

  for (const charge of charges) {
    const bucket = apartmentBalanceMap.get(charge.apartmentId);
    if (!bucket) {
      continue;
    }

    const amount = Number(charge.amount);
    if (!Number.isFinite(amount)) {
      continue;
    }

    const monthIndex = charge.periodMonth - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    bucket.monthDeltas[monthIndex] += amount;
    bucket.monthCharges[monthIndex] += amount;
  }

  for (const item of paymentItems) {
    const apartmentId = item.charge.apartmentId;
    const bucket = apartmentBalanceMap.get(apartmentId);
    if (!bucket) {
      continue;
    }

    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) {
      continue;
    }

    const monthIndex = item.charge.periodMonth - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    bucket.monthDeltas[monthIndex] -= amount;
    bucket.monthPayments[monthIndex] += amount;
  }

  const paidByOverdueChargeId = new Map<string, number>();
  for (const item of overduePaymentItems) {
    const existingPaid = paidByOverdueChargeId.get(item.chargeId) ?? 0;
    paidByOverdueChargeId.set(item.chargeId, Number((existingPaid + Number(item.amount)).toFixed(2)));
  }

  const overdueByApartmentId = new Map<string, number>();
  for (const charge of overdueCharges) {
    const paid = paidByOverdueChargeId.get(charge.id) ?? 0;
    const remaining = Number((Number(charge.amount) - paid).toFixed(2));
    if (remaining <= 0.0001) {
      continue;
    }

    const existingRemaining = overdueByApartmentId.get(charge.apartmentId) ?? 0;
    overdueByApartmentId.set(charge.apartmentId, Number((existingRemaining + remaining).toFixed(2)));
  }

  const paidByChargeId = new Map<string, number>();
  for (const item of paymentItems) {
    const chargeId = item.chargeId;
    const existingPaid = paidByChargeId.get(chargeId) ?? 0;
    paidByChargeId.set(chargeId, Number((existingPaid + Number(item.amount)).toFixed(2)));
  }

  const hasPartialByApartmentId = new Map<string, boolean>();
  for (const charge of charges) {
    const chargeAmount = Number(charge.amount);
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0.0001) {
      continue;
    }

    const paid = paidByChargeId.get(charge.id) ?? 0;
    const remaining = Number((chargeAmount - paid).toFixed(2));
    const isPartial = paid > 0.0001 && remaining > 0.0001;
    if (isPartial) {
      hasPartialByApartmentId.set(charge.apartmentId, true);
    }
  }

  const monthlyTotals = months.map(() => 0);
  const rows = apartments.map((apartment) => {
    const bucket = apartmentBalanceMap.get(apartment.id) ?? {
      monthDeltas: months.map(() => 0),
      monthCharges: months.map(() => 0),
      monthPayments: months.map(() => 0),
    };

    const monthBalances = bucket.monthDeltas.map((delta, index) => {
      const rounded = Number(Math.max(0, delta).toFixed(2));
      monthlyTotals[index] += rounded;
      return rounded;
    });

    const residents = apartment.users.map((x) => x.fullName.trim()).filter(Boolean);
    const occupant =
      residents.length > 0 ? residents.join(", ") : apartment.ownerFullName?.trim() || "-";

    const hasPartialMonth = hasPartialByApartmentId.get(apartment.id) === true;

    return {
      apartmentId: apartment.id,
      blockName: apartment.block.name,
      apartmentDoorNo: apartment.doorNo,
      occupant,
      monthBalances,
      yearEndBalance: Number((overdueByApartmentId.get(apartment.id) ?? 0).toFixed(2)),
      hasPartialMonth,
    };
  });

  const normalizedMonthlyTotals = monthlyTotals.map((total) => Number(total.toFixed(2)));

  return res.json({
    snapshotAt,
    criteria: { year },
    months: months.map((x) => ({
      month: x.month,
      monthEnd: x.monthEnd.toISOString(),
    })),
    totals: {
      apartmentCount: rows.length,
      monthlyTotals: normalizedMonthlyTotals,
      yearEndTotal: Number(
        rows.reduce((sum, row) => sum + row.yearEndBalance, 0).toFixed(2)
      ),
    },
    rows,
  });
});

router.get("/statement/all", async (_req, res) => {
  const charges = await prisma.charge.findMany({
    include: {
      apartment: true,
      chargeType: true,
      paymentItems: true,
    },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
  });

  const statement = charges.map((charge) => {
    const paidTotal = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      chargeId: charge.id,
      apartmentId: charge.apartmentId,
      apartmentDoorNo: charge.apartment.doorNo,
      apartmentOwnerName: charge.apartment.ownerFullName,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      type: charge.chargeType.name,
      description: charge.description,
      dueDate: charge.dueDate,
      amount: Number(charge.amount),
      paidTotal,
      remaining: Number(charge.amount) - paidTotal,
      status: charge.status,
    };
  });

  return res.json({ statement });
});

router.get("/apartments/:apartmentId/charges", async (req, res) => {
  const { apartmentId } = req.params;

  const charges = await prisma.charge.findMany({
    where: { apartmentId },
    include: { chargeType: true },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
  });

  return res.json(
    charges.map((charge) => ({
      id: charge.id,
      apartmentId: charge.apartmentId,
      chargeTypeId: charge.chargeTypeId,
      chargeTypeName: charge.chargeType.name,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      amount: Number(charge.amount),
      dueDate: charge.dueDate,
      description: charge.description,
      status: charge.status,
    }))
  );
});

router.put("/charges/:chargeId", async (req, res) => {
  const { chargeId } = req.params;
  const schema = z.object({
    chargeTypeId: z.string().min(1),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    amount: z.number().min(0),
    dueDate: z.string().datetime(),
    description: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.charge.findUnique({ where: { id: chargeId } });
  if (!existing) {
    return res.status(404).json({ message: "Charge not found" });
  }

  const updated = await prisma.charge.update({
    where: { id: chargeId },
    data: {
      chargeTypeId: parsed.data.chargeTypeId,
      periodYear: parsed.data.periodYear,
      periodMonth: parsed.data.periodMonth,
      amount: parsed.data.amount,
      dueDate: new Date(parsed.data.dueDate),
      description: parsed.data.description,
    },
    include: { chargeType: true },
  });

  return res.json({
    id: updated.id,
    apartmentId: updated.apartmentId,
    chargeTypeId: updated.chargeTypeId,
    chargeTypeName: updated.chargeType.name,
    periodYear: updated.periodYear,
    periodMonth: updated.periodMonth,
    amount: Number(updated.amount),
    dueDate: updated.dueDate,
    description: updated.description,
    status: updated.status,
  });
});

router.delete("/charges/:chargeId", async (req, res) => {
  const { chargeId } = req.params;

  const existing = await prisma.charge.findUnique({ where: { id: chargeId } });
  if (!existing) {
    return res.status(404).json({ message: "Charge not found" });
  }

  const paymentItemCount = await prisma.paymentItem.count({ where: { chargeId } });
  if (paymentItemCount > 0) {
    return res.status(409).json({ message: "Charge has payments and cannot be deleted", paymentItemCount });
  }

  await prisma.charge.delete({ where: { id: chargeId } });
  return res.status(204).send();
});

router.get("/apartments/:apartmentId/payment-items", async (req, res) => {
  const { apartmentId } = req.params;

  const items = await prisma.paymentItem.findMany({
    where: {
      charge: {
        apartmentId,
      },
    },
    include: {
      payment: true,
      charge: {
        include: {
          chargeType: true,
        },
      },
    },
    orderBy: [{ payment: { paidAt: "desc" } }, { id: "desc" }],
  });

  return res.json(
    items.map((item) => ({
      paymentItemId: item.id,
      paymentId: item.paymentId,
      chargeId: item.chargeId,
      chargeTypeName: item.charge.chargeType.name,
      periodYear: item.charge.periodYear,
      periodMonth: item.charge.periodMonth,
      amount: Number(item.amount),
      paidAt: item.payment.paidAt,
      method: item.payment.method,
      note: stripManualReconcileLockTag(item.payment.note),
      isReconcileLocked: hasManualReconcileLock(item.payment.note),
    }))
  );
});

router.put("/payment-items/:paymentItemId", async (req, res) => {
  const { paymentItemId } = req.params;
  const schema = z.object({
    chargeId: z.string().min(1),
    amount: z.number().positive(),
    paidAt: z.string().datetime(),
    method: z.nativeEnum(PaymentMethod),
    note: z.string().optional(),
    isReconcileLocked: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  await ensurePaymentMethodDefinitions();
  const methodDefinition = await prisma.paymentMethodDefinition.findUnique({ where: { code: parsed.data.method } });
  if (!methodDefinition || !methodDefinition.isActive) {
    return res.status(400).json({ message: "Selected payment method is not active" });
  }

  const existing = await prisma.paymentItem.findUnique({
    where: { id: paymentItemId },
    include: {
      payment: {
        select: { note: true },
      },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Payment item not found" });
  }

  const isReconcileLocked = parsed.data.isReconcileLocked ?? hasManualReconcileLock(existing.payment.note);

  const previousChargeId = existing.chargeId;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.paymentItem.update({
      where: { id: paymentItemId },
      data: {
        chargeId: parsed.data.chargeId,
        amount: parsed.data.amount,
      },
    });

    await tx.payment.update({
      where: { id: updatedItem.paymentId },
      data: {
        paidAt: new Date(parsed.data.paidAt),
        method: parsed.data.method,
        note: withManualReconcileLock(parsed.data.note, isReconcileLocked),
      },
    });

    const sum = await tx.paymentItem.aggregate({
      where: { paymentId: updatedItem.paymentId },
      _sum: { amount: true },
    });

    await tx.payment.update({
      where: { id: updatedItem.paymentId },
      data: {
        totalAmount: Number(sum._sum.amount ?? 0),
      },
    });

    return updatedItem;
  });

  await refreshChargeStatusesForIds([...new Set([previousChargeId, updated.chargeId])]);

  return res.json({ paymentItemId: updated.id, paymentId: updated.paymentId });
});

router.post("/payment-items/:paymentItemId/split", async (req, res) => {
  const { paymentItemId } = req.params;
  const schema = z.object({
    amount: z.number().positive(),
    targetChargeId: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.paymentItem.findUnique({
    where: { id: paymentItemId },
    include: {
      charge: {
        select: { id: true, apartmentId: true },
      },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Payment item not found" });
  }

  const targetCharge = await prisma.charge.findUnique({
    where: { id: parsed.data.targetChargeId },
    select: { id: true, apartmentId: true },
  });
  if (!targetCharge) {
    return res.status(404).json({ message: "Target charge not found" });
  }

  if (targetCharge.apartmentId !== existing.charge.apartmentId) {
    return res.status(400).json({ message: "Target charge must belong to same apartment" });
  }

  const splitAmount = Number(parsed.data.amount.toFixed(2));
  const existingAmount = Number(existing.amount);
  if (splitAmount <= 0 || splitAmount >= existingAmount - 0.0001) {
    return res.status(400).json({
      message: "Split amount must be greater than 0 and less than current payment item amount",
      maxSplittableAmount: Number((existingAmount - 0.01).toFixed(2)),
    });
  }

  const updatedOriginalAmount = Number((existingAmount - splitAmount).toFixed(2));
  if (updatedOriginalAmount <= 0) {
    return res.status(400).json({ message: "Invalid split amount" });
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.paymentItem.update({
      where: { id: existing.id },
      data: { amount: updatedOriginalAmount },
    });

    const createdItem = await tx.paymentItem.create({
      data: {
        paymentId: existing.paymentId,
        chargeId: targetCharge.id,
        amount: splitAmount,
      },
      select: { id: true },
    });

    const sum = await tx.paymentItem.aggregate({
      where: { paymentId: existing.paymentId },
      _sum: { amount: true },
    });

    await tx.payment.update({
      where: { id: existing.paymentId },
      data: {
        totalAmount: Number(sum._sum.amount ?? 0),
      },
    });

    return createdItem;
  });

  await refreshChargeStatusesForIds([existing.chargeId, targetCharge.id]);

  return res.status(201).json({
    originalPaymentItemId: existing.id,
    originalAmount: updatedOriginalAmount,
    splitPaymentItemId: created.id,
    splitAmount,
    targetChargeId: targetCharge.id,
  });
});

router.delete("/payment-items/:paymentItemId", async (req, res) => {
  const { paymentItemId } = req.params;

  const existing = await prisma.paymentItem.findUnique({ where: { id: paymentItemId } });
  if (!existing) {
    return res.status(404).json({ message: "Payment item not found" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentItem.delete({ where: { id: paymentItemId } });

    const remainingCount = await tx.paymentItem.count({ where: { paymentId: existing.paymentId } });
    if (remainingCount === 0) {
      await tx.payment.delete({ where: { id: existing.paymentId } });
      return;
    }

    const sum = await tx.paymentItem.aggregate({
      where: { paymentId: existing.paymentId },
      _sum: { amount: true },
    });

    await tx.payment.update({
      where: { id: existing.paymentId },
      data: {
        totalAmount: Number(sum._sum.amount ?? 0),
      },
    });
  });

  await refreshChargeStatusesForIds([existing.chargeId]);

  return res.status(204).send();
});

export async function runScheduledGmailBankSync(): Promise<void> {
  if (!config.gmailBankSync.enabled) {
    return;
  }

  try {
    const result = await runGmailBankSync();
    console.log("[gmail-bank-sync] completed", {
      scannedMessageCount: result.scannedMessageCount,
      importedBatchCount: result.importedBatchCount,
      importedPaymentCount: result.importedPaymentCount,
      importedExpenseCount: result.importedExpenseCount,
      skippedRowCount: result.skippedRowCount,
      errors: result.errors.length,
    });
  } catch (err) {
    console.error("[gmail-bank-sync] failed", err);
  }
}

export default router;

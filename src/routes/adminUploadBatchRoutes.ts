import { ImportBatchType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

function extractBankRefKeyFromPaymentNote(note: string | null): string | null {
  if (!note) {
    return null;
  }
  const match = note.match(/(?:^|\|)\s*(?:BANK_REF|REF):\s*([^|]+)/i);
  return match?.[1]?.trim().replace(/\s+/g, " ") || null;
}

/**
 * Aynı yüklemenin çoklu-daire böldüğü tahsilat satırlarının sayısı.
 * Yeni içe aktarımlarda BANK_SPLIT: ile işaretlenir; eski veride aynı batch + aynı BANK_REF iki kez ise heuristik olarak sayılır.
 */
async function computeSplitPaymentLineCounts(batchIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const id of batchIds) {
    result.set(id, 0);
  }
  if (batchIds.length === 0) {
    return result;
  }

  const payments = await prisma.payment.findMany({
    where: { importBatchId: { in: batchIds } },
    select: { importBatchId: true, note: true },
  });

  const taggedBatchIds = new Set<string>();
  const refAccum = new Map<string, Map<string, number>>();

  for (const p of payments) {
    const bid = p.importBatchId;
    if (!bid) {
      continue;
    }

    const note = p.note ?? "";
    if (note.includes("BANK_SPLIT:")) {
      taggedBatchIds.add(bid);
      result.set(bid, (result.get(bid) ?? 0) + 1);
      continue;
    }

    const ref = extractBankRefKeyFromPaymentNote(note);
    if (!ref) {
      continue;
    }
    if (!refAccum.has(bid)) {
      refAccum.set(bid, new Map());
    }
    const m = refAccum.get(bid)!;
    m.set(ref, (m.get(ref) ?? 0) + 1);
  }

  for (const bid of batchIds) {
    if (taggedBatchIds.has(bid)) {
      continue;
    }
    const m = refAccum.get(bid);
    if (!m) {
      continue;
    }
    let sum = 0;
    for (const cnt of m.values()) {
      if (cnt >= 2) {
        sum += cnt;
      }
    }
    result.set(bid, sum);
  }

  return result;
}

type UploadBatchRoutesDeps = {
  refreshChargeStatusesForIds: (chargeIds: string[]) => Promise<void>;
};

export function createAdminUploadBatchRoutes(deps: UploadBatchRoutesDeps): Router {
  const router = Router();
  const { refreshChargeStatusesForIds } = deps;
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

  const batchIds = batches.map((b) => b.id);
  const [manualReviewGroups, unclassifiedPaymentGroups, unclassifiedExpenseGroups] = batchIds.length > 0
    ? await Promise.all([
        prisma.payment.groupBy({
          by: ["importBatchId"],
          where: {
            importBatchId: { in: batchIds },
            note: { contains: "UNAPPLIED:MANUAL_REVIEW" },
          },
          _count: { _all: true },
        }),
        prisma.payment.groupBy({
          by: ["importBatchId"],
          where: {
            importBatchId: { in: batchIds },
            note: { contains: "UNCLASSIFIED_COLLECTION:" },
          },
          _count: { _all: true },
        }),
        prisma.expense.groupBy({
          by: ["importBatchId"],
          where: {
            importBatchId: { in: batchIds },
            expenseItem: { code: "SINIFLANDIRILAMAYAN_GIDERLER" },
          },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];
  const manualReviewCountMap: Record<string, number> = {};
  for (const g of manualReviewGroups) {
    if (g.importBatchId) {
      manualReviewCountMap[g.importBatchId] = g._count._all;
    }
  }
  const unclassifiedCountMap: Record<string, number> = {};
  for (const g of unclassifiedPaymentGroups) {
    if (g.importBatchId) {
      unclassifiedCountMap[g.importBatchId] = (unclassifiedCountMap[g.importBatchId] ?? 0) + g._count._all;
    }
  }
  for (const g of unclassifiedExpenseGroups) {
    if (g.importBatchId) {
      unclassifiedCountMap[g.importBatchId] = (unclassifiedCountMap[g.importBatchId] ?? 0) + g._count._all;
    }
  }

  const splitPaymentLineCountMap = await computeSplitPaymentLineCounts(batchIds);

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
      manualReviewCount: manualReviewCountMap[batch.id] ?? 0,
      unclassifiedCount: unclassifiedCountMap[batch.id] ?? 0,
      splitPaymentLineCount: splitPaymentLineCountMap.get(batch.id) ?? 0,
    }))
  );
});

router.get("/upload-batches/:batchId/details", async (req, res) => {
  const { batchId } = req.params;

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
      reference: extractBankRefKeyFromPaymentNote(payment.note),
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
  return router;
}

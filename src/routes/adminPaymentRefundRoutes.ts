import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  OVERPAYMENT_NOTE_PREFIX,
  extractDoorNoTagFromPaymentNote,
  normalizeDoorNoForCompare,
  withOverpaymentNote,
} from "./adminNoteUtils";
import {
  PAYMENT_REFUND_EXPENSE_ITEM_CODE,
  PAYMENT_REFUND_EXPENSE_ITEM_NAME,
  PAYMENT_REFUND_NOTE_PREFIX,
  UNCLASSIFIED_EXPENSE_ITEM_CODE,
  buildPaymentRefundExpenseDescription,
  isPaymentRefundExpenseDescription,
  parseDoorNosInput,
  parsePaymentRefundDoorsFromText,
  planRefundReductions,
  type RefundReduction,
  type RefundSource,
} from "../utils/paymentRefund";
import { fromCents, toCents } from "../utils/money";

type RefreshChargeStatuses = (
  chargeIds: string[],
  client?: Prisma.TransactionClient
) => Promise<void>;

type PushActionLog = (input: {
  actionType: "EDIT";
  entityType: "EXPENSE";
  entityId: string;
  actorUserId: string | null;
  before: unknown;
  after: unknown;
  undoKind: null;
  undoPayload: null;
  undoable?: boolean;
}) => Promise<unknown>;

/** Transaction icinde 400 ile donmesi gereken is kurali hatalari. */
class PaymentRefundConflictError extends Error {}

type ApartmentMatch = {
  id: string;
  doorNo: string;
  blockName: string;
  ownerFullName: string | null;
};

async function ensurePaymentRefundExpenseItemId(): Promise<string> {
  const item = await prisma.expenseItemDefinition.upsert({
    where: { code: PAYMENT_REFUND_EXPENSE_ITEM_CODE },
    update: { name: PAYMENT_REFUND_EXPENSE_ITEM_NAME, isActive: true },
    create: {
      code: PAYMENT_REFUND_EXPENSE_ITEM_CODE,
      name: PAYMENT_REFUND_EXPENSE_ITEM_NAME,
      isActive: true,
    },
  });
  return item.id;
}

async function findApartmentsByDoorNos(doorNoRaws: string[]): Promise<{
  matched: ApartmentMatch[];
  missing: string[];
}> {
  const normalizedInputs = [
    ...new Set(doorNoRaws.map((door) => normalizeDoorNoForCompare(door)).filter(Boolean)),
  ];
  if (normalizedInputs.length === 0) {
    return { matched: [], missing: doorNoRaws };
  }

  const apartments = await prisma.apartment.findMany({
    select: {
      id: true,
      doorNo: true,
      ownerFullName: true,
      block: { select: { name: true } },
    },
  });

  const byNormalized = new Map(
    apartments.map((apt) => [
      normalizeDoorNoForCompare(apt.doorNo),
      {
        id: apt.id,
        doorNo: apt.doorNo,
        blockName: apt.block.name,
        ownerFullName: apt.ownerFullName,
      } satisfies ApartmentMatch,
    ])
  );

  const matched: ApartmentMatch[] = [];
  const missing: string[] = [];
  for (const input of normalizedInputs) {
    const found = byNormalized.get(input);
    if (found) {
      matched.push(found);
    } else {
      missing.push(input);
    }
  }

  return { matched, missing };
}

function buildEqualAllocations(
  apartments: ApartmentMatch[],
  refundCents: number
): Array<{ doorNo: string; amount: number }> {
  const base = Math.floor(refundCents / apartments.length);
  return apartments.map((apt, index) => ({
    doorNo: apt.doorNo,
    amount: fromCents(index === 0 ? refundCents - base * (apartments.length - 1) : base),
  }));
}

type RefundPaymentSnapshot = {
  id: string;
  totalCents: number;
  note: string | null;
  itemsTotalCents: number;
};

/**
 * Bir dairenin iade kaynaklarini en yeni odemeden baslayarak toplar.
 *
 * Once tahakkuga yazilmamis fazlalar (bekleyen daire alacaklari), sonra
 * tahakkuklara yazili kalemler gelir: dagitilmamis para iade icin en dogru
 * kaynak, tahakkuk dagitimini bozmadan geri alinabiliyor.
 */
async function collectRefundSources(
  tx: Prisma.TransactionClient,
  apartment: ApartmentMatch
): Promise<{ sources: RefundSource[]; payments: Map<string, RefundPaymentSnapshot> }> {
  const rows = await tx.payment.findMany({
    where: {
      OR: [
        { itemLinks: { some: { charge: { apartmentId: apartment.id } } } },
        // Dagitilmamis alacaklar daireye yalnizca not etiketiyle bagli. Buradaki
        // filtre kaba bir on eleme ("DOOR:571" de gelir), kesin kontrol asagida.
        {
          AND: [
            { itemLinks: { none: {} } },
            { note: { contains: `DOOR:${apartment.doorNo.trim()}` } },
          ],
        },
      ],
    },
    select: {
      id: true,
      totalAmount: true,
      note: true,
      itemLinks: {
        select: {
          id: true,
          amount: true,
          chargeId: true,
          charge: { select: { apartmentId: true } },
        },
        orderBy: [{ id: "desc" }],
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  const payments = new Map<string, RefundPaymentSnapshot>();
  const credits: RefundSource[] = [];
  const items: RefundSource[] = [];

  for (const row of rows) {
    const itemsTotalCents = row.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
    const totalCents = toCents(row.totalAmount);
    payments.set(row.id, { id: row.id, totalCents, note: row.note, itemsTotalCents });

    const ownItems = row.itemLinks.filter((item) => item.charge.apartmentId === apartment.id);
    for (const item of ownItems) {
      items.push({
        kind: "ITEM",
        paymentId: row.id,
        paymentItemId: item.id,
        chargeId: item.chargeId,
        availableCents: toCents(item.amount),
      });
    }

    // Fazla tutar ancak bu daireye baglanabiliyorsa geri alinabilir: kalemleri
    // baska dairelere de dagilmis odemede fazlanin sahibi belirsizdir.
    const surplusCents = totalCents - itemsTotalCents;
    if (surplusCents <= 0) {
      continue;
    }

    const belongsToApartment =
      row.itemLinks.length === 0
        ? normalizeDoorNoForCompare(extractDoorNoTagFromPaymentNote(row.note)) ===
          normalizeDoorNoForCompare(apartment.doorNo)
        : ownItems.length === row.itemLinks.length;

    if (belongsToApartment) {
      credits.push({
        kind: "CREDIT",
        paymentId: row.id,
        paymentItemId: null,
        chargeId: null,
        availableCents: surplusCents,
      });
    }
  }

  return { sources: [...credits, ...items], payments };
}

/**
 * Planlanan dusumleri uygular.
 *
 * Odemenin `totalAmount` degeri kalemlerin toplamina esitlenmez, dusulen tutar
 * kadar azaltilir: aksi halde bekleyen daire alacagi sessizce silinir ve iade
 * tutarindan fazlasi geri alinmis gorunur.
 */
async function applyRefundReductions(
  tx: Prisma.TransactionClient,
  params: {
    reductions: RefundReduction[];
    payments: Map<string, RefundPaymentSnapshot>;
    affectedChargeIds: Set<string>;
    reducedItemIds: string[];
    deletedPaymentIds: string[];
  }
): Promise<void> {
  const { reductions, payments, affectedChargeIds, reducedItemIds, deletedPaymentIds } = params;

  const totalDeltaByPaymentId = new Map<string, number>();
  const itemDeltaByPaymentId = new Map<string, number>();

  for (const reduction of reductions) {
    totalDeltaByPaymentId.set(
      reduction.paymentId,
      (totalDeltaByPaymentId.get(reduction.paymentId) ?? 0) + reduction.reducedCents
    );

    if (reduction.kind !== "ITEM" || !reduction.paymentItemId) {
      continue;
    }

    itemDeltaByPaymentId.set(
      reduction.paymentId,
      (itemDeltaByPaymentId.get(reduction.paymentId) ?? 0) + reduction.reducedCents
    );

    if (reduction.chargeId) {
      affectedChargeIds.add(reduction.chargeId);
    }
    reducedItemIds.push(reduction.paymentItemId);

    if (reduction.reducedCents >= reduction.availableCents) {
      await tx.paymentItem.delete({ where: { id: reduction.paymentItemId } });
      continue;
    }

    await tx.paymentItem.update({
      where: { id: reduction.paymentItemId },
      data: { amount: fromCents(reduction.availableCents - reduction.reducedCents) },
    });
  }

  for (const [paymentId, deltaCents] of totalDeltaByPaymentId) {
    const snapshot = payments.get(paymentId);
    if (!snapshot) {
      continue;
    }

    const nextTotalCents = Math.max(0, snapshot.totalCents - deltaCents);
    const nextItemsTotalCents = snapshot.itemsTotalCents - (itemDeltaByPaymentId.get(paymentId) ?? 0);

    if (nextTotalCents <= 0 && nextItemsTotalCents <= 0) {
      await tx.payment.delete({ where: { id: paymentId } });
      deletedPaymentIds.push(paymentId);
      continue;
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        totalAmount: fromCents(nextTotalCents),
        // Notta yazan fazla tutar etiketi kalan alacagi yansitmali.
        ...(snapshot.note?.includes(OVERPAYMENT_NOTE_PREFIX)
          ? {
              note: withOverpaymentNote(
                snapshot.note,
                extractDoorNoTagFromPaymentNote(snapshot.note) ?? "",
                fromCents(Math.max(0, nextTotalCents - nextItemsTotalCents))
              ),
            }
          : {}),
      },
    });
  }
}

export function createAdminPaymentRefundRoutes(deps: {
  refreshChargeStatusesForIds: RefreshChargeStatuses;
  pushActionLog: PushActionLog;
}): Router {
  const router = Router();
  const { refreshChargeStatusesForIds, pushActionLog } = deps;

  router.get("/payment-refunds/candidates", async (_req, res) => {
    const expenses = await prisma.expense.findMany({
      where: {
        expenseItem: { code: UNCLASSIFIED_EXPENSE_ITEM_CODE },
        NOT: { description: { contains: "PAYMENT_REFUND:" } },
      },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        description: true,
        reference: true,
        paymentMethod: true,
        expenseItem: { select: { id: true, code: true, name: true } },
        importBatch: { select: { kind: true, fileName: true } },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return res.json(
      expenses.map((row) => ({
        id: row.id,
        spentAt: row.spentAt.toISOString(),
        amount: Number(row.amount),
        description: row.description,
        reference: row.reference,
        paymentMethod: row.paymentMethod,
        expenseItemId: row.expenseItem.id,
        expenseItemName: row.expenseItem.name,
        sourceLabel:
          row.importBatch?.kind === "BANK_STATEMENT_UPLOAD"
            ? row.importBatch.fileName?.toLowerCase().startsWith("gmail:")
              ? "Gmail"
              : "Banka Ekstresi Upload"
            : "Manuel",
      }))
    );
  });

  router.get("/payment-refunds", async (req, res) => {
    const fromRaw = typeof req.query.from === "string" ? req.query.from : undefined;
    const toRaw = typeof req.query.to === "string" ? req.query.to : undefined;
    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      return res.status(400).json({ message: "from tarihi gecersiz" });
    }
    if (to && Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: "to tarihi gecersiz" });
    }

    const spentAtFilter =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          }
        : undefined;

    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { description: { contains: "PAYMENT_REFUND:" } },
          { expenseItem: { code: PAYMENT_REFUND_EXPENSE_ITEM_CODE } },
        ],
        ...(spentAtFilter ? { spentAt: spentAtFilter } : {}),
      },
      select: {
        id: true,
        spentAt: true,
        amount: true,
        description: true,
        reference: true,
        paymentMethod: true,
        expenseItem: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return res.json(
      expenses.map((row) => {
        const doorNos = parsePaymentRefundDoorsFromText(row.description);
        return {
          id: row.id,
          spentAt: row.spentAt.toISOString(),
          amount: Number(row.amount),
          description: row.description,
          reference: row.reference,
          paymentMethod: row.paymentMethod,
          expenseItemId: row.expenseItem.id,
          expenseItemName: row.expenseItem.name,
          doorNo: doorNos.join(", ") || null,
          doorNos,
        };
      })
    );
  });

  router.post("/payment-refunds", async (req, res) => {
    const parsed = z
      .object({
        expenseId: z.string().min(1),
        doorNo: z.string().trim().min(1).max(120),
        allocations: z
          .array(
            z.object({
              doorNo: z.string().trim().min(1),
              amount: z.number().positive(),
            })
          )
          .optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const { expenseId, doorNo } = parsed.data;
    const doorInputs = parseDoorNosInput(doorNo);
    if (doorInputs.length === 0) {
      return res.status(400).json({ message: "En az bir daire no girin (orn. 57 veya 57,93)" });
    }

    const { matched: apartments, missing } = await findApartmentsByDoorNos(doorInputs);
    if (missing.length > 0) {
      return res.status(404).json({ message: `Daire bulunamadi: ${missing.join(", ")}` });
    }
    if (apartments.length === 0) {
      return res.status(404).json({ message: `Daire bulunamadi: ${doorNo}` });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        amount: true,
        description: true,
        expenseItem: { select: { code: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ message: "Gider kaydi bulunamadi" });
    }

    if (isPaymentRefundExpenseDescription(expense.description)) {
      return res.status(400).json({ message: "Bu kayit zaten aidat iadesi olarak isaretlenmis" });
    }

    if (expense.expenseItem.code !== UNCLASSIFIED_EXPENSE_ITEM_CODE) {
      return res.status(400).json({
        message: "Sadece Siniflandirilamayan Giderler kayitlari iade olarak isaretlenebilir",
      });
    }

    const refundCents = toCents(expense.amount);
    if (refundCents <= 0) {
      return res.status(400).json({ message: "Iade tutari sifirdan buyuk olmali" });
    }
    const refundAmount = fromCents(refundCents);

    // Coklu dairede tutarin nasil bolunecegi tahmin edilemez; kullanici girer.
    const allocationCentsByApartmentId = new Map<string, number>();
    if (apartments.length === 1) {
      allocationCentsByApartmentId.set(apartments[0].id, refundCents);
    } else {
      const rows = parsed.data.allocations ?? [];
      if (rows.length === 0) {
        return res.status(400).json({
          message:
            "Coklu daire iadesinde her daire icin tutar girilmeli. Toplam iade tutarina birebir esit olmali.",
          refundAmount,
          suggestedAllocations: buildEqualAllocations(apartments, refundCents),
        });
      }

      const apartmentIdByNormalizedDoorNo = new Map(
        apartments.map((apt) => [normalizeDoorNoForCompare(apt.doorNo), apt.id])
      );

      for (const row of rows) {
        const apartmentId = apartmentIdByNormalizedDoorNo.get(normalizeDoorNoForCompare(row.doorNo));
        if (!apartmentId) {
          return res.status(400).json({
            message: `${row.doorNo} bu iadenin daireleri arasinda degil (${apartments
              .map((apt) => apt.doorNo)
              .join(", ")})`,
          });
        }
        if (allocationCentsByApartmentId.has(apartmentId)) {
          return res.status(400).json({ message: `${row.doorNo} icin iki kez tutar girilmis` });
        }
        allocationCentsByApartmentId.set(apartmentId, toCents(row.amount));
      }

      const missingAllocation = apartments.filter(
        (apt) => !allocationCentsByApartmentId.has(apt.id)
      );
      if (missingAllocation.length > 0) {
        return res.status(400).json({
          message: `Tutar girilmeyen daire: ${missingAllocation.map((apt) => apt.doorNo).join(", ")}`,
        });
      }

      const allocationTotalCents = [...allocationCentsByApartmentId.values()].reduce(
        (sum, cents) => sum + cents,
        0
      );
      if (allocationTotalCents !== refundCents) {
        return res.status(400).json({
          message: `Girilen tutarlarin toplami iade tutarina birebir esit olmali (girilen: ${fromCents(
            allocationTotalCents
          ).toFixed(2)} TL, iade: ${refundAmount.toFixed(2)} TL)`,
          allocationTotal: fromCents(allocationTotalCents),
          refundAmount,
        });
      }
    }

    const refundExpenseItemId = await ensurePaymentRefundExpenseItemId();
    const affectedChargeIds = new Set<string>();
    const reducedByApartmentId = new Map<string, number>();
    const creditReducedByApartmentId = new Map<string, number>();
    const reducedItemIds: string[] = [];
    const deletedPaymentIds: string[] = [];

    try {
      await prisma.$transaction(
        async (tx) => {
          affectedChargeIds.clear();
          reducedByApartmentId.clear();
          creditReducedByApartmentId.clear();
          reducedItemIds.length = 0;
          deletedPaymentIds.length = 0;

          // Once gideri atomik olarak "iade" diye isaretle. Ayni anda gelen ikinci
          // istek (cift tiklama, retry) bu kosula takilir; tahsilat iki kez dusulmez.
          const claimed = await tx.expense.updateMany({
            where: {
              id: expense.id,
              expenseItemId: { not: refundExpenseItemId },
              NOT: { description: { contains: PAYMENT_REFUND_NOTE_PREFIX } },
            },
            data: {
              expenseItemId: refundExpenseItemId,
              description: buildPaymentRefundExpenseDescription({
                doorNos: apartments.map((apt) => apt.doorNo),
                description: expense.description,
              }),
            },
          });

          if (claimed.count === 0) {
            throw new PaymentRefundConflictError(
              "Bu kayit zaten aidat iadesi olarak isaretlenmis"
            );
          }

          for (const apartment of apartments) {
            const targetCents = allocationCentsByApartmentId.get(apartment.id) ?? 0;
            if (targetCents <= 0) {
              continue;
            }

            // Kaynaklar transaction icinde okunur: on kontrol ile bu an arasinda
            // baska bir islem tahsilatlari degistirmis olabilir.
            const { sources, payments } = await collectRefundSources(tx, apartment);
            const availableCents = sources.reduce((sum, source) => sum + source.availableCents, 0);
            if (availableCents < targetCents) {
              throw new PaymentRefundConflictError(
                `${apartment.blockName}/${apartment.doorNo} dairesinde geri alinacak yeterli tahsilat yok ` +
                  `(mevcut: ${fromCents(availableCents).toFixed(2)} TL, istenen: ${fromCents(
                    targetCents
                  ).toFixed(2)} TL)`
              );
            }

            const { reductions, shortfallCents } = planRefundReductions(targetCents, sources);
            if (shortfallCents > 0) {
              throw new PaymentRefundConflictError(
                `${apartment.blockName}/${apartment.doorNo} dairesinde iade uygulanamadi: ` +
                  `kalan tutar ${fromCents(shortfallCents).toFixed(2)} TL`
              );
            }

            await applyRefundReductions(tx, {
              reductions,
              payments,
              affectedChargeIds,
              reducedItemIds,
              deletedPaymentIds,
            });

            const creditCents = reductions
              .filter((row) => row.kind === "CREDIT")
              .reduce((sum, row) => sum + row.reducedCents, 0);
            reducedByApartmentId.set(apartment.id, fromCents(targetCents));
            creditReducedByApartmentId.set(apartment.id, fromCents(creditCents));
          }

          // Tahakkuk durumlari da ayni transaction icinde guncellenir; boylece
          // tahsilat dusuldugu halde durum eski kalan bir ara durum olusmaz.
          await refreshChargeStatusesForIds([...affectedChargeIds], tx);
        },
        { timeout: 30000 }
      );
    } catch (error) {
      if (error instanceof PaymentRefundConflictError) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }

    const apartmentBreakdown = apartments.map((apt) => ({
      apartmentId: apt.id,
      doorNo: apt.doorNo,
      apartmentLabel: `${apt.blockName}/${apt.doorNo}${
        apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""
      }`,
      reducedAmount: reducedByApartmentId.get(apt.id) ?? 0,
      reducedFromPendingCredit: creditReducedByApartmentId.get(apt.id) ?? 0,
    }));

    // Iade geri alinabilir bir islem degil; en azindan kimin neyi dusurdugu
    // izlenebilsin diye kayit birakiyoruz.
    await pushActionLog({
      actionType: "EDIT",
      entityType: "EXPENSE",
      entityId: expense.id,
      actorUserId: req.user?.userId ?? null,
      before: {
        expenseItemCode: UNCLASSIFIED_EXPENSE_ITEM_CODE,
        description: expense.description,
        amount: refundAmount,
      },
      after: {
        expenseItemCode: PAYMENT_REFUND_EXPENSE_ITEM_CODE,
        doorNos: apartments.map((apt) => apt.doorNo),
        apartmentBreakdown,
        refundAmount,
        reducedPaymentItemIds: reducedItemIds,
        deletedPaymentIds,
        affectedChargeIds: [...affectedChargeIds],
      },
      undoKind: null,
      undoPayload: null,
      undoable: false,
    }).catch((error) => {
      console.error("[payment-refund] audit log yazilamadi", error);
    });

    return res.json({
      ok: true,
      expenseId: expense.id,
      doorNos: apartments.map((apt) => apt.doorNo),
      apartmentLabel: apartmentBreakdown.map((row) => row.apartmentLabel).join(" + "),
      apartmentBreakdown,
      refundAmount,
      reducedPaymentItemCount: reducedItemIds.length,
      deletedPaymentCount: deletedPaymentIds.length,
      affectedChargeCount: affectedChargeIds.size,
    });
  });

  return router;
}

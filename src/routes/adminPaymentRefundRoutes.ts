import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { normalizeDoorNoForCompare } from "./adminNoteUtils";
import {
  PAYMENT_REFUND_EXPENSE_ITEM_CODE,
  PAYMENT_REFUND_EXPENSE_ITEM_NAME,
  UNCLASSIFIED_EXPENSE_ITEM_CODE,
  buildPaymentRefundExpenseDescription,
  isPaymentRefundExpenseDescription,
  parseDoorNosInput,
  parsePaymentRefundDoorsFromText,
} from "../utils/paymentRefund";

type RefreshChargeStatuses = (chargeIds: string[]) => Promise<void>;

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

export function createAdminPaymentRefundRoutes(deps: {
  refreshChargeStatusesForIds: RefreshChargeStatuses;
}): Router {
  const router = Router();
  const { refreshChargeStatusesForIds } = deps;

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

    const refundAmount = Number(Number(expense.amount).toFixed(2));
    if (!(refundAmount > 0)) {
      return res.status(400).json({ message: "Iade tutari sifirdan buyuk olmali" });
    }

    const apartmentIds = apartments.map((apt) => apt.id);
    const paymentItems = await prisma.paymentItem.findMany({
      where: { charge: { apartmentId: { in: apartmentIds } } },
      select: {
        id: true,
        amount: true,
        chargeId: true,
        paymentId: true,
        charge: { select: { apartmentId: true } },
        payment: { select: { id: true, paidAt: true, createdAt: true } },
      },
      orderBy: [{ payment: { paidAt: "desc" } }, { payment: { createdAt: "desc" } }, { id: "desc" }],
    });

    const availableTotal = Number(
      paymentItems.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)
    );

    if (availableTotal + 0.0001 < refundAmount) {
      const doorLabel = apartments.map((apt) => apt.doorNo).join(", ");
      return res.status(400).json({
        message: `Secilen dairelerde (${doorLabel}) geri alinacak ${availableTotal.toFixed(2)} TL tahsilat var (iade: ${refundAmount.toFixed(2)} TL)`,
        availableTotal,
        refundAmount,
      });
    }

    const refundExpenseItemId = await ensurePaymentRefundExpenseItemId();
    const affectedChargeIds = new Set<string>();
    const reducedByApartmentId = new Map<string, number>();
    let remaining = refundAmount;
    const reducedItemIds: string[] = [];
    const deletedPaymentIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of paymentItems) {
        if (remaining <= 0.0001) {
          break;
        }

        const itemAmount = Number(item.amount);
        affectedChargeIds.add(item.chargeId);
        const apartmentId = item.charge.apartmentId;

        if (itemAmount <= remaining + 0.0001) {
          await tx.paymentItem.delete({ where: { id: item.id } });
          remaining = Number((remaining - itemAmount).toFixed(2));
          reducedItemIds.push(item.id);
          reducedByApartmentId.set(
            apartmentId,
            Number(((reducedByApartmentId.get(apartmentId) ?? 0) + itemAmount).toFixed(2))
          );

          const remainingCount = await tx.paymentItem.count({ where: { paymentId: item.paymentId } });
          if (remainingCount === 0) {
            await tx.payment.delete({ where: { id: item.paymentId } });
            deletedPaymentIds.push(item.paymentId);
          } else {
            const sum = await tx.paymentItem.aggregate({
              where: { paymentId: item.paymentId },
              _sum: { amount: true },
            });
            await tx.payment.update({
              where: { id: item.paymentId },
              data: { totalAmount: Number(sum._sum.amount ?? 0) },
            });
          }
          continue;
        }

        const nextAmount = Number((itemAmount - remaining).toFixed(2));
        await tx.paymentItem.update({
          where: { id: item.id },
          data: { amount: nextAmount },
        });
        reducedItemIds.push(item.id);
        reducedByApartmentId.set(
          apartmentId,
          Number(((reducedByApartmentId.get(apartmentId) ?? 0) + remaining).toFixed(2))
        );

        const sum = await tx.paymentItem.aggregate({
          where: { paymentId: item.paymentId },
          _sum: { amount: true },
        });
        await tx.payment.update({
          where: { id: item.paymentId },
          data: { totalAmount: Number(sum._sum.amount ?? 0) },
        });
        remaining = 0;
      }

      if (remaining > 0.0001) {
        throw new Error(
          `Iade uygulanamadi: kalan tutar ${remaining.toFixed(2)} TL (beklenmeyen durum)`
        );
      }

      await tx.expense.update({
        where: { id: expense.id },
        data: {
          expenseItemId: refundExpenseItemId,
          description: buildPaymentRefundExpenseDescription({
            doorNos: apartments.map((apt) => apt.doorNo),
            description: expense.description,
          }),
        },
      });
    });

    await refreshChargeStatusesForIds([...affectedChargeIds]);

    const apartmentBreakdown = apartments.map((apt) => ({
      apartmentId: apt.id,
      doorNo: apt.doorNo,
      apartmentLabel: `${apt.blockName}/${apt.doorNo}${
        apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""
      }`,
      reducedAmount: reducedByApartmentId.get(apt.id) ?? 0,
    }));

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

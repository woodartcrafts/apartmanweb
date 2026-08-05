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
  parsePaymentRefundDoorFromText,
} from "../utils/paymentRefund";

type RefreshChargeStatuses = (chargeIds: string[]) => Promise<void>;

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

async function findApartmentByDoorNo(doorNoRaw: string) {
  const normalizedInput = normalizeDoorNoForCompare(doorNoRaw);
  if (!normalizedInput) {
    return null;
  }

  const apartments = await prisma.apartment.findMany({
    select: {
      id: true,
      doorNo: true,
      ownerFullName: true,
      block: { select: { name: true } },
    },
  });

  const match = apartments.find((apt) => normalizeDoorNoForCompare(apt.doorNo) === normalizedInput);
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    doorNo: match.doorNo,
    blockName: match.block.name,
    ownerFullName: match.ownerFullName,
  };
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
      expenses.map((row) => ({
        id: row.id,
        spentAt: row.spentAt.toISOString(),
        amount: Number(row.amount),
        description: row.description,
        reference: row.reference,
        paymentMethod: row.paymentMethod,
        expenseItemId: row.expenseItem.id,
        expenseItemName: row.expenseItem.name,
        doorNo: parsePaymentRefundDoorFromText(row.description),
      }))
    );
  });

  router.post("/payment-refunds", async (req, res) => {
    const parsed = z
      .object({
        expenseId: z.string().min(1),
        doorNo: z.string().trim().min(1).max(32),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const { expenseId, doorNo } = parsed.data;
    const apartment = await findApartmentByDoorNo(doorNo);
    if (!apartment) {
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

    const paymentItems = await prisma.paymentItem.findMany({
      where: { charge: { apartmentId: apartment.id } },
      select: {
        id: true,
        amount: true,
        chargeId: true,
        paymentId: true,
        payment: { select: { id: true, paidAt: true, createdAt: true } },
      },
      orderBy: [{ payment: { paidAt: "desc" } }, { payment: { createdAt: "desc" } }, { id: "desc" }],
    });

    const availableTotal = Number(
      paymentItems.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)
    );

    if (availableTotal + 0.0001 < refundAmount) {
      return res.status(400).json({
        message: `Bu dairede geri alinacak ${availableTotal.toFixed(2)} TL tahsilat var (iade: ${refundAmount.toFixed(2)} TL)`,
        availableTotal,
        refundAmount,
      });
    }

    const refundExpenseItemId = await ensurePaymentRefundExpenseItemId();
    const affectedChargeIds = new Set<string>();
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

        if (itemAmount <= remaining + 0.0001) {
          await tx.paymentItem.delete({ where: { id: item.id } });
          remaining = Number((remaining - itemAmount).toFixed(2));
          reducedItemIds.push(item.id);

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
            doorNo: apartment.doorNo,
            description: expense.description,
          }),
        },
      });
    });

    await refreshChargeStatusesForIds([...affectedChargeIds]);

    return res.json({
      ok: true,
      expenseId: expense.id,
      apartmentId: apartment.id,
      doorNo: apartment.doorNo,
      apartmentLabel: `${apartment.blockName}/${apartment.doorNo}${
        apartment.ownerFullName ? ` - ${apartment.ownerFullName}` : ""
      }`,
      refundAmount,
      reducedPaymentItemCount: reducedItemIds.length,
      deletedPaymentCount: deletedPaymentIds.length,
      affectedChargeCount: affectedChargeIds.size,
    });
  });

  return router;
}

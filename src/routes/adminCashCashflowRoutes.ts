import { PaymentMethod } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { buildDateRangeFilter } from "../utils/dateRange";
import {
  OPENING_BALANCE_PAYMENT_NOTE_PREFIX,
  computeOperatingBankBalanceSnapshot,
  isExcludedFromBankCashInNote,
} from "../utils/operatingBankBalance";
import {
  extractDoorNoTagFromPaymentNote,
  parsePaymentNoteParts,
} from "./adminNoteUtils";

const ROW_LIMIT = 2000;

function readHumanDescriptionFromPaymentNote(note: string | null): string | null {
  if (!note) {
    return null;
  }

  const parts = parsePaymentNoteParts(note);
  const bankDesc = parts.find((part) => part.startsWith("BANK_DESC:"));
  if (bankDesc) {
    return bankDesc.slice("BANK_DESC:".length).trim() || null;
  }

  const freeText = parts.filter(
    (part) =>
      !part.includes(":") ||
      (!part.startsWith("BANK_REF:") &&
        !part.startsWith("REF:") &&
        !part.startsWith("DOOR:") &&
        !part.startsWith("AUTO_MATCH:") &&
        !part.startsWith("UNAPPLIED:") &&
        !part.startsWith("REFUNDED:") &&
        !part.startsWith("BANK_SPLIT:") &&
        !part.startsWith("SPLIT_DISMISSED:") &&
        !part.startsWith("PAYMENT_UPLOAD:") &&
        !part.startsWith("RECONCILE_LOCK:") &&
        !part.startsWith("OPENING:"))
  );

  return freeText.join(" | ").trim() || null;
}

/** Acilis / devir gibi nakit kasaya dusmeyen sistem kayitlari. */
function isExcludedFromCashCollections(note: string | null): boolean {
  if (!note) {
    return false;
  }
  if (note.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)) {
    return true;
  }
  return isExcludedFromBankCashInNote(note);
}

export function createAdminCashCashflowRoutes(): Router {
  const router = Router();

  router.get("/reports/cash-cashflow", async (req, res) => {
    const parsed = z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.coerce.number().int().min(1).max(ROW_LIMIT).default(ROW_LIMIT),
      })
      .safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
    }

    const { from, to, limit } = parsed.data;
    const paidAt = buildDateRangeFilter(from, to);
    const spentAt = buildDateRangeFilter(from, to);

    const [cashPayments, cashExpenses, bankBalance] = await Promise.all([
      prisma.payment.findMany({
        where: {
          method: PaymentMethod.CASH,
          paidAt,
        },
        select: {
          id: true,
          paidAt: true,
          totalAmount: true,
          note: true,
          createdAt: true,
          createdById: true,
          itemLinks: {
            select: {
              amount: true,
              charge: {
                select: {
                  id: true,
                  periodYear: true,
                  periodMonth: true,
                  chargeType: { select: { name: true } },
                  apartment: {
                    select: {
                      id: true,
                      doorNo: true,
                      ownerFullName: true,
                      block: { select: { name: true } },
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
          paymentMethod: PaymentMethod.CASH,
          spentAt,
        },
        select: {
          id: true,
          spentAt: true,
          amount: true,
          description: true,
          reference: true,
          createdAt: true,
          createdById: true,
          expenseItem: { select: { id: true, name: true } },
        },
        orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
        take: limit,
      }),
      computeOperatingBankBalanceSnapshot(),
    ]);

    const creatorIds = [
      ...new Set(
        [...cashPayments.map((p) => p.createdById), ...cashExpenses.map((e) => e.createdById)].filter(
          (id): id is string => Boolean(id)
        )
      ),
    ];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const creatorById = new Map(creators.map((user) => [user.id, user]));

    const collectionRows = cashPayments
      .filter((payment) => !isExcludedFromCashCollections(payment.note))
      .map((payment) => {
        const apartments = [
          ...new Map(
            payment.itemLinks
              .map((link) => link.charge.apartment)
              .map((apt) => [
                apt.id,
                {
                  apartmentId: apt.id,
                  doorNo: apt.doorNo,
                  label: `${apt.block.name}/${apt.doorNo}${
                    apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""
                  }`,
                },
              ])
          ).values(),
        ];

        const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
        const allocations = payment.itemLinks.map((link) => ({
          chargeId: link.charge.id,
          amount: Number(link.amount),
          periodYear: link.charge.periodYear,
          periodMonth: link.charge.periodMonth,
          chargeTypeName: link.charge.chargeType.name,
          apartmentLabel: `${link.charge.apartment.block.name}/${link.charge.apartment.doorNo}`,
        }));

        const creator = payment.createdById ? creatorById.get(payment.createdById) : null;

        return {
          id: payment.id,
          paidAt: payment.paidAt,
          amount: Number(payment.totalAmount),
          allocatedAmount: Number(
            payment.itemLinks.reduce((sum, link) => sum + Number(link.amount), 0).toFixed(2)
          ),
          doorNo: doorTag,
          apartments,
          description: readHumanDescriptionFromPaymentNote(payment.note),
          allocations,
          createdByName: creator?.fullName ?? creator?.email ?? null,
        };
      });

    const expenseRows = cashExpenses.map((expense) => {
      const creator = expense.createdById ? creatorById.get(expense.createdById) : null;
      return {
        id: expense.id,
        spentAt: expense.spentAt,
        amount: Number(expense.amount),
        expenseItemId: expense.expenseItem.id,
        expenseItemName: expense.expenseItem.name,
        description: expense.description,
        reference: expense.reference,
        createdByName: creator?.fullName ?? creator?.email ?? null,
      };
    });

    const cashInTotal = Number(
      collectionRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)
    );
    const cashOutTotal = Number(
      expenseRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)
    );

    return res.json({
      snapshotAt: new Date(),
      from: from ?? null,
      to: to ?? null,
      truncated:
        cashPayments.length >= limit || cashExpenses.length >= limit,
      cash: {
        inTotal: cashInTotal,
        outTotal: cashOutTotal,
        net: Number((cashInTotal - cashOutTotal).toFixed(2)),
        collectionCount: collectionRows.length,
        expenseCount: expenseRows.length,
        collections: collectionRows,
        expenses: expenseRows,
      },
      bankBalance: {
        openingBalance: bankBalance.openingBalance,
        bankInTotal: bankBalance.bankInTotal,
        bankOutTotal: bankBalance.bankOutTotal,
        estimatedBalance: bankBalance.estimatedBalance,
        formula: "acilis + banka girenler - banka cikanlar",
      },
    });
  });

  return router;
}

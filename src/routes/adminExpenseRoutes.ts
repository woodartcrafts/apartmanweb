import { ImportBatchType, PaymentMethod } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

type ExpenseRoutesDeps = {
  ensurePaymentMethodDefinitions: () => Promise<unknown>;
  pushActionLog: (input: unknown) => Promise<{ id: string; undoUntil: string | null }>;
  mapExpenseSnapshot: (expense: unknown) => unknown;
  extractChargeInvoiceAmount: (description: string | null | undefined) => number | null;
};

function parseMetaDateFromDescription(
  description: string | null | undefined,
  keyRegex: RegExp
): Date | null {
  if (!description) {
    return null;
  }

  const part = description
    .split("|")
    .map((x) => x.trim())
    .find((x) => keyRegex.test(x));
  if (!part) {
    return null;
  }

  const raw = part.replace(keyRegex, "").trim();
  if (!raw) {
    return null;
  }

  const isoDate = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) {
    const parsed = new Date(`${isoDate}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const trDate = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (trDate) {
    const day = Number(trDate[1]);
    const month = Number(trDate[2]);
    const year = Number(trDate[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function createAdminExpenseRoutes(deps: ExpenseRoutesDeps): Router {
  const router = Router();

  function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  }

  router.get("/expenses", async (req, res) => {
    const querySchema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      expenseItemId: z.string().optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
    }

    const { from, to, expenseItemId, paymentMethod } = parsed.data;

    const expenses = await prisma.expense.findMany({
      where: {
        spentAt:
          from || to
            ? {
                gte: from ? new Date(from) : undefined,
                lte: to ? new Date(to) : undefined,
              }
            : undefined,
        expenseItemId: expenseItemId || undefined,
        paymentMethod: paymentMethod || undefined,
      },
      include: {
        expenseItem: true,
        importBatch: {
          select: { kind: true },
        },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 1000,
    });

    return res.json(
      expenses.map((expense) => ({
        id: expense.id,
        expenseItemId: expense.expenseItemId,
        expenseItemName: expense.expenseItem.name,
        spentAt: expense.spentAt,
        amount: Number(expense.amount),
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        reference: expense.reference,
      }))
    );
  });

  router.get("/expenses/report", async (req, res) => {
    const querySchema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      source: z.enum(["MANUAL", "BANK_STATEMENT_UPLOAD", "GMAIL", "CHARGE_DISTRIBUTION"]).optional(),
      expenseItemId: z.string().min(1).optional(),
      includeDistributed: z.coerce.boolean().optional(),
    });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
    }

    const { from, to, source, expenseItemId } = parsed.data;
    const includeDistributed = parsed.data.includeDistributed ?? true;

    const rangeFilter =
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined,
          }
        : undefined;

    const expenses = await prisma.expense.findMany({
      where: {
        spentAt: rangeFilter,
        expenseItemId: expenseItemId || undefined,
      },
      include: {
        expenseItem: true,
        importBatch: {
          select: { kind: true, fileName: true },
        },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 2000,
    });

    const needDistributedRows = includeDistributed && (!source || source === "CHARGE_DISTRIBUTION");

    const expenseCharges = needDistributedRows
      ? await prisma.charge.findMany({
          where: {
            dueDate: rangeFilter,
            chargeType: {
              code: {
                not: "AIDAT",
              },
            },
          },
          include: {
            chargeType: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
          take: 5000,
        })
      : [];

    const creatorIds = [
      ...new Set([
        ...expenses.map((x) => x.createdById),
        ...expenseCharges.map((x) => x.createdByUserId),
      ].filter(Boolean)),
    ] as string[];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const creatorMap = new Map(creators.map((x) => [x.id, x]));

    function detectSource(expense: (typeof expenses)[number]): "MANUAL" | "BANK_STATEMENT_UPLOAD" | "GMAIL" {
      if (expense.importBatch?.kind === ImportBatchType.BANK_STATEMENT_UPLOAD) {
        if ((expense.importBatch.fileName ?? "").toLowerCase().startsWith("gmail:")) {
          return "GMAIL";
        }
        return "BANK_STATEMENT_UPLOAD";
      }
      return "MANUAL";
    }

    const expenseRows = expenses.map((expense) => {
      const creator = expense.createdById ? creatorMap.get(expense.createdById) : undefined;
      return {
        id: expense.id,
        expenseItemId: expense.expenseItemId,
        expenseItemName: expense.expenseItem.name,
        spentAt: expense.spentAt,
        amount: Number(expense.amount),
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        reference: expense.reference,
        createdAt: expense.createdAt,
        source: detectSource(expense),
        createdByUserId: expense.createdById,
        createdByName: creator?.fullName ?? null,
        createdByEmail: creator?.email ?? null,
      };
    });

    const groupedCharges = new Map<
      string,
      {
        id: string;
        expenseItemId: string;
        distributionChargeTypeId: string;
        periodYear: number;
        periodMonth: number;
        expenseItemName: string;
        spentAt: Date;
        distributionDueDate: Date;
        distributionInvoiceDate: Date | null;
        distributionPeriodStartDate: Date | null;
        distributionPeriodEndDate: Date | null;
        distributedTotal: number;
        invoiceAmount: number | null;
        matchDescription: string | null;
        createdAt: Date;
        createdByUserId: string | null;
        createdByName: string | null;
        createdByEmail: string | null;
      }
    >();

    for (const charge of expenseCharges) {
      const groupKey = [
        charge.chargeTypeId,
        charge.periodYear,
        charge.periodMonth,
        charge.description ?? "(NULL)",
      ].join("|");
      const creator = charge.createdByUserId ? creatorMap.get(charge.createdByUserId) : undefined;
      const existing = groupedCharges.get(groupKey);

      if (!existing) {
        const invoiceDate = parseMetaDateFromDescription(charge.description, /^fatura\s+tarih[ıi]\s*:/i);
        const periodStartDate = parseMetaDateFromDescription(charge.description, /^baslang[ıi]c\s*:/i);
        const periodEndDate = parseMetaDateFromDescription(charge.description, /^bitis\s*:/i);
        groupedCharges.set(groupKey, {
          id: `charge_invoice:${groupKey}`,
          expenseItemId: charge.chargeType.id,
          distributionChargeTypeId: charge.chargeTypeId,
          periodYear: charge.periodYear,
          periodMonth: charge.periodMonth,
          expenseItemName: `${charge.chargeType.name} (${charge.chargeType.code})`,
          spentAt: invoiceDate ?? charge.dueDate,
          distributionDueDate: charge.dueDate,
          distributionInvoiceDate: invoiceDate,
          distributionPeriodStartDate: periodStartDate,
          distributionPeriodEndDate: periodEndDate,
          distributedTotal: Number(charge.amount),
          invoiceAmount: deps.extractChargeInvoiceAmount(charge.description),
          matchDescription: charge.description,
          createdAt: charge.createdAt,
          createdByUserId: charge.createdByUserId,
          createdByName: creator?.fullName ?? null,
          createdByEmail: creator?.email ?? null,
        });
        continue;
      }

      existing.distributedTotal += Number(charge.amount);

      const parsedInvoiceDate = parseMetaDateFromDescription(charge.description, /^fatura\s+tarih[ıi]\s*:/i);
      const parsedPeriodStartDate = parseMetaDateFromDescription(charge.description, /^baslang[ıi]c\s*:/i);
      const parsedPeriodEndDate = parseMetaDateFromDescription(charge.description, /^bitis\s*:/i);
      if (!existing.distributionInvoiceDate && parsedInvoiceDate) {
        existing.distributionInvoiceDate = parsedInvoiceDate;
        existing.spentAt = parsedInvoiceDate;
      }
      if (!existing.distributionPeriodStartDate && parsedPeriodStartDate) {
        existing.distributionPeriodStartDate = parsedPeriodStartDate;
      }
      if (!existing.distributionPeriodEndDate && parsedPeriodEndDate) {
        existing.distributionPeriodEndDate = parsedPeriodEndDate;
      }

      const parsedInvoiceAmount = deps.extractChargeInvoiceAmount(charge.description);
      if (existing.invoiceAmount === null && parsedInvoiceAmount !== null) {
        existing.invoiceAmount = parsedInvoiceAmount;
      }

      if (charge.createdAt.getTime() > existing.createdAt.getTime()) {
        existing.createdAt = charge.createdAt;
        existing.createdByUserId = charge.createdByUserId;
        existing.createdByName = creator?.fullName ?? null;
        existing.createdByEmail = creator?.email ?? null;
      }
    }

    const distributedChargeRows = [...groupedCharges.values()].map((grouped) => ({
      id: grouped.id,
      expenseItemId: grouped.expenseItemId,
      distributionChargeTypeId: grouped.distributionChargeTypeId,
      distributionPeriodYear: grouped.periodYear,
      distributionPeriodMonth: grouped.periodMonth,
      distributionMatchDescription: grouped.matchDescription,
      distributionDueDate: grouped.distributionDueDate.toISOString(),
      distributionInvoiceDate: grouped.distributionInvoiceDate?.toISOString() ?? null,
      distributionPeriodStartDate: grouped.distributionPeriodStartDate?.toISOString() ?? null,
      distributionPeriodEndDate: grouped.distributionPeriodEndDate?.toISOString() ?? null,
      expenseItemName: grouped.expenseItemName,
      spentAt: grouped.spentAt,
      amount: grouped.invoiceAmount ?? Number(grouped.distributedTotal.toFixed(2)),
      paymentMethod: PaymentMethod.OTHER,
      description: grouped.matchDescription,
      reference: null,
      createdAt: grouped.createdAt,
      source: "CHARGE_DISTRIBUTION" as const,
      createdByUserId: grouped.createdByUserId,
      createdByName: grouped.createdByName,
      createdByEmail: grouped.createdByEmail,
    }));

    const allRows = [...expenseRows, ...distributedChargeRows].sort((a, b) => {
      const spentDiff = new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime();
      if (spentDiff !== 0) {
        return spentDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const rowsBySource = source
      ? allRows.filter((x) => x.source === source)
      : allRows.filter((x) => x.source !== "CHARGE_DISTRIBUTION");

    let filteredRows = rowsBySource;
    if (expenseItemId) {
      const selectedExpenseItem = await prisma.expenseItemDefinition.findUnique({
        where: { id: expenseItemId },
        select: { id: true, code: true, name: true },
      });

      if (!selectedExpenseItem) {
        filteredRows = rowsBySource.filter((x) => x.expenseItemId === expenseItemId);
      } else {
        const selectedKeys = [selectedExpenseItem.code, selectedExpenseItem.name]
          .map((x) => normalizeText(x).trim())
          .filter(Boolean);

        filteredRows = rowsBySource.filter((row) => {
          if (row.expenseItemId === expenseItemId) {
            return true;
          }

          if (row.source !== "CHARGE_DISTRIBUTION") {
            return false;
          }

          const haystack = normalizeText(`${row.expenseItemName} ${row.description ?? ""}`);
          return selectedKeys.some((key) => haystack.includes(key));
        });
      }

      // Safety fallback: when source is distribution-only, never return a misleading empty list
      // because of expense-item/charge-type naming mismatches.
      if (source === "CHARGE_DISTRIBUTION" && filteredRows.length === 0) {
        filteredRows = rowsBySource;
      }
    }

    return res.json(filteredRows);
  });

  router.post("/expenses", async (req, res) => {
    const schema = z.object({
      expenseItemId: z.string().min(1),
      spentAt: z.string().datetime(),
      amount: z.number().positive(),
      paymentMethod: z.nativeEnum(PaymentMethod),
      description: z.string().optional(),
      reference: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    await deps.ensurePaymentMethodDefinitions();
    const methodDefinition = await prisma.paymentMethodDefinition.findUnique({
      where: { code: parsed.data.paymentMethod },
    });
    if (!methodDefinition || !methodDefinition.isActive) {
      return res.status(400).json({ message: "Selected payment method is not active" });
    }

    const expenseItem = await prisma.expenseItemDefinition.findUnique({ where: { id: parsed.data.expenseItemId } });
    if (!expenseItem) {
      return res.status(404).json({ message: "Expense item not found" });
    }

    const created = await prisma.expense.create({
      data: {
        expenseItemId: parsed.data.expenseItemId,
        spentAt: new Date(parsed.data.spentAt),
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        description: parsed.data.description?.trim() || null,
        reference: parsed.data.reference?.trim() || null,
        createdById: req.user?.userId,
      },
      include: { expenseItem: true },
    });

    return res.status(201).json({
      id: created.id,
      expenseItemId: created.expenseItemId,
      expenseItemName: created.expenseItem.name,
      spentAt: created.spentAt,
      amount: Number(created.amount),
      paymentMethod: created.paymentMethod,
      description: created.description,
      reference: created.reference,
    });
  });

  router.put("/expenses/:expenseId", async (req, res) => {
    const { expenseId } = req.params;
    const schema = z.object({
      expenseItemId: z.string().min(1),
      spentAt: z.string().datetime(),
      amount: z.number().positive(),
      paymentMethod: z.nativeEnum(PaymentMethod),
      description: z.string().optional(),
      reference: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    await deps.ensurePaymentMethodDefinitions();
    const methodDefinition = await prisma.paymentMethodDefinition.findUnique({
      where: { code: parsed.data.paymentMethod },
    });
    if (!methodDefinition || !methodDefinition.isActive) {
      return res.status(400).json({ message: "Selected payment method is not active" });
    }

    const expenseItem = await prisma.expenseItemDefinition.findUnique({ where: { id: parsed.data.expenseItemId } });
    if (!expenseItem) {
      return res.status(404).json({ message: "Expense item not found" });
    }

    const existingExpense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    try {
      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: {
          expenseItemId: parsed.data.expenseItemId,
          spentAt: new Date(parsed.data.spentAt),
          amount: parsed.data.amount,
          paymentMethod: parsed.data.paymentMethod,
          description: parsed.data.description?.trim() || null,
          reference: parsed.data.reference?.trim() || null,
        },
        include: { expenseItem: true },
      });

      const actionLog = await deps.pushActionLog({
        actionType: "EDIT",
        entityType: "EXPENSE",
        entityId: updated.id,
        actorUserId: req.user?.userId ?? null,
        before: deps.mapExpenseSnapshot(existingExpense),
        after: deps.mapExpenseSnapshot(updated),
        undoKind: "EXPENSE_EDIT",
        undoPayload: {
          expenseId: updated.id,
          before: deps.mapExpenseSnapshot(existingExpense),
        },
        undoable: true,
      });

      return res.json({
        id: updated.id,
        expenseItemId: updated.expenseItemId,
        expenseItemName: updated.expenseItem.name,
        spentAt: updated.spentAt,
        amount: Number(updated.amount),
        paymentMethod: updated.paymentMethod,
        description: updated.description,
        reference: updated.reference,
        actionLogId: actionLog.id,
        undoUntil: actionLog.undoUntil,
      });
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
        return res.status(404).json({ message: "Expense not found" });
      }

      throw err;
    }
  });

  router.delete("/expenses/:expenseId", async (req, res) => {
    const { expenseId } = req.params;

    try {
      const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
      if (!existing) {
        return res.status(404).json({ message: "Expense not found" });
      }

      await prisma.expense.delete({ where: { id: expenseId } });

      const snapshot = deps.mapExpenseSnapshot(existing);
      const actionLog = await deps.pushActionLog({
        actionType: "DELETE",
        entityType: "EXPENSE",
        entityId: expenseId,
        actorUserId: req.user?.userId ?? null,
        before: snapshot,
        after: null,
        undoKind: "EXPENSE_DELETE",
        undoPayload: {
          snapshot,
        },
        undoable: true,
      });

      return res.json({
        deletedExpenseId: expenseId,
        actionLogId: actionLog.id,
        undoUntil: actionLog.undoUntil,
      });
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
        return res.status(404).json({ message: "Expense not found" });
      }

      throw err;
    }
  });

  return router;
}

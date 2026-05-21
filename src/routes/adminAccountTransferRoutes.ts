import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  ACCOUNT_TRANSFER_EXPENSE_ITEM_CODE,
  ACCOUNT_TRANSFER_EXPENSE_ITEM_NAME,
  accountTransferDirectionLabel,
  accountTransferTag,
  buildAccountTransferExpenseDescription,
  buildAccountTransferPaymentNote,
  isAccountTransferExpenseDescription,
  isAccountTransferPaymentNote,
  parseAccountTransferDirectionFromText,
  type AccountTransferDirection,
} from "../utils/accountTransfer";

const directionSchema = z.enum(["VADELI_TO_TL", "TL_TO_VADELI"]);

async function ensureAccountTransferExpenseItemId(): Promise<string> {
  const item = await prisma.expenseItemDefinition.upsert({
    where: { code: ACCOUNT_TRANSFER_EXPENSE_ITEM_CODE },
    update: { name: ACCOUNT_TRANSFER_EXPENSE_ITEM_NAME, isActive: true },
    create: { code: ACCOUNT_TRANSFER_EXPENSE_ITEM_CODE, name: ACCOUNT_TRANSFER_EXPENSE_ITEM_NAME, isActive: true },
  });
  return item.id;
}

function extractBankRefFromPaymentNote(note: string | null): string | null {
  if (!note) {
    return null;
  }
  for (const part of note.split(" | ")) {
    const trimmed = part.trim();
    if (trimmed.toUpperCase().startsWith("BANK_REF:")) {
      return trimmed.slice(trimmed.indexOf(":") + 1).trim() || null;
    }
  }
  return null;
}

function extractBankDescFromPaymentNote(note: string | null): string | null {
  if (!note) {
    return null;
  }
  for (const part of note.split(" | ")) {
    const trimmed = part.trim();
    if (trimmed.toUpperCase().startsWith("BANK_DESC:")) {
      return trimmed.slice(trimmed.indexOf(":") + 1).trim() || null;
    }
  }
  return null;
}

export function createAdminAccountTransferRoutes(): Router {
  const router = Router();

  router.get("/account-transfers", async (req, res) => {
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

    const paidAtFilter =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          }
        : undefined;
    const spentAtFilter = paidAtFilter;

    const [payments, expenses] = await Promise.all([
      prisma.payment.findMany({
        where: {
          note: { contains: "ACCOUNT_TRANSFER:" },
          ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
        },
        select: {
          id: true,
          paidAt: true,
          totalAmount: true,
          method: true,
          note: true,
          importBatchId: true,
        },
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      }),
      prisma.expense.findMany({
        where: {
          description: { contains: "ACCOUNT_TRANSFER:" },
          ...(spentAtFilter ? { spentAt: spentAtFilter } : {}),
        },
        select: {
          id: true,
          spentAt: true,
          amount: true,
          paymentMethod: true,
          description: true,
          reference: true,
          importBatchId: true,
        },
        orderBy: [{ spentAt: "desc" }, { id: "desc" }],
      }),
    ]);

    const rows = [
      ...payments.map((payment) => {
        const direction = parseAccountTransferDirectionFromText(payment.note) as AccountTransferDirection;
        return {
          id: payment.id,
          movementType: "PAYMENT" as const,
          occurredAt: payment.paidAt,
          amount: Number(payment.totalAmount),
          method: payment.method,
          direction,
          directionLabel: accountTransferDirectionLabel(direction),
          reference: extractBankRefFromPaymentNote(payment.note),
          description: extractBankDescFromPaymentNote(payment.note) ?? payment.note ?? "-",
          importBatchId: payment.importBatchId,
        };
      }),
      ...expenses.map((expense) => {
        const direction = parseAccountTransferDirectionFromText(expense.description) as AccountTransferDirection;
        return {
          id: expense.id,
          movementType: "EXPENSE" as const,
          occurredAt: expense.spentAt,
          amount: Number(expense.amount),
          method: expense.paymentMethod,
          direction,
          directionLabel: accountTransferDirectionLabel(direction),
          reference: expense.reference,
          description: expense.description ?? "-",
          importBatchId: expense.importBatchId,
        };
      }),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return res.json(rows);
  });

  router.post("/account-transfers/payments/:paymentId/mark", async (req, res) => {
    const parsed = z.object({ direction: directionSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "direction gecersiz (VADELI_TO_TL veya TL_TO_VADELI)" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      select: { id: true, note: true, itemLinks: { select: { id: true } } },
    });

    if (!payment) {
      return res.status(404).json({ message: "Tahsilat kaydi bulunamadi" });
    }

    if (payment.itemLinks.length > 0) {
      return res.status(400).json({ message: "Tahakkuka bagli tahsilat virman olarak isaretlenemez" });
    }

    if (isAccountTransferPaymentNote(payment.note)) {
      return res.status(400).json({ message: "Kayit zaten hesaplar arasi virman" });
    }

    const reference = extractBankRefFromPaymentNote(payment.note);
    const description = extractBankDescFromPaymentNote(payment.note);
    const note = buildAccountTransferPaymentNote({
      reference: reference ?? undefined,
      description: description ?? undefined,
      direction: parsed.data.direction,
      existingNote: payment.note,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { note },
      select: { id: true, note: true },
    });

    return res.json({
      id: updated.id,
      direction: parsed.data.direction,
      directionLabel: accountTransferDirectionLabel(parsed.data.direction),
      note: updated.note,
    });
  });

  router.post("/account-transfers/expenses/:expenseId/mark", async (req, res) => {
    const parsed = z.object({ direction: directionSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "direction gecersiz (VADELI_TO_TL veya TL_TO_VADELI)" });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: req.params.expenseId },
      select: { id: true, description: true },
    });

    if (!expense) {
      return res.status(404).json({ message: "Gider kaydi bulunamadi" });
    }

    if (isAccountTransferExpenseDescription(expense.description)) {
      return res.status(400).json({ message: "Kayit zaten hesaplar arasi virman" });
    }

    const expenseItemId = await ensureAccountTransferExpenseItemId();
    const description = buildAccountTransferExpenseDescription({
      direction: parsed.data.direction,
      description: expense.description,
    });

    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        expenseItemId,
        description,
      },
      select: { id: true, description: true, expenseItemId: true },
    });

    return res.json({
      id: updated.id,
      direction: parsed.data.direction,
      directionLabel: accountTransferDirectionLabel(parsed.data.direction),
      description: updated.description,
    });
  });

  return router;
}

export { accountTransferTag };

import { PaymentMethod, type Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  isAccountTransferExpenseDescription,
  isExcludedFromOperatingBankBalancePaymentNote,
} from "./accountTransfer";

function sumPaymentRows(rows: Array<{ totalAmount: Prisma.Decimal | number; note: string | null }>): number {
  return Number(
    rows
      .filter((row) => !isExcludedFromOperatingBankBalancePaymentNote(row.note))
      .reduce((sum, row) => sum + Number(row.totalAmount), 0)
      .toFixed(2)
  );
}

function sumExpenseRows(rows: Array<{ amount: Prisma.Decimal | number; description: string | null }>): number {
  return Number(
    rows
      .filter((row) => !isAccountTransferExpenseDescription(row.description))
      .reduce((sum, row) => sum + Number(row.amount), 0)
      .toFixed(2)
  );
}

export async function sumOperatingBankPaymentsIn(where: Prisma.PaymentWhereInput = {}): Promise<number> {
  const rows = await prisma.payment.findMany({
    where: {
      method: PaymentMethod.BANK_TRANSFER,
      ...where,
    },
    select: {
      totalAmount: true,
      note: true,
    },
  });
  return sumPaymentRows(rows);
}

export async function sumOperatingBankExpensesOut(where: Prisma.ExpenseWhereInput = {}): Promise<number> {
  const rows = await prisma.expense.findMany({
    where: {
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      ...where,
    },
    select: {
      amount: true,
      description: true,
    },
  });
  return sumExpenseRows(rows);
}

export async function computeOperatingBankTotals(where?: {
  payment?: Prisma.PaymentWhereInput;
  expense?: Prisma.ExpenseWhereInput;
}): Promise<{ bankInTotal: number; bankOutTotal: number }> {
  const [bankInTotal, bankOutTotal] = await Promise.all([
    sumOperatingBankPaymentsIn(where?.payment ?? {}),
    sumOperatingBankExpensesOut(where?.expense ?? {}),
  ]);
  return { bankInTotal, bankOutTotal };
}

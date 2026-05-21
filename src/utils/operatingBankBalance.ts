import { PaymentMethod, type Prisma } from "@prisma/client";
import { prisma } from "../db";

/** Sistem acilis kayitlari tahsilat toplamina dahil edilmez; banka kasasina dahil edilmez. */
const OPENING_BALANCE_PAYMENT_NOTE_PREFIX = "OPENING_BALANCE|";
const CARRY_FORWARD_PAYMENT_NOTE_TAG = "CARRY_FORWARD:APARTMENT_CREDIT";

/**
 * TL banka kasa girisinden haric tutulacak odemeler.
 * Hesaplar arasi virman (vadeli -> TL) gercek para girisidir ve bakiyeye DAHIL edilir.
 */
export function isExcludedFromBankCashInNote(note: string | null | undefined): boolean {
  if (!note) {
    return false;
  }
  if (note.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX)) {
    return true;
  }
  if (note.includes(CARRY_FORWARD_PAYMENT_NOTE_TAG)) {
    return true;
  }
  return false;
}

function sumPaymentRows(rows: Array<{ totalAmount: Prisma.Decimal | number; note: string | null }>): number {
  return Number(
    rows
      .filter((row) => !isExcludedFromBankCashInNote(row.note))
      .reduce((sum, row) => sum + Number(row.totalAmount), 0)
      .toFixed(2)
  );
}

function sumExpenseRows(rows: Array<{ amount: Prisma.Decimal | number }>): number {
  return Number(rows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2));
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

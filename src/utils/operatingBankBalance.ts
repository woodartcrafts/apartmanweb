import { PaymentMethod, type Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  ACCOUNT_TRANSFER_NOTE_PREFIX,
  isAccountTransferPaymentNote,
  noteHasVadeliClosureHint,
  parseAccountTransferDirectionFromText,
} from "./accountTransfer";

/** Sistem acilis kayitlari tahsilat toplamina dahil edilmez; banka kasasina dahil edilmez. */
export const OPENING_BALANCE_PAYMENT_NOTE_PREFIX = "OPENING_BALANCE|";
const CARRY_FORWARD_PAYMENT_NOTE_TAG = "CARRY_FORWARD:APARTMENT_CREDIT";

export type OperatingBankBalanceSnapshot = {
  openingBalance: number;
  bankInTotal: number;
  bankOutTotal: number;
  estimatedBalance: number;
  excludedFromInTotal: number;
  excludedFromOutTotal: number;
  accountTransferInTotal: number;
  accountTransferOutTotal: number;
  vadeliClosureInTotal: number;
  nonBankTransferVirmanInCount: number;
  nonBankTransferVirmanInTotal: number;
};

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

function expenseOperatingText(description: string | null | undefined, reference: string | null | undefined): string {
  return [description, reference].filter((part) => Boolean(part && part.trim())).join(" | ");
}

/**
 * TL banka kasa cikisindan haric tutulacak giderler.
 * Vadeli hesap kapamasi (vadeli hesaptan cikis) TL kasayi azaltmaz; karsilik tahsilat zaten TL girisidir.
 */
export function isExcludedFromBankCashOutDescription(
  description: string | null | undefined,
  reference?: string | null | undefined
): boolean {
  const combined = expenseOperatingText(description, reference);
  if (!combined) {
    return false;
  }

  const direction = parseAccountTransferDirectionFromText(combined);
  if (direction === "VADELI_TO_TL") {
    return true;
  }

  if (direction === "TL_TO_VADELI") {
    return false;
  }

  return noteHasVadeliClosureHint(combined);
}

export function isOperatingBankPaymentRow(row: {
  method: PaymentMethod;
  note: string | null;
}): boolean {
  if (row.method === PaymentMethod.BANK_TRANSFER) {
    return true;
  }
  return isAccountTransferPaymentNote(row.note) || noteHasVadeliClosureHint(row.note ?? "");
}

function sumPaymentRows(rows: Array<{ totalAmount: Prisma.Decimal | number; note: string | null }>): number {
  return Number(
    rows
      .filter((row) => !isExcludedFromBankCashInNote(row.note))
      .reduce((sum, row) => sum + Number(row.totalAmount), 0)
      .toFixed(2)
  );
}

function sumExpenseRows(
  rows: Array<{ amount: Prisma.Decimal | number; description: string | null; reference?: string | null }>
): number {
  return Number(
    rows
      .filter((row) => !isExcludedFromBankCashOutDescription(row.description, row.reference))
      .reduce((sum, row) => sum + Number(row.amount), 0)
      .toFixed(2)
  );
}

export async function sumOpeningBankBalance(): Promise<number> {
  const agg = await prisma.payment.aggregate({
    where: { note: { startsWith: OPENING_BALANCE_PAYMENT_NOTE_PREFIX } },
    _sum: { totalAmount: true },
  });
  return Number(Number(agg._sum.totalAmount ?? 0).toFixed(2));
}

export async function sumOperatingBankPaymentsIn(where: Prisma.PaymentWhereInput = {}): Promise<number> {
  const rows = await prisma.payment.findMany({
    where: {
      ...where,
    },
    select: {
      totalAmount: true,
      note: true,
      method: true,
    },
  });
  const operatingRows = rows.filter((row) => isOperatingBankPaymentRow(row));
  return sumPaymentRows(operatingRows);
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
      reference: true,
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

export async function computeOperatingBankBalanceSnapshot(): Promise<OperatingBankBalanceSnapshot> {
  const [openingBalance, paymentRows, expenseRows] = await Promise.all([
    sumOpeningBankBalance(),
    prisma.payment.findMany({
      select: {
        id: true,
        totalAmount: true,
        note: true,
        method: true,
      },
    }),
    prisma.expense.findMany({
      where: { paymentMethod: PaymentMethod.BANK_TRANSFER },
      select: {
        id: true,
        amount: true,
        description: true,
        reference: true,
      },
    }),
  ]);

  let excludedFromInTotal = 0;
  let bankInTotal = 0;
  let accountTransferInTotal = 0;
  let vadeliClosureInTotal = 0;
  let nonBankTransferVirmanInCount = 0;
  let nonBankTransferVirmanInTotal = 0;

  for (const row of paymentRows) {
    const amount = Number(row.totalAmount);
    if (!isOperatingBankPaymentRow(row)) {
      continue;
    }
    if (isExcludedFromBankCashInNote(row.note)) {
      excludedFromInTotal = Number((excludedFromInTotal + amount).toFixed(2));
      continue;
    }

    bankInTotal = Number((bankInTotal + amount).toFixed(2));

    const direction = parseAccountTransferDirectionFromText(row.note);
    if (direction) {
      accountTransferInTotal = Number((accountTransferInTotal + amount).toFixed(2));
      if (row.method !== PaymentMethod.BANK_TRANSFER) {
        nonBankTransferVirmanInCount += 1;
        nonBankTransferVirmanInTotal = Number((nonBankTransferVirmanInTotal + amount).toFixed(2));
      }
    } else if (noteHasVadeliClosureHint(row.note ?? "")) {
      vadeliClosureInTotal = Number((vadeliClosureInTotal + amount).toFixed(2));
    }
  }

  let excludedFromOutTotal = 0;
  let bankOutTotal = 0;
  let accountTransferOutTotal = 0;

  for (const row of expenseRows) {
    const amount = Number(row.amount);
    if (isExcludedFromBankCashOutDescription(row.description, row.reference)) {
      excludedFromOutTotal = Number((excludedFromOutTotal + amount).toFixed(2));
      continue;
    }

    bankOutTotal = Number((bankOutTotal + amount).toFixed(2));
    const direction = parseAccountTransferDirectionFromText(
      expenseOperatingText(row.description, row.reference)
    );
    if (direction === "TL_TO_VADELI") {
      accountTransferOutTotal = Number((accountTransferOutTotal + amount).toFixed(2));
    }
  }

  const estimatedBalance = Number((openingBalance + bankInTotal - bankOutTotal).toFixed(2));

  return {
    openingBalance,
    bankInTotal,
    bankOutTotal,
    estimatedBalance,
    excludedFromInTotal,
    excludedFromOutTotal,
    accountTransferInTotal,
    accountTransferOutTotal,
    vadeliClosureInTotal,
    nonBankTransferVirmanInCount,
    nonBankTransferVirmanInTotal,
  };
}

export type BankMovementSortable = {
  id: string;
  occurredAt: Date;
  createdAt: Date;
  entryType: "IN" | "OUT";
};

export function compareBankMovementsChronologically(a: BankMovementSortable, b: BankMovementSortable): number {
  const occurredDiff = a.occurredAt.getTime() - b.occurredAt.getTime();
  if (occurredDiff !== 0) {
    return occurredDiff;
  }

  const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.entryType !== b.entryType) {
    return a.entryType === "IN" ? -1 : 1;
  }

  return a.id.localeCompare(b.id);
}

export function computeRunningBalancesByMovementId(
  rows: Array<BankMovementSortable & { amount: number }>,
  startingBalance: number
): Map<string, number> {
  const sorted = [...rows].sort(compareBankMovementsChronologically);
  const balanceById = new Map<string, number>();
  let running = Number(startingBalance.toFixed(2));

  for (const row of sorted) {
    const signedAmount = row.entryType === "IN" ? Number(row.amount) : -Number(row.amount);
    running = Number((running + signedAmount).toFixed(2));
    balanceById.set(row.id, running);
  }

  return balanceById;
}

export type BankBalanceAuditRow = {
  id: string;
  movementType: "PAYMENT" | "EXPENSE";
  amount: number;
  method: PaymentMethod;
  occurredAt: string;
  label: string;
  reason: string;
  includedInOperatingBalance: boolean;
};

export async function buildBankBalanceAuditRows(limit = 80): Promise<BankBalanceAuditRow[]> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        method: true,
        note: true,
      },
    }),
    prisma.expense.findMany({
      where: { paymentMethod: PaymentMethod.BANK_TRANSFER },
      orderBy: [{ spentAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        spentAt: true,
        amount: true,
        paymentMethod: true,
        description: true,
        reference: true,
      },
    }),
  ]);

  const paymentAuditRows: BankBalanceAuditRow[] = payments.map((row) => {
    const amount = Number(row.totalAmount);
    const isOpening = Boolean(row.note?.startsWith(OPENING_BALANCE_PAYMENT_NOTE_PREFIX));
    const isOperating = isOperatingBankPaymentRow(row);
    const excludedFromIn = isExcludedFromBankCashInNote(row.note);
    const included = isOperating && !excludedFromIn;

    let reason = "TL banka girisi";
    if (isOpening) {
      reason = "Acilis bakiyesi (ayri toplanir)";
    } else if (!isOperating) {
      reason = "Banka transferi / virman degil";
    } else if (excludedFromIn) {
      reason = "Giris toplamindan haric (tasima kredisi vb.)";
    } else if (isAccountTransferPaymentNote(row.note)) {
      reason = "Hesaplar arasi virman girisi";
    } else if (noteHasVadeliClosureHint(row.note ?? "")) {
      reason = "Vadeli hesap kapama girisi";
    }

    return {
      id: row.id,
      movementType: "PAYMENT",
      amount,
      method: row.method,
      occurredAt: row.paidAt.toISOString(),
      label: row.note?.slice(0, 120) ?? "-",
      reason,
      includedInOperatingBalance: included,
    };
  });

  const expenseAuditRows: BankBalanceAuditRow[] = expenses.map((row) => {
    const amount = Number(row.amount);
    const excluded = isExcludedFromBankCashOutDescription(row.description, row.reference);
    const combined = expenseOperatingText(row.description, row.reference);

    let reason = "TL banka gideri";
    if (excluded) {
      reason = parseAccountTransferDirectionFromText(combined) === "VADELI_TO_TL"
        ? "Vadeli taraf virman — TL kasadan dusulmez"
        : "Vadeli hesap kapama gideri — TL kasadan dusulmez";
    } else if (parseAccountTransferDirectionFromText(combined) === "TL_TO_VADELI") {
      reason = "TL -> vadeli virman cikisi";
    }

    return {
      id: row.id,
      movementType: "EXPENSE",
      amount,
      method: row.paymentMethod,
      occurredAt: row.spentAt.toISOString(),
      label: combined.slice(0, 120) || "-",
      reason,
      includedInOperatingBalance: !excluded,
    };
  });

  return [...paymentAuditRows, ...expenseAuditRows]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

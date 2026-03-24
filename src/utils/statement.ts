import type { PaymentMethod } from "@prisma/client";
import { prisma } from "../db";
import { addMoneyCents, fromCents, toCents } from "./money";

export type ClassicStatementItem = {
  chargeId: string;
  periodYear: number;
  periodMonth: number;
  type: string;
  typeCode: string;
  description: string | null;
  amount: number;
  paidTotal: number;
  remaining: number;
  status: string;
  dueDate: Date;
  paidAt: Date | null;
};

export type AccountingStatementItem = {
  movementId: string;
  date: Date;
  movementType: "BORC" | "ALACAK";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  chargeId: string | null;
  paymentId: string | null;
  paymentMethod: PaymentMethod | null;
  periodYear: number | null;
  periodMonth: number | null;
};

type AccountingEvent = {
  eventId: string;
  date: Date;
  movementType: "BORC" | "ALACAK";
  description: string;
  debit: number;
  credit: number;
  chargeId: string | null;
  paymentId: string | null;
  paymentMethod: PaymentMethod | null;
  periodYear: number | null;
  periodMonth: number | null;
  createdAtMs: number;
};

type PaymentAggregate = {
  paymentId: string;
  paidAt: Date;
  createdAt: Date;
  method: PaymentMethod;
  note: string | null;
  amountCents: number;
};

function buildChargeDescription(chargeTypeName: string, description: string | null): string {
  return description?.trim() ? `${chargeTypeName} - ${description.trim()}` : chargeTypeName;
}

function buildPaymentDescription(method: PaymentMethod, note: string | null): string {
  const methodText = method.replaceAll("_", " ");
  const cleanNote = note?.trim();
  return cleanNote ? `Odeme (${methodText}) - ${cleanNote}` : `Odeme (${methodText})`;
}

export async function getApartmentStatements(apartmentId: string): Promise<{
  statement: ClassicStatementItem[];
  accountingStatement: AccountingStatementItem[];
}> {
  const charges = await prisma.charge.findMany({
    where: { apartmentId },
    include: {
      chargeType: true,
      paymentItems: {
        include: {
          payment: true,
        },
      },
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const statement: ClassicStatementItem[] = charges.map((charge) => {
    const amountCents = toCents(charge.amount);
    const paidTotalCents = charge.paymentItems.reduce((sum, item) => addMoneyCents(sum, item.amount), 0);
    const latestPaidAt = charge.paymentItems.reduce<Date | null>((latest, item) => {
      const current = item.payment.paidAt;
      if (!latest || current.getTime() > latest.getTime()) {
        return current;
      }
      return latest;
    }, null);

    return {
      chargeId: charge.id,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      type: charge.chargeType.name,
      typeCode: charge.chargeType.code,
      description: charge.description,
      amount: fromCents(amountCents),
      paidTotal: fromCents(paidTotalCents),
      remaining: fromCents(amountCents - paidTotalCents),
      status: charge.status,
      dueDate: charge.dueDate,
      paidAt: latestPaidAt,
    };
  });

  const accountingEvents: AccountingEvent[] = [];
  const paymentAggregates = new Map<string, PaymentAggregate>();

  for (const charge of charges) {
    accountingEvents.push({
      eventId: `charge:${charge.id}`,
      date: charge.dueDate,
      movementType: "BORC",
      description: buildChargeDescription(charge.chargeType.name, charge.description),
      debit: fromCents(toCents(charge.amount)),
      credit: 0,
      chargeId: charge.id,
      paymentId: null,
      paymentMethod: null,
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      createdAtMs: charge.createdAt.getTime(),
    });

    for (const paymentItem of charge.paymentItems) {
      const existingPayment = paymentAggregates.get(paymentItem.paymentId);

      if (existingPayment) {
        existingPayment.amountCents = addMoneyCents(existingPayment.amountCents, paymentItem.amount);
      } else {
        paymentAggregates.set(paymentItem.paymentId, {
          paymentId: paymentItem.paymentId,
          paidAt: paymentItem.payment.paidAt,
          createdAt: paymentItem.payment.createdAt,
          method: paymentItem.payment.method,
          note: paymentItem.payment.note,
          amountCents: toCents(paymentItem.amount),
        });
      }
    }
  }

  for (const payment of paymentAggregates.values()) {
    accountingEvents.push({
      eventId: `payment:${payment.paymentId}`,
      date: payment.paidAt,
      movementType: "ALACAK",
      description: buildPaymentDescription(payment.method, payment.note),
      debit: 0,
      credit: fromCents(payment.amountCents),
      chargeId: null,
      paymentId: payment.paymentId,
      paymentMethod: payment.method,
      periodYear: null,
      periodMonth: null,
      createdAtMs: payment.createdAt.getTime(),
    });
  }

  accountingEvents.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const createdDiff = a.createdAtMs - b.createdAtMs;
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return a.eventId.localeCompare(b.eventId);
  });

  let runningBalanceCents = 0;
  const accountingStatement: AccountingStatementItem[] = accountingEvents.map((event) => {
    runningBalanceCents += toCents(event.debit) - toCents(event.credit);

    return {
      movementId: event.eventId,
      date: event.date,
      movementType: event.movementType,
      description: event.description,
      debit: event.debit,
      credit: event.credit,
      balance: fromCents(runningBalanceCents),
      chargeId: event.chargeId,
      paymentId: event.paymentId,
      paymentMethod: event.paymentMethod,
      periodYear: event.periodYear,
      periodMonth: event.periodMonth,
    };
  });

  return { statement, accountingStatement };
}

export const PAYMENT_REFUND_NOTE_PREFIX = "PAYMENT_REFUND:";
export const PAYMENT_REFUND_EXPENSE_ITEM_CODE = "AIDAT_IADESI";
export const PAYMENT_REFUND_EXPENSE_ITEM_NAME = "Aidat Iadesi";
export const UNCLASSIFIED_EXPENSE_ITEM_CODE = "SINIFLANDIRILAMAYAN_GIDERLER";

export function paymentRefundDoorTag(doorNo: string): string {
  return `${PAYMENT_REFUND_NOTE_PREFIX}DOOR:${doorNo.trim()}`;
}

export function parsePaymentRefundDoorFromText(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  const match = text.match(/PAYMENT_REFUND:DOOR:([^\s|]+)/i);
  const door = match?.[1]?.trim();
  return door || null;
}

export function isPaymentRefundExpenseDescription(description: string | null | undefined): boolean {
  return parsePaymentRefundDoorFromText(description) !== null;
}

export function isPaymentRefundExpenseItemCode(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase() === PAYMENT_REFUND_EXPENSE_ITEM_CODE;
}

/** Gider raporlarindan (admin + resident) haric tutulacak kayitlar. */
export function shouldExcludeExpenseFromReports(params: {
  description?: string | null;
  expenseItemCode?: string | null;
}): boolean {
  return (
    isPaymentRefundExpenseDescription(params.description) ||
    isPaymentRefundExpenseItemCode(params.expenseItemCode)
  );
}

export function buildPaymentRefundExpenseDescription(params: {
  doorNo: string;
  description?: string | null;
}): string {
  const tag = paymentRefundDoorTag(params.doorNo);
  const base = (params.description ?? "").trim();
  if (!base) {
    return tag;
  }
  if (isPaymentRefundExpenseDescription(base)) {
    return base;
  }
  return `${base} | ${tag}`;
}

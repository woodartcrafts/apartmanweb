export const PAYMENT_REFUND_NOTE_PREFIX = "PAYMENT_REFUND:";
export const PAYMENT_REFUND_EXPENSE_ITEM_CODE = "AIDAT_IADESI";
export const PAYMENT_REFUND_EXPENSE_ITEM_NAME = "Aidat Iadesi";
export const UNCLASSIFIED_EXPENSE_ITEM_CODE = "SINIFLANDIRILAMAYAN_GIDERLER";

export function paymentRefundDoorTag(doorNos: string | string[]): string {
  const doors = (Array.isArray(doorNos) ? doorNos : [doorNos])
    .map((door) => door.trim())
    .filter(Boolean);
  return `${PAYMENT_REFUND_NOTE_PREFIX}DOOR:${doors.join(",")}`;
}

/** "57,93" | "57 93" | "57 ve 93" | tek daire */
export function parseDoorNosInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;/]|\s+ve\s+|\s+veya\s+|\s+/i)
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ];
}

export function parsePaymentRefundDoorsFromText(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }

  const match = text.match(/PAYMENT_REFUND:DOOR:([^\s|]+)/i);
  const raw = match?.[1]?.trim();
  if (!raw) {
    return [];
  }

  return parseDoorNosInput(raw.replace(/,/g, " "));
}

/** @deprecated tek daire icin; yeni kod parsePaymentRefundDoorsFromText kullanmali */
export function parsePaymentRefundDoorFromText(text: string | null | undefined): string | null {
  const doors = parsePaymentRefundDoorsFromText(text);
  return doors[0] ?? null;
}

export function isPaymentRefundExpenseDescription(description: string | null | undefined): boolean {
  return parsePaymentRefundDoorsFromText(description).length > 0;
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

/**
 * Iadenin dusulebilecegi bir kaynak: ya odemenin tahakkuga yazilmamis fazlasi
 * (daire alacagi) ya da bir tahakkuga yazili tahsilat kalemi.
 */
export type RefundSource = {
  kind: "CREDIT" | "ITEM";
  paymentId: string;
  paymentItemId: string | null;
  chargeId: string | null;
  availableCents: number;
};

export type RefundReduction = RefundSource & { reducedCents: number };

/**
 * Iade tutarini verilen kaynaklardan sirayla duser.
 *
 * Kaynak sirasi cagiran tarafta belirlenir: once bekleyen daire alacaklari,
 * sonra tahakkuklara yazili tahsilatlar; her grup en yeni odemeden baslar.
 * Kaynaklar yetmezse kalan tutar `shortfallCents` olarak doner.
 */
export function planRefundReductions(
  targetCents: number,
  sources: RefundSource[]
): { reductions: RefundReduction[]; shortfallCents: number } {
  const reductions: RefundReduction[] = [];
  let remaining = Math.max(0, targetCents);

  for (const source of sources) {
    if (remaining <= 0) {
      break;
    }
    if (source.availableCents <= 0) {
      continue;
    }

    const reducedCents = Math.min(remaining, source.availableCents);
    reductions.push({ ...source, reducedCents });
    remaining -= reducedCents;
  }

  return { reductions, shortfallCents: remaining };
}

export function buildPaymentRefundExpenseDescription(params: {
  doorNos: string | string[];
  description?: string | null;
}): string {
  const tag = paymentRefundDoorTag(params.doorNos);
  const base = (params.description ?? "").trim();
  if (!base) {
    return tag;
  }
  if (isPaymentRefundExpenseDescription(base)) {
    return base;
  }
  return `${base} | ${tag}`;
}

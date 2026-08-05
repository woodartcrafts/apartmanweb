export function parsePaymentNoteParts(note: string | null): string[] {
  if (!note) {
    return [];
  }

  return note
    .split(" | ")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeDoorNoForCompare(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) {
    return String(asNumber);
  }

  return raw;
}

/**
 * Elle yapilan dagitim kararlarini koruyan kilit. Mutabakat ve otomatik
 * alacak uygulama bu etiketi tasiyan odemelere dokunmaz.
 */
export const MANUAL_RECONCILE_LOCK_TAG = "RECONCILE_LOCK:MANUAL";

export function hasManualReconcileLock(note: string | null | undefined): boolean {
  if (!note) {
    return false;
  }
  return parsePaymentNoteParts(note).some(
    (part) => part.trim().toUpperCase() === MANUAL_RECONCILE_LOCK_TAG
  );
}

/**
 * Sistem tarafindan bir daireye on-dagitim yapilmis manuel inceleme kaydi.
 * Kilitli gorunse de otomatik dagitima acik sayilir.
 */
export function isSystemPreallocatedManualReview(note: string | null | undefined): boolean {
  if (!note) {
    return false;
  }

  return parsePaymentNoteParts(note).some(
    (part) => part.trim().toUpperCase() === "MANUAL_REVIEW:PREALLOCATED_TO_APARTMENT"
  );
}

export function extractDoorNoTagFromPaymentNote(note: string | null): string | null {
  const doorPart = parsePaymentNoteParts(note).find((part) => part.startsWith("DOOR:"));
  if (!doorPart) {
    return null;
  }

  const value = doorPart.slice("DOOR:".length).trim();
  return value || null;
}

export const REFUNDED_NOTE_PREFIX = "REFUNDED:";

/**
 * Bu tahsilattan daireye geri iade edilmis kumulatif tutar.
 *
 * Iade tahsilatin `totalAmount` degerini azaltmaz: para gercekten bankaya
 * girdi, sonra geri cikti; ikisi de ayri banka hareketi. Bu yuzden bir
 * tahsilatin dagitima musait tutari `totalAmount - dagitilan - iade edilen`.
 * Bu etiket olmadan iade edilen para bekleyen daire alacagi gibi gorunur ve
 * tahakkuklara yeniden yazilir.
 */
export function parseRefundedAmountFromNote(note: string | null | undefined): number {
  const part = parsePaymentNoteParts(note ?? null).find((row) =>
    row.trim().toUpperCase().startsWith(REFUNDED_NOTE_PREFIX)
  );
  if (!part) {
    return 0;
  }

  const parsed = Number(part.trim().slice(REFUNDED_NOTE_PREFIX.length).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function withRefundedNote(note: string | null, refundedAmount: number): string | null {
  const parts = parsePaymentNoteParts(note).filter(
    (part) => !part.trim().toUpperCase().startsWith(REFUNDED_NOTE_PREFIX)
  );

  if (refundedAmount > 0) {
    parts.push(`${REFUNDED_NOTE_PREFIX}${refundedAmount.toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

export const OVERPAYMENT_NOTE_PREFIX = "UNAPPLIED:OVERPAYMENT";

/**
 * Odeme notunu dagitilamayan (daire alacagi olarak bekleyen) tutari
 * gosterecek sekilde gunceller.
 *
 * `DOOR:` etiketi sart: daire alacaklarini uygulayan mekanizma odemeyi bu
 * etiketle bir daireye baglar, etiket olmadan tutar sahipsiz kalir.
 * Fazla tutar kalmadiysa etiket temizlenir.
 */
export function withOverpaymentNote(
  note: string | null,
  doorNo: string,
  surplusAmount: number
): string | null {
  const parts = parsePaymentNoteParts(note).filter(
    (part) => !part.trim().toUpperCase().startsWith(OVERPAYMENT_NOTE_PREFIX)
  );

  const normalizedDoorNo = doorNo.trim();
  if (surplusAmount <= 0) {
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  if (normalizedDoorNo && !parts.some((part) => part.startsWith("DOOR:"))) {
    parts.push(`DOOR:${normalizedDoorNo}`);
  }

  parts.push(`${OVERPAYMENT_NOTE_PREFIX}:${surplusAmount.toFixed(2)}`);

  return parts.join(" | ");
}

export function buildPaymentNote(
  existingNote: string | null,
  description: string | undefined,
  reference: string | undefined,
  doorNo?: string
): string | null {
  const preservedParts = parsePaymentNoteParts(existingNote).filter(
    (part) => part.startsWith("PAYMENT_UPLOAD:") || (doorNo === undefined && part.startsWith("DOOR:"))
  );

  const normalizedDescription = description?.trim();
  const normalizedReference = reference?.trim();

  if (normalizedDescription) {
    preservedParts.push(normalizedDescription);
  }

  if (normalizedReference) {
    preservedParts.push(`REF:${normalizedReference}`);
  }

  if (doorNo && doorNo.trim()) {
    preservedParts.push(`DOOR:${doorNo.trim()}`);
  }

  return preservedParts.length > 0 ? preservedParts.join(" | ") : null;
}

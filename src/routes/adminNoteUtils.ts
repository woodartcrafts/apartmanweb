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

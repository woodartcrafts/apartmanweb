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

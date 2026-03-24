const CENT_FACTOR = 100;

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  if (typeof value === "object" && value && "toString" in value) {
    return Number(String(value));
  }
  return NaN;
}

export function toCents(value: unknown): number {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) {
    return NaN;
  }

  return Math.round(amount * CENT_FACTOR);
}

export function fromCents(cents: number): number {
  return cents / CENT_FACTOR;
}

export function addMoneyCents(totalCents: number, delta: unknown): number {
  const deltaCents = toCents(delta);
  if (!Number.isFinite(deltaCents)) {
    return totalCents;
  }

  return totalCents + deltaCents;
}

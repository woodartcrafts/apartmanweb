import type { Prisma } from "@prisma/client";

export type AccountTransferDirection = "VADELI_TO_TL" | "TL_TO_VADELI";

export const ACCOUNT_TRANSFER_NOTE_PREFIX = "ACCOUNT_TRANSFER:";
export const ACCOUNT_TRANSFER_EXPENSE_ITEM_CODE = "HESAPLAR_ARASI_VIRMAN";
export const ACCOUNT_TRANSFER_EXPENSE_ITEM_NAME = "Hesaplar Arasi Virman";

function toAsciiLower(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase();
}

export function accountTransferTag(direction: AccountTransferDirection): string {
  return `${ACCOUNT_TRANSFER_NOTE_PREFIX}${direction}`;
}

export function parseAccountTransferDirectionFromText(
  text: string | null | undefined
): AccountTransferDirection | null {
  if (!text) {
    return null;
  }

  if (text.includes(`${ACCOUNT_TRANSFER_NOTE_PREFIX}VADELI_TO_TL`)) {
    return "VADELI_TO_TL";
  }
  if (text.includes(`${ACCOUNT_TRANSFER_NOTE_PREFIX}TL_TO_VADELI`)) {
    return "TL_TO_VADELI";
  }
  return null;
}

export function isAccountTransferPaymentNote(note: string | null | undefined): boolean {
  return parseAccountTransferDirectionFromText(note) !== null;
}

export function noteHasVadeliClosureHint(text: string): boolean {
  const normalized = toAsciiLower(text);
  return (
    normalized.includes("hesap kapama") ||
    normalized.includes("hesap kapan") ||
    normalized.includes("hesap kapatma") ||
    (normalized.includes("numarali hesap") && normalized.includes("kapam"))
  );
}

/** Siniflandirilamayan / dagitimsiz ama aciklamasi vadeli hesap kapamasi olan tahsilatlar (henuz virman isaretlenmemis). */
export function isLikelyVadeliClosureUnclassifiedPaymentNote(note: string | null | undefined): boolean {
  if (!note) {
    return false;
  }
  if (!noteHasVadeliClosureHint(note)) {
    return false;
  }
  const upper = note.toUpperCase();
  return upper.includes("UNCLASSIFIED_COLLECTION:") || upper.includes("UNAPPLIED:NO_DOOR_NO");
}

/**
 * @deprecated Banka kasa bakiyesi icin isExcludedFromBankCashInNote kullanin (virman dahil).
 * Aidat/siniflandirma raporlari icin virman ve hesap kapamasi ayri degerlendirilir.
 */
export function isExcludedFromOperatingBankBalancePaymentNote(note: string | null | undefined): boolean {
  return isAccountTransferPaymentNote(note) || isLikelyVadeliClosureUnclassifiedPaymentNote(note);
}

export function isAccountTransferExpenseDescription(description: string | null | undefined): boolean {
  return parseAccountTransferDirectionFromText(description) !== null;
}

export function detectAccountTransferFromBankDescription(
  description: string | null | undefined
): AccountTransferDirection | null {
  const normalized = toAsciiLower(description ?? "");
  if (!normalized) {
    return null;
  }

  if (normalized.includes("hesap kapama") || normalized.includes("hesap kapan")) {
    return "VADELI_TO_TL";
  }

  if (
    normalized.includes("vadeli") &&
    (normalized.includes("aktar") || normalized.includes("virman") || normalized.includes("transfer"))
  ) {
    return "TL_TO_VADELI";
  }

  return null;
}

export function extractAccountNumberFromDescription(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }

  const match = description.match(/(\d{4})\s*(\d{7})/);
  if (!match) {
    return null;
  }

  return `${match[1]} ${match[2]}`;
}

export function accountTransferDirectionLabel(direction: AccountTransferDirection): string {
  if (direction === "VADELI_TO_TL") {
    return "Vadeli → TL";
  }
  return "TL → Vadeli";
}

export function stripUnclassifiedPaymentTags(parts: string[]): string[] {
  return parts.filter((part) => {
    const upper = part.trim().toUpperCase();
    return (
      !upper.startsWith("UNCLASSIFIED_COLLECTION:") &&
      !upper.startsWith("UNAPPLIED:") &&
      !upper.startsWith(ACCOUNT_TRANSFER_NOTE_PREFIX)
    );
  });
}

export function buildAccountTransferPaymentNote(params: {
  reference?: string;
  description?: string;
  direction: AccountTransferDirection;
  splitNoteTag?: string;
  existingNote?: string | null;
}): string {
  const existingParts = (params.existingNote ?? "")
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = stripUnclassifiedPaymentTags(existingParts);

  const parts = [
    params.reference ? `BANK_REF:${params.reference}` : undefined,
    params.description ? `BANK_DESC:${params.description}` : undefined,
    ...kept.filter((part) => !part.toUpperCase().startsWith("BANK_REF:") && !part.toUpperCase().startsWith("BANK_DESC:")),
    accountTransferTag(params.direction),
    params.splitNoteTag,
  ].filter(Boolean) as string[];

  return [...new Set(parts)].join(" | ");
}

export function buildAccountTransferExpenseDescription(params: {
  direction: AccountTransferDirection;
  description?: string | null;
  reference?: string | null;
}): string {
  const base = (params.description ?? "").trim();
  const withoutTag = base
    .split(" | ")
    .map((part) => part.trim())
    .filter((part) => part && !part.toUpperCase().startsWith(ACCOUNT_TRANSFER_NOTE_PREFIX))
    .join(" | ");

  const parts = [withoutTag || undefined, accountTransferTag(params.direction)].filter(Boolean) as string[];
  return parts.join(" | ");
}

export const prismaExcludeAccountTransferPayments = {
  NOT: { note: { contains: ACCOUNT_TRANSFER_NOTE_PREFIX } },
} satisfies Prisma.PaymentWhereInput;

export const prismaExcludeAccountTransferExpenses = {
  NOT: { description: { contains: ACCOUNT_TRANSFER_NOTE_PREFIX } },
} satisfies Prisma.ExpenseWhereInput;

/** Ana sayfa banka bakiyesi ve son hareket: virman + hesap kapamasi siniflandirilamayan tahsilatlar. */
export const prismaExcludeFromOperatingBankPayments = {
  NOT: {
    OR: [
      { note: { contains: ACCOUNT_TRANSFER_NOTE_PREFIX } },
      {
        AND: [
          { note: { contains: "UNCLASSIFIED_COLLECTION:" } },
          {
            OR: [
              { note: { contains: "hesap kapama", mode: "insensitive" } },
              { note: { contains: "hesap kapan", mode: "insensitive" } },
            ],
          },
        ],
      },
    ],
  },
} satisfies Prisma.PaymentWhereInput;

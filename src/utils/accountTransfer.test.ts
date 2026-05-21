import { describe, expect, it } from "vitest";
import {
  buildAccountTransferPaymentNote,
  detectAccountTransferFromBankDescription,
  isAccountTransferPaymentNote,
  isLikelyVadeliClosureUnclassifiedPaymentNote,
  parseAccountTransferDirectionFromText,
} from "./accountTransfer";

describe("accountTransfer utils", () => {
  it("detects vadeli account closure descriptions", () => {
    expect(
      detectAccountTransferFromBankDescription("1188 0543501 numaralı hesap kapama | UNCLASSIFIED")
    ).toBe("VADELI_TO_TL");
  });

  it("detects unclassified hesap kapama notes for operating bank exclusion", () => {
    const note =
      "BANK_DESC:1188 0543501 numaralı hesap kapama | UNCLASSIFIED_COLLECTION:SINIFLANDIRILAMAYAN_TAHSILATLAR | UNAPPLIED:NO_DOOR_NO";
    expect(isLikelyVadeliClosureUnclassifiedPaymentNote(note)).toBe(true);
    expect(isAccountTransferPaymentNote(note)).toBe(false);
  });

  it("builds payment note without unclassified tags", () => {
    const note = buildAccountTransferPaymentNote({
      reference: "ABC123",
      description: "1188 0543501 numaralı hesap kapama",
      direction: "VADELI_TO_TL",
      existingNote:
        "BANK_REF:ABC123 | BANK_DESC:1188 kapama | UNCLASSIFIED_COLLECTION:SINIFLANDIRILAMAYAN_TAHSILATLAR | UNAPPLIED:NO_DOOR_NO",
    });

    expect(note).toContain("ACCOUNT_TRANSFER:VADELI_TO_TL");
    expect(note).not.toContain("UNCLASSIFIED_COLLECTION");
    expect(note).not.toContain("UNAPPLIED:");
    expect(isAccountTransferPaymentNote(note)).toBe(true);
    expect(parseAccountTransferDirectionFromText(note)).toBe("VADELI_TO_TL");
  });
});

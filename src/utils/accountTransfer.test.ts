import { describe, expect, it } from "vitest";
import {
  buildAccountTransferPaymentNote,
  detectAccountTransferFromBankDescription,
  isAccountTransferPaymentNote,
  isLikelyVadeliClosureUnclassifiedPaymentNote,
  parseAccountTransferDirectionFromText,
} from "./accountTransfer";
import { isExcludedFromBankCashInNote, isExcludedFromBankCashOutDescription } from "./operatingBankBalance";

describe("accountTransfer utils", () => {
  it("detects vadeli account closure descriptions", () => {
    expect(
      detectAccountTransferFromBankDescription("1188 0543501 numaralı hesap kapama | UNCLASSIFIED")
    ).toBe("VADELI_TO_TL");
  });

  it("detects unclassified hesap kapama notes", () => {
    const note =
      "BANK_DESC:1188 0543501 numaralı hesap kapama | UNCLASSIFIED_COLLECTION:SINIFLANDIRILAMAYAN_TAHSILATLAR | UNAPPLIED:NO_DOOR_NO";
    expect(isLikelyVadeliClosureUnclassifiedPaymentNote(note)).toBe(true);
    expect(isAccountTransferPaymentNote(note)).toBe(false);
  });

  it("detects hesap kapama with only UNAPPLIED tag", () => {
    const note = "BANK_DESC:1188 0567107 numaralı hesap kapama | UNAPPLIED:NO_DOOR_NO";
    expect(isLikelyVadeliClosureUnclassifiedPaymentNote(note)).toBe(true);
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

describe("operatingBankBalance", () => {
  it("includes account transfer payments in bank cash in", () => {
    const note =
      "BANK_DESC:1188 0543501 numaralı hesap kapama | ACCOUNT_TRANSFER:VADELI_TO_TL | UNAPPLIED:NO_DOOR_NO";
    expect(isExcludedFromBankCashInNote(note)).toBe(false);
  });

  it("excludes vadeli closure counterpart expenses from bank cash out", () => {
    expect(
      isExcludedFromBankCashOutDescription(
        "1188 0567107 numaralı hesap kapama | ACCOUNT_TRANSFER:VADELI_TO_TL"
      )
    ).toBe(true);
    expect(
      isExcludedFromBankCashOutDescription("1188 0543501 numaralı hesap kapama", null)
    ).toBe(true);
  });

  it("keeps TL to vadeli transfer expenses in bank cash out", () => {
    expect(
      isExcludedFromBankCashOutDescription("Vadeli hesaba aktarim | ACCOUNT_TRANSFER:TL_TO_VADELI")
    ).toBe(false);
  });
});

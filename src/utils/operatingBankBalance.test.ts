import { describe, expect, it } from "vitest";
import {
  isExcludedFromBankCashInNote,
  isExcludedFromBankCashOutDescription,
  isOperatingBankPaymentRow,
  OPENING_BALANCE_PAYMENT_NOTE_PREFIX,
} from "./operatingBankBalance";
import { PaymentMethod } from "@prisma/client";

describe("operatingBankBalance formulas", () => {
  it("excludes opening balance from cash-in movements", () => {
    expect(isExcludedFromBankCashInNote(`${OPENING_BALANCE_PAYMENT_NOTE_PREFIX}{"bankName":"X"}`)).toBe(true);
  });

  it("includes vadeli closure in when marked as transfer", () => {
    const note =
      "BANK_DESC:1188 0543501 numaralı hesap kapama | ACCOUNT_TRANSFER:VADELI_TO_TL";
    expect(isExcludedFromBankCashInNote(note)).toBe(false);
    expect(
      isOperatingBankPaymentRow({ method: PaymentMethod.BANK_TRANSFER, note })
    ).toBe(true);
  });

  it("includes account transfer even when method is not bank transfer", () => {
    const note = "ACCOUNT_TRANSFER:VADELI_TO_TL | BANK_DESC:1188 kapama";
    expect(
      isOperatingBankPaymentRow({ method: PaymentMethod.CASH, note })
    ).toBe(true);
  });

  it("excludes vadeli closure expense using reference field", () => {
    expect(
      isExcludedFromBankCashOutDescription(null, "1188 0567107 numaralı hesap kapama")
    ).toBe(true);
  });

  it("keeps TL to vadeli expense in cash out", () => {
    expect(
      isExcludedFromBankCashOutDescription("Vadeli aktarim | ACCOUNT_TRANSFER:TL_TO_VADELI", null)
    ).toBe(false);
  });
});

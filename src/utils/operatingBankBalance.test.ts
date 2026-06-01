import { describe, expect, it } from "vitest";
import {
  compareBankMovementsChronologically,
  computeRunningBalancesByMovementId,
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

  it("orders same-day IN before OUT then applies running balance", () => {
    const day = new Date("2026-05-18T10:00:00.000Z");
    const rows = [
      {
        id: "out-1",
        occurredAt: day,
        createdAt: new Date("2026-05-18T10:00:02.000Z"),
        entryType: "OUT" as const,
        amount: 50,
      },
      {
        id: "in-1",
        occurredAt: day,
        createdAt: new Date("2026-05-18T10:00:01.000Z"),
        entryType: "IN" as const,
        amount: 100,
      },
    ];

    expect(compareBankMovementsChronologically(rows[1], rows[0])).toBeLessThan(0);

    const balances = computeRunningBalancesByMovementId(rows, 1000);
    expect(balances.get("in-1")).toBe(1100);
    expect(balances.get("out-1")).toBe(1050);
  });
});

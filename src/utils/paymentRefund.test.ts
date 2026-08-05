import { describe, expect, it } from "vitest";
import {
  PAYMENT_REFUND_EXPENSE_ITEM_CODE,
  buildPaymentRefundExpenseDescription,
  isPaymentRefundExpenseDescription,
  parseDoorNosInput,
  parsePaymentRefundDoorsFromText,
  paymentRefundDoorTag,
  shouldExcludeExpenseFromReports,
} from "./paymentRefund";

describe("paymentRefund util", () => {
  it("parses single and multi door inputs", () => {
    expect(parseDoorNosInput("57")).toEqual(["57"]);
    expect(parseDoorNosInput("57,93")).toEqual(["57", "93"]);
    expect(parseDoorNosInput("57 93")).toEqual(["57", "93"]);
    expect(parseDoorNosInput("57 ve 93")).toEqual(["57", "93"]);
  });

  it("builds and parses refund door tags for multi doors", () => {
    expect(paymentRefundDoorTag(["57", "93"])).toBe("PAYMENT_REFUND:DOOR:57,93");
    expect(parsePaymentRefundDoorsFromText("foo | PAYMENT_REFUND:DOOR:57,93 | bar")).toEqual([
      "57",
      "93",
    ]);
    expect(isPaymentRefundExpenseDescription("Yanlis gelen | PAYMENT_REFUND:DOOR:12")).toBe(true);
    expect(isPaymentRefundExpenseDescription("Normal gider")).toBe(false);
  });

  it("appends refund tag without duplicating", () => {
    expect(
      buildPaymentRefundExpenseDescription({
        doorNos: ["8"],
        description: "Umit Basar iade",
      })
    ).toBe("Umit Basar iade | PAYMENT_REFUND:DOOR:8");

    expect(
      buildPaymentRefundExpenseDescription({
        doorNos: ["57", "93"],
        description: "Already | PAYMENT_REFUND:DOOR:57,93",
      })
    ).toBe("Already | PAYMENT_REFUND:DOOR:57,93");
  });

  it("excludes refunds from expense reports by tag or code", () => {
    expect(
      shouldExcludeExpenseFromReports({
        description: "x | PAYMENT_REFUND:DOOR:1,2",
        expenseItemCode: "SINIFLANDIRILAMAYAN_GIDERLER",
      })
    ).toBe(true);

    expect(
      shouldExcludeExpenseFromReports({
        description: "normal",
        expenseItemCode: PAYMENT_REFUND_EXPENSE_ITEM_CODE,
      })
    ).toBe(true);

    expect(
      shouldExcludeExpenseFromReports({
        description: "Elektrik faturasi",
        expenseItemCode: "ELEKTRIK",
      })
    ).toBe(false);
  });
});

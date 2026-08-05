import { describe, expect, it } from "vitest";
import {
  PAYMENT_REFUND_EXPENSE_ITEM_CODE,
  buildPaymentRefundExpenseDescription,
  isPaymentRefundExpenseDescription,
  parsePaymentRefundDoorFromText,
  paymentRefundDoorTag,
  shouldExcludeExpenseFromReports,
} from "./paymentRefund";

describe("paymentRefund util", () => {
  it("builds and parses refund door tag", () => {
    expect(paymentRefundDoorTag("8")).toBe("PAYMENT_REFUND:DOOR:8");
    expect(parsePaymentRefundDoorFromText("foo | PAYMENT_REFUND:DOOR:8 | bar")).toBe("8");
    expect(isPaymentRefundExpenseDescription("Yanlis gelen | PAYMENT_REFUND:DOOR:12")).toBe(true);
    expect(isPaymentRefundExpenseDescription("Normal gider")).toBe(false);
  });

  it("appends refund tag without duplicating", () => {
    expect(
      buildPaymentRefundExpenseDescription({
        doorNo: "8",
        description: "Umit Basar iade",
      })
    ).toBe("Umit Basar iade | PAYMENT_REFUND:DOOR:8");

    expect(
      buildPaymentRefundExpenseDescription({
        doorNo: "8",
        description: "Already | PAYMENT_REFUND:DOOR:8",
      })
    ).toBe("Already | PAYMENT_REFUND:DOOR:8");
  });

  it("excludes refunds from expense reports by tag or code", () => {
    expect(
      shouldExcludeExpenseFromReports({
        description: "x | PAYMENT_REFUND:DOOR:1",
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

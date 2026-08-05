import { describe, expect, it } from "vitest";
import {
  PAYMENT_REFUND_EXPENSE_ITEM_CODE,
  buildPaymentRefundExpenseDescription,
  isPaymentRefundExpenseDescription,
  parseDoorNosInput,
  parsePaymentRefundDoorsFromText,
  paymentRefundDoorTag,
  planRefundReductions,
  shouldExcludeExpenseFromReports,
  type RefundSource,
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

describe("planRefundReductions", () => {
  const credit = (paymentId: string, availableCents: number): RefundSource => ({
    kind: "CREDIT",
    paymentId,
    paymentItemId: null,
    chargeId: null,
    availableCents,
  });

  const item = (
    paymentId: string,
    paymentItemId: string,
    availableCents: number
  ): RefundSource => ({
    kind: "ITEM",
    paymentId,
    paymentItemId,
    chargeId: `charge-${paymentItemId}`,
    availableCents,
  });

  it("once bekleyen alacaktan duser", () => {
    const { reductions, shortfallCents } = planRefundReductions(10000, [
      credit("p1", 15000),
      item("p2", "i1", 50000),
    ]);

    expect(reductions).toEqual([{ ...credit("p1", 15000), reducedCents: 10000 }]);
    expect(shortfallCents).toBe(0);
  });

  it("alacak yetmezse kalani tahakkuk kalemlerinden duser", () => {
    const { reductions, shortfallCents } = planRefundReductions(30000, [
      credit("p1", 10000),
      item("p2", "i1", 12000),
      item("p3", "i2", 25000),
    ]);

    expect(reductions).toEqual([
      { ...credit("p1", 10000), reducedCents: 10000 },
      { ...item("p2", "i1", 12000), reducedCents: 12000 },
      { ...item("p3", "i2", 25000), reducedCents: 8000 },
    ]);
    expect(shortfallCents).toBe(0);
  });

  it("kaynaklar yetmezse eksigi bildirir", () => {
    const { reductions, shortfallCents } = planRefundReductions(50000, [
      credit("p1", 10000),
      item("p2", "i1", 15000),
    ]);

    expect(reductions.map((x) => x.reducedCents)).toEqual([10000, 15000]);
    expect(shortfallCents).toBe(25000);
  });

  it("hedef karsilandiginda kalan kaynaklara dokunmaz", () => {
    const { reductions } = planRefundReductions(5000, [
      item("p1", "i1", 5000),
      item("p2", "i2", 90000),
    ]);

    expect(reductions).toHaveLength(1);
    expect(reductions[0].paymentItemId).toBe("i1");
  });

  it("bos ve sifir tutarli kaynaklari atlar", () => {
    const { reductions, shortfallCents } = planRefundReductions(1000, [
      credit("p1", 0),
      item("p2", "i1", 0),
      item("p3", "i2", 1000),
    ]);

    expect(reductions).toEqual([{ ...item("p3", "i2", 1000), reducedCents: 1000 }]);
    expect(shortfallCents).toBe(0);
  });

  it("hedef sifirsa hicbir kaynagi tuketmez", () => {
    expect(planRefundReductions(0, [item("p1", "i1", 5000)])).toEqual({
      reductions: [],
      shortfallCents: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import { planPendingCreditAllocations, type OpenChargeSlot, type PendingCreditSource } from "./apartmentCredit";

function source(
  paymentId: string,
  surplusCents: number,
  paidAt = "2026-01-15T00:00:00.000Z"
): PendingCreditSource {
  return {
    paymentId,
    surplusCents,
    paidAt: new Date(paidAt),
    createdAt: new Date(paidAt),
  };
}

function slot(chargeId: string, remainingCents: number): OpenChargeSlot {
  return { chargeId, remainingCents };
}

describe("planPendingCreditAllocations", () => {
  it("fazla tutari ilk acik tahakkuga yazar", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 10000)],
      [slot("c1", 50000)]
    );

    expect(allocations).toEqual([{ paymentId: "p1", chargeId: "c1", amountCents: 10000 }]);
    expect(leftoverCentsByPayment.size).toBe(0);
  });

  it("bir tahakkuga kalan borcundan fazlasini yazmaz, artani sonrakine tasir", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 90000)],
      [slot("c1", 50000), slot("c2", 50000)]
    );

    expect(allocations).toEqual([
      { paymentId: "p1", chargeId: "c1", amountCents: 50000 },
      { paymentId: "p1", chargeId: "c2", amountCents: 40000 },
    ]);
    expect(leftoverCentsByPayment.size).toBe(0);
  });

  it("acik tahakkuk yetmezse kalan tutar bekler", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 80000)],
      [slot("c1", 50000)]
    );

    expect(allocations).toEqual([{ paymentId: "p1", chargeId: "c1", amountCents: 50000 }]);
    expect(leftoverCentsByPayment.get("p1")).toBe(30000);
  });

  it("acik tahakkuk yoksa hicbir sey dagitmaz", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 80000)],
      []
    );

    expect(allocations).toEqual([]);
    expect(leftoverCentsByPayment.get("p1")).toBe(80000);
  });

  it("kapanmis tahakkuklari atlar", () => {
    const { allocations } = planPendingCreditAllocations(
      [source("p1", 10000)],
      [slot("c1", 0), slot("c2", 30000)]
    );

    expect(allocations).toEqual([{ paymentId: "p1", chargeId: "c2", amountCents: 10000 }]);
  });

  it("odemeleri eskiden yeniye tuketir", () => {
    const { allocations } = planPendingCreditAllocations(
      [
        source("yeni", 20000, "2026-03-01T00:00:00.000Z"),
        source("eski", 20000, "2026-01-01T00:00:00.000Z"),
      ],
      [slot("c1", 30000)]
    );

    expect(allocations).toEqual([
      { paymentId: "eski", chargeId: "c1", amountCents: 20000 },
      { paymentId: "yeni", chargeId: "c1", amountCents: 10000 },
    ]);
  });

  it("kurus bazinda calisir, toplamlar birebir korunur", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 97666)],
      [slot("c1", 32555), slot("c2", 32555), slot("c3", 32556)]
    );

    const total = allocations.reduce((sum, x) => sum + x.amountCents, 0);
    expect(total).toBe(97666);
    expect(leftoverCentsByPayment.size).toBe(0);
  });

  it("sifir veya negatif fazla tutari yok sayar", () => {
    const { allocations } = planPendingCreditAllocations(
      [source("p1", 0), source("p2", -500)],
      [slot("c1", 30000)]
    );

    expect(allocations).toEqual([]);
  });
});

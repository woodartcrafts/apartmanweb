import { describe, expect, it } from "vitest";
import { planPendingCreditAllocations, slotAllowedForSource, type OpenChargeSlot } from "./apartmentCredit";
import { restrictSpillToPrimaryTypes } from "./paymentApproval";

const paidAt = new Date("2026-11-02T00:00:00Z");
const createdAt = new Date("2026-11-02T08:00:00Z");

function source(
  paymentId: string,
  surplusCents: number,
  allowedChargeTypeCodes?: string[],
  createdAtOverride: Date = createdAt
) {
  return { paymentId, surplusCents, paidAt, createdAt: createdAtOverride, allowedChargeTypeCodes };
}

const slots: OpenChargeSlot[] = [
  { chargeId: "aidat-aralik", remainingCents: 1200_00, chargeTypeCode: "AIDAT" },
  { chargeId: "gaz-aralik", remainingCents: 400_00, chargeTypeCode: "DOGALGAZ" },
  { chargeId: "boya", remainingCents: 900_00, chargeTypeCode: "DIYAFONBOYA" },
];

describe("planPendingCreditAllocations - tura duyarli fazla tutar", () => {
  it("dogalgaz odemesinin artigi aidata/boyaya degil yalniz dogalgaza yazilir", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 1275_00, ["DOGALGAZ"])],
      slots
    );
    expect(allocations).toEqual([{ paymentId: "p1", chargeId: "gaz-aralik", amountCents: 400_00 }]);
    expect(leftoverCentsByPayment.get("p1")).toBe(875_00);
  });

  it("ayni turde acik kalem yoksa hicbir sey yazilmaz, tutar bekler", () => {
    const { allocations, leftoverCentsByPayment } = planPendingCreditAllocations(
      [source("p1", 300_00, ["DOGALGAZ"])],
      slots.filter((slot) => slot.chargeTypeCode !== "DOGALGAZ")
    );
    expect(allocations).toEqual([]);
    expect(leftoverCentsByPayment.get("p1")).toBe(300_00);
  });

  it("birden cok turu kapatmis odeme (aidat+dogalgaz) ikisine de yazabilir ama boyaya yazamaz", () => {
    const { allocations } = planPendingCreditAllocations(
      [source("p1", 5000_00, ["AIDAT", "DOGALGAZ"])],
      slots
    );
    expect(allocations.map((a) => a.chargeId)).toEqual(["aidat-aralik", "gaz-aralik"]);
  });

  it("tur bilgisi olmayan kaynak (devir/acilis/borcsuz odeme) eski davranisi korur", () => {
    const { allocations } = planPendingCreditAllocations([source("p1", 2000_00)], slots);
    expect(allocations.map((a) => a.chargeId)).toEqual(["aidat-aralik", "gaz-aralik", "boya"]);
    expect(allocations.reduce((sum, a) => sum + a.amountCents, 0)).toBe(2000_00);
  });

  it("tur kodu bilinmeyen kalem kisitlanmaz", () => {
    expect(slotAllowedForSource({ chargeId: "x", remainingCents: 1 }, ["DOGALGAZ"])).toBe(true);
    expect(slotAllowedForSource({ chargeId: "x", remainingCents: 1, chargeTypeCode: "AIDAT" }, ["DOGALGAZ"])).toBe(
      false
    );
    expect(slotAllowedForSource({ chargeId: "x", remainingCents: 1, chargeTypeCode: "AIDAT" }, [])).toBe(true);
  });

  it("iki bekleyen odeme ayni kalemi paylasirken tur kisiti ayri uygulanir", () => {
    const { allocations } = planPendingCreditAllocations(
      [
        source("gaz", 100_00, ["DOGALGAZ"], new Date("2026-11-02T08:00:00Z")),
        source("aidat", 100_00, ["AIDAT"], new Date("2026-11-02T09:00:00Z")),
      ],
      slots
    );
    expect(allocations).toEqual([
      { paymentId: "gaz", chargeId: "gaz-aralik", amountCents: 100_00 },
      { paymentId: "aidat", chargeId: "aidat-aralik", amountCents: 100_00 },
    ]);
  });
});

describe("restrictSpillToPrimaryTypes", () => {
  const typeOf = (chargeId: string) =>
    ({ k1: "AIDAT", k2: "AIDAT", g1: "DOGALGAZ", b1: "DIYAFONBOYA" })[chargeId];

  it("ipucuyla secilen turdeki diger kalemler kalir, baska turler elenir", () => {
    const rest = restrictSpillToPrimaryTypes(
      [{ chargeId: "g1" }],
      [{ chargeId: "k1" }, { chargeId: "k2" }, { chargeId: "b1" }],
      typeOf
    );
    expect(rest).toEqual([]);

    const rest2 = restrictSpillToPrimaryTypes(
      [{ chargeId: "k1" }],
      [{ chargeId: "k2" }, { chargeId: "g1" }, { chargeId: "b1" }],
      typeOf
    );
    expect(rest2).toEqual([{ chargeId: "k2" }]);
  });

  it("ana kalemlerin turu bilinmiyorsa kisitlama yapmaz", () => {
    const rest = restrictSpillToPrimaryTypes([{ chargeId: "?" }], [{ chargeId: "k1" }, { chargeId: "g1" }], typeOf);
    expect(rest).toEqual([{ chargeId: "k1" }, { chargeId: "g1" }]);
  });

  it("tur kodu bilinmeyen kalemi elemez", () => {
    const rest = restrictSpillToPrimaryTypes([{ chargeId: "k1" }], [{ chargeId: "zzz" }, { chargeId: "g1" }], typeOf);
    expect(rest).toEqual([{ chargeId: "zzz" }]);
  });
});

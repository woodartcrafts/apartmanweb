import { describe, expect, it } from "vitest";
import {
  MANUAL_RECONCILE_LOCK_TAG,
  PENDING_APPROVAL_NOTE_PREFIX,
  isAwaitingApproval,
  withApprovedNote,
} from "../routes/adminNoteUtils";
import { isEligibleForAutoApply } from "./apartmentCredit";
import { isLowConfidenceAutoMatch, planApprovalAllocation, suggestTypeFromHistory } from "./paymentApproval";

describe("isLowConfidenceAutoMatch", () => {
  it("FIFO_FALLBACK dusuk guvenlidir (sonekli hali de)", () => {
    expect(isLowConfidenceAutoMatch("FIFO_FALLBACK")).toBe(true);
    expect(isLowConfidenceAutoMatch("FIFO_FALLBACK:TYPE_HINT")).toBe(true);
  });

  it("net eslesmeler dusuk guvenli sayilmaz", () => {
    for (const reason of [
      "EXACT_OLDEST_MATCH",
      "FIFO_SUM_MATCH",
      "UNIQUE_EXACT_PRIORITY",
      "UNIQUE_SUBSET_SUM_MATCH",
      "DESCRIPTION_HINT:KASIM",
    ]) {
      expect(isLowConfidenceAutoMatch(reason)).toBe(false);
    }
    expect(isLowConfidenceAutoMatch(undefined)).toBe(false);
    expect(isLowConfidenceAutoMatch("")).toBe(false);
  });
});

describe("planApprovalAllocation", () => {
  const charges = [
    { chargeId: "a", remainingCents: 100_00 },
    { chargeId: "b", remainingCents: 50_00 },
    { chargeId: "c", remainingCents: 80_00 },
  ];

  it("onerilen dagitim vade sirasiyla FIFO'dur", () => {
    const plan = planApprovalAllocation({ amountCents: 130_00, charges });
    expect(plan.allocations).toEqual([
      { chargeId: "a", amountCents: 100_00 },
      { chargeId: "b", amountCents: 30_00 },
    ]);
    expect(plan.leftoverCents).toBe(0);
  });

  it("secilen kalemlere verilen sirayla yazar, digerlerine dokunmaz", () => {
    const plan = planApprovalAllocation({ amountCents: 60_00, charges, preferredChargeIds: ["c"] });
    expect(plan.allocations).toEqual([{ chargeId: "c", amountCents: 60_00 }]);
    expect(plan.leftoverCents).toBe(0);
  });

  it("secilen kalemlere sigmayan tutar artik olarak doner", () => {
    const plan = planApprovalAllocation({ amountCents: 200_00, charges, preferredChargeIds: ["b", "c"] });
    expect(plan.allocations).toEqual([
      { chargeId: "b", amountCents: 50_00 },
      { chargeId: "c", amountCents: 80_00 },
    ]);
    expect(plan.leftoverCents).toBe(70_00);
  });

  it("acik borcu olmayan ya da bilinmeyen kalemi gecersiz sayar", () => {
    const plan = planApprovalAllocation({
      amountCents: 10_00,
      charges: [...charges, { chargeId: "paid", remainingCents: 0 }],
      preferredChargeIds: ["paid", "zzz", "a"],
    });
    expect(plan.invalidChargeIds).toEqual(["paid", "zzz"]);
    expect(plan.allocations).toEqual([{ chargeId: "a", amountCents: 10_00 }]);
  });

  it("ayni kalem iki kez secilse bile bir kez yazar", () => {
    const plan = planApprovalAllocation({ amountCents: 500_00, charges, preferredChargeIds: ["a", "a"] });
    expect(plan.allocations).toEqual([{ chargeId: "a", amountCents: 100_00 }]);
    expect(plan.leftoverCents).toBe(400_00);
  });

  it("hic acik kalem yoksa dagitim bos, tum tutar artik", () => {
    const plan = planApprovalAllocation({ amountCents: 40_00, charges: [] });
    expect(plan.allocations).toEqual([]);
    expect(plan.leftoverCents).toBe(40_00);
  });
});

describe("onay bekleyen not etiketi", () => {
  const pendingNote = [
    "BANK_REF:ABC",
    "BANK_DESC:AHMET*0067*aidat",
    "DOOR:13",
    `${PENDING_APPROVAL_NOTE_PREFIX}:FIFO_FALLBACK`,
    MANUAL_RECONCILE_LOCK_TAG,
  ].join(" | ");

  it("onay bekleyen notu taniyip otomatik uygulamayi engeller", () => {
    expect(isAwaitingApproval(pendingNote)).toBe(true);
    expect(isAwaitingApproval("BANK_REF:ABC | DOOR:13")).toBe(false);
    expect(isEligibleForAutoApply(pendingNote)).toBe(false);
  });

  it("kilit olmasa bile onay bekleyen odeme otomatik uygulanmaz", () => {
    const withoutLock = `DOOR:13 | ${PENDING_APPROVAL_NOTE_PREFIX}:FIFO_FALLBACK`;
    expect(isEligibleForAutoApply(withoutLock)).toBe(false);
  });

  it("onaylaninca bekleme etiketi kalkar, kilit ve karar izi kalir", () => {
    const approved = withApprovedNote(pendingNote, "AUTO_MATCH:MANUAL_APPROVED");
    expect(isAwaitingApproval(approved)).toBe(false);
    expect(approved).toContain("AUTO_MATCH:MANUAL_APPROVED");
    expect(approved).toContain(MANUAL_RECONCILE_LOCK_TAG);
    expect(approved).toContain("BANK_REF:ABC");
    expect(approved).toContain("DOOR:13");
  });

  it("onay etiketi iki kez eklenmez", () => {
    const once = withApprovedNote(pendingNote, "AUTO_MATCH:MANUAL_APPROVED");
    const twice = withApprovedNote(once, "AUTO_MATCH:MANUAL_APPROVED");
    expect(twice).toBe(once);
  });
});

describe("suggestTypeFromHistory", () => {
  const h = (amountCents: number, ...typeCodes: string[]) => ({ amountCents, typeCodes });

  it("ayni tutar hep ayni turu kapatmissa ipucu verir", () => {
    expect(suggestTypeFromHistory(132500, [h(132500, "DOGALGAZ"), h(132500, "DOGALGAZ"), h(50000, "AIDAT")])).toEqual({
      typeCode: "DOGALGAZ",
      count: 2,
    });
  });

  it("gecmis yoksa null", () => {
    expect(suggestTypeFromHistory(132500, [])).toBeNull();
    expect(suggestTypeFromHistory(132500, [h(50000, "AIDAT")])).toBeNull();
  });

  it("ayni tutar farkli turleri kapatmissa belirsiz: null", () => {
    expect(suggestTypeFromHistory(132500, [h(132500, "DOGALGAZ"), h(132500, "AIDAT")])).toBeNull();
  });

  it("gecmiste birden cok turu kapatan odeme varsa belirsiz: null", () => {
    expect(suggestTypeFromHistory(132500, [h(132500, "AIDAT", "DOGALGAZ")])).toBeNull();
  });

  it("tur kapatmamis (bos) gecmis kayitlari yok sayilir", () => {
    expect(suggestTypeFromHistory(132500, [h(132500), h(132500, "AIDAT")])).toEqual({ typeCode: "AIDAT", count: 1 });
  });
});

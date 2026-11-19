import { describe, expect, it } from "vitest";
import { analyzeDifference, type DiffEvent } from "./utils/differenceSource";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const charge = (date: string, tl: number, label = "Borç"): DiffEvent => ({ date: d(date), kind: "CHARGE", cents: Math.round(tl * 100), label });
const pay = (date: string, tl: number, label = "Ödeme"): DiffEvent => ({ date: d(date), kind: "PAYMENT", cents: Math.round(tl * 100), label });
const NOW = d("2026-11-19");

describe("fark kaynagi", () => {
  it("Daire 80: tam odeme yapan dairede fark tek bir eksik odemeden dogar", () => {
    const events = [
      charge("2026-09-30", 2000), charge("2026-09-30", 3000),
      pay("2026-09-27", 2000), pay("2026-09-27", 3000),
      charge("2026-10-31", 2000), charge("2026-10-31", 3000),
      pay("2026-10-28", 2000), pay("2026-10-28", 3000),
      charge("2026-11-13", 1325, "Doğalgaz 2026-11"),
      pay("2026-11-18", 1135, "doğalgaz ekim"),
      // vadesi gelmemis borclar fark sayilmaz (NOW sonrasi)
      charge("2026-11-30", 2000),
      charge("2026-12-31", 2000),
    ];
    const result = analyzeDifference(events, NOW);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("EKSIK");
    expect(result!.diff).toBe(-190);
    expect(result!.origin.paid).toBe(1135);
    expect(result!.origin.owed).toBe(1325);
    expect(result!.summary).toContain("1.135 ₺ ödeme geldi");
    expect(result!.summary).toContain("190 ₺ eksik kaldı");
    expect(result!.origin.label).toBe("doğalgaz ekim");
  });

  it("Daire 81: 6 Mart'ta 280 TL fazla gelmis, fark o gunden beri tasiniyor", () => {
    const events = [
      charge("2025-12-30", 1600), charge("2026-01-04", 1550),
      pay("2026-01-12", 3150),
      charge("2026-01-31", 2000), charge("2026-02-03", 2470), charge("2026-02-28", 2000), charge("2026-03-03", 1720),
      pay("2026-03-06", 8470),
      pay("2026-03-25", 4215),
      charge("2026-03-31", 2000), charge("2026-04-02", 2215),
      charge("2026-04-30", 2000), charge("2026-04-30", 1730),
      pay("2026-05-22", 6660),
      charge("2026-05-31", 2000), charge("2026-06-08", 930),
      charge("2026-06-30", 3000), charge("2026-06-30", 2000),
      charge("2026-07-30", 3000), charge("2026-07-31", 2000),
      charge("2026-08-31", 3000), charge("2026-08-31", 2000),
      charge("2026-09-30", 2000), charge("2026-09-30", 3000),
      charge("2026-10-31", 2000), charge("2026-10-31", 3000),
      charge("2026-11-13", 1325),
      pay("2026-11-13", 15000),
      pay("2026-11-17", 11325),
    ];
    const result = analyzeDifference(events, NOW);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("FAZLA");
    expect(result!.diff).toBe(280);
    expect(result!.origin.paid).toBe(8470);
    expect(result!.origin.owed).toBe(8190);
    expect(result!.summary).toContain("280 ₺ fazla geldi");
    expect(new Date(result!.origin.date).toISOString().slice(0, 10)).toBe("2026-03-06");
  });

  it("fark yoksa ya da sadece odenmemis borc varsa null doner", () => {
    expect(analyzeDifference([charge("2026-10-31", 2000), pay("2026-10-30", 2000)], NOW)).toBeNull();
    // hic odeme yok: bu fark degil, vadesi gecmis borc
    expect(analyzeDifference([charge("2026-10-31", 2000)], NOW)).toBeNull();
    expect(analyzeDifference([], NOW)).toBeNull();
  });

  it("ayni gun gelen borc once sayilir, o gune kadar gereken tutara dahildir", () => {
    const result = analyzeDifference([charge("2026-11-13", 1325), pay("2026-11-13", 1135)], NOW);
    expect(result!.origin.owed).toBe(1325);
    expect(result!.diff).toBe(-190);
  });

  it("kurus hassasiyetinde hesaplar (kayan nokta hatasi olmaz)", () => {
    const result = analyzeDifference([charge("2026-11-01", 0.3), pay("2026-11-02", 0.1), pay("2026-11-03", 0.2)], NOW);
    expect(result).toBeNull();
  });
});

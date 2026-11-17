import { describe, expect, it } from "vitest";
import { planAutoSplit, resolvePairSplitDoorNos, type SplittableRow } from "./autoSplit";

const doors = new Set(["3", "35", "45", "47", "48", "65", "78", "57", "93"]);

function pay(description: string, amount: number, extra: Partial<SplittableRow> = {}): SplittableRow {
  return { entryType: "PAYMENT", amount, description, ...extra };
}

describe("resolvePairSplitDoorNos", () => {
  it("bilinen cift yazilmissa ikisini de dondurur", () => {
    expect(resolvePairSplitDoorNos("daire 48 ve 65 aidat", doors)).toEqual(["48", "65"]);
    expect(resolvePairSplitDoorNos("ECE*0099*D35VED45 MAYIS26AIDATLAR", doors)).toEqual(["35", "45"]);
  });

  it("ciftin tek uyesi gecse de boler (aidatlar hep birlikte odeniyor)", () => {
    expect(resolvePairSplitDoorNos("daire 65 mayis aidat", doors)).toEqual(["48", "65"]);
  });

  it("aciklamada cift disinda ACIK daire yaziyorsa bolmez (D47 ... *45)", () => {
    expect(resolvePairSplitDoorNos("DAIRE 47 KASIM AIDAT *45", doors)).toEqual([]);
  });

  it("cift uyelerinden biri sistemde yoksa bolmez", () => {
    expect(resolvePairSplitDoorNos("daire 48 ve 65", new Set(["48"]))).toEqual([]);
  });

  it("listede olmayan ciftler (57/93) bolunmez", () => {
    expect(resolvePairSplitDoorNos("D57VED93 MAYIS AIDAT", doors)).toEqual([]);
  });

  it("tarih araligini daire sanmaz", () => {
    expect(resolvePairSplitDoorNos("daire 06-07 aidat", doors)).toEqual([]);
  });
});

describe("planAutoSplit", () => {
  it("bilinen cifti esit boler, kurus farki ilk daireye gider, kaynak satir no yazilir", () => {
    const { rows, splitSourceCount } = planAutoSplit([pay("ref x", 100), pay("daire 48 ve 65 aidat", 1000.01)], doors);
    expect(splitSourceCount).toBe(1);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ doorNo: "48", amount: 500.01, isAutoSplit: true, splitSourceRowNo: 2 });
    expect(rows[2]).toMatchObject({ doorNo: "65", amount: 500, isAutoSplit: true, splitSourceRowNo: 2 });
    expect(rows[1].amount + rows[2].amount).toBeCloseTo(1000.01, 2);
    expect(rows[0]).toMatchObject({ isAutoSplit: false });
  });

  it("sabit tutarli kurali uygular (D3 + D78 3000 TL)", () => {
    const { rows } = planAutoSplit([pay("MUSTAFA YEMEN AGBULUT D78 TADILAT", 5000)], doors);
    expect(rows.map((r) => [r.doorNo, r.amount])).toEqual([
      ["3", 2000],
      ["78", 3000],
    ]);
    expect(rows.every((r) => r.isAutoSplit === true)).toBe(true);
  });

  it("sabit tutarli kuralin dairelerinden biri sistemde yoksa bolmez", () => {
    const { rows } = planAutoSplit([pay("MUSTAFA YEMEN AGBULUT D78 TADILAT", 5000)], new Set(["3"]));
    expect(rows).toHaveLength(1);
    expect(rows[0].isAutoSplit).toBe(false);
  });

  it("gider ve sifir/negatif tutarli satirlara dokunmaz", () => {
    const input: SplittableRow[] = [
      { entryType: "EXPENSE", amount: 500, description: "daire 48 ve 65" },
      pay("daire 48 ve 65", 0),
      pay("daire 48 ve 65", Number.NaN),
    ];
    const { rows, splitSourceCount } = planAutoSplit(input, doors);
    expect(splitSourceCount).toBe(0);
    expect(rows).toHaveLength(3);
  });

  it("onizlemede kaynak satir numarasi olarak rowNo kullanilabilir", () => {
    const input = [{ ...pay("daire 35 ve 45", 800), rowNo: 17 }];
    const { rows } = planAutoSplit(input, doors, { rowNoOf: (row) => row.rowNo });
    expect(rows.map((r) => r.splitSourceRowNo)).toEqual([17, 17]);
  });

  it("IDEMPOTENT: ikinci calistirma satir sayisini ve tutarlari degistirmez (eski 4x hatasi)", () => {
    const input = [pay("daire 48 ve 65 aidat", 1200), pay("daire 3 aidat", 600)];
    const once = planAutoSplit(input, doors);
    const twice = planAutoSplit(once.rows, doors);
    expect(once.rows).toHaveLength(3);
    expect(twice.rows).toHaveLength(3);
    expect(twice.rows).toEqual(once.rows);
    expect(twice.splitSourceCount).toBe(0);
    const total = twice.rows.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBeCloseTo(1800, 2);
  });

  it("zaten bolunmus (splitSourceRowNo dolu) satir aynen gecer", () => {
    const already = pay("daire 48 ve 65", 300, { doorNo: "48", splitSourceRowNo: 5 });
    const { rows } = planAutoSplit([already], doors);
    expect(rows).toEqual([already]);
  });
});

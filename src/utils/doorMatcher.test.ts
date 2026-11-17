import { describe, expect, it } from "vitest";
import { extractDoorNoFromDescription, normalizeKeywordForMatch, type DoorNoRule } from "./doorMatcher";
import { planAutoSplit, type SplittableRow } from "./autoSplit";

/**
 * Regresyon ornekleri: canli veride yanlis daireye/borca yazilan odemelerden cikarilan ORUNTULER.
 * Gercek sakin adlari repoda tutulmaz; adlar uydurmadir, aciklama BICIMI gercektir.
 * Her test, duzeltilen bir hatanin geri gelmesini engeller.
 */

const doors = new Set(
  ["2", "3", "8", "24", "30", "35", "45", "48", "54", "57", "61", "65", "71", "74", "78", "81", "85", "93"]
);

function rule(keyword: string, doorNo: string): DoorNoRule {
  return { keyword, normalizedKeyword: normalizeKeywordForMatch(keyword), doorNo };
}

const rules: DoorNoRule[] = [
  rule("ahmet demir", "54"), // ayni kisi 54 ve 24'un odemesini yapiyor
  rule("ayse kaya", "78"),
  rule("mehmet oz", "81"),
  rule("fatma sen", "71"),
  rule("veli tas", "85"),
  rule("can yildiz", "61"),
  rule("daire 2", "2"),
];

const match = (description: string) => extractDoorNoFromDescription(description, doors, rules);

describe("isim kurali ve aciklamada yazili daire", () => {
  it("D54/D24 oruntusu: aciklamada acik 'D-24' yazan odeme isim kuralinin dairesine (54) gitmez", () => {
    expect(match("AHMET DEMIR*D-24 KASIM 2026 DOGALGAZ AIDAT TL")).toBe("24");
  });

  it("'daire N' yazimi da isim kuralini gecer", () => {
    expect(match("AYSE KAYA daire 2 Temmuz aidati ref 123456")).toBe("2");
  });

  it("aciklamada daire yazmiyorsa isim kurali gecerli", () => {
    expect(match("AHMET DEMIR KASIM AIDAT ODEMESI")).toBe("54");
    expect(match("FATMA SEN EFT ARALIK AIDAT")).toBe("71");
  });

  it("isim kuralinin dairesiyle ayni daire yaziliysa degismez", () => {
    expect(match("MEHMET OZ D-81 KASIM AIDAT ODEMESI")).toBe("81");
  });

  it("aciklamada iki farkli daire yaziliyorsa belirsizdir: isim kurali korunur", () => {
    expect(match("AHMET DEMIR D-24 VE D-54 AIDAT ODEMESI KASIM")).toBe("54");
  });

  it("yazili daire sistemde yoksa isim kurali korunur", () => {
    expect(match("VELI TAS D-999 AIDAT ODEMESI KASIM")).toBe("85");
  });

  it("kesilmis aciklamada sondaki sayi daire sayilmaz (daire 30 -> 'daire 3')", () => {
    expect(match("CAN YILDIZ KASIM AIDAT ODEMESI daire 3")).toBe("61");
  });

  it("'d0galgaz' gibi PDF bozmasi daire sayilmaz", () => {
    expect(match("CAN YILDIZ d0galgaz 5 kasim")).toBe("61");
  });
});

describe("kural olmadan cozumleme", () => {
  it("tek acik daire yazimi", () => {
    expect(match("KASIM AIDAT DAIRE 74 ODEMESI HAVALE")).toBe("74");
    expect(match("D-85 ARALIK AIDAT HAVALE ODEMESI")).toBe("85");
  });

  it("sube/sira + daire bicimi (12/74) daire 74'tur", () => {
    expect(match("FAST 12/74 AIDAT KASIM ODEMESI TESEKKURLER")).toBe("74");
  });

  it("tarih parcalari (28/04/2026, 06/07) daire sayilmaz", () => {
    expect(match("28/04/2026 TARIHLI HAVALE AIDAT ODEMESI KASIM")).toBeNull();
    expect(match("HAVALE 06/07 AIDAT ODEMESI KASIM ARALIK")).toBeNull();
  });

  it("iki farkli acik daire yaziliyorsa belirsiz: null", () => {
    expect(match("D-24 VE D-54 AIDAT ODEMESI KASIM ARALIK")).toBeNull();
  });

  it("hic ipucu yoksa null", () => {
    expect(match("HAVALE AIDAT ODEMESI")).toBeNull();
  });
});

describe("bolme: sakin cifti 93/57 bolunmez, 48/65 bolunur", () => {
  const split = (description: string, amount: number) =>
    planAutoSplit<SplittableRow>([{ entryType: "PAYMENT", amount, description }], doors).rows;

  it("93/57 (artik ayri ayri odeniyor) tek satir kalir", () => {
    expect(split("D57VED93 KASIM AIDAT", 3000)).toHaveLength(1);
    expect(split("DAIRE:93 KASIM DOGALGAZ UCRETI", 1200)).toHaveLength(1);
  });

  it("48/65 esit bolunur", () => {
    const rows = split("DAIRE 48 VE 65 KASIM AIDAT", 3000);
    expect(rows.map((r) => [r.doorNo, r.amount])).toEqual([
      ["48", 1500],
      ["65", 1500],
    ]);
  });
});

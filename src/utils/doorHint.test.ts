import { describe, expect, it } from "vitest";
import { extractWrittenDoorNoFromNormalizedText } from "./doorHint";

const doors = new Set(["2", "3", "13", "14", "24", "30", "54", "78"]);
const extract = (text: string) => extractWrittenDoorNoFromNormalizedText(text, doors);

describe("extractWrittenDoorNoFromNormalizedText", () => {
  it("D-24 yazimini acik daire sayar (Ozgur Koc / D54 vakasi)", () => {
    expect(extract("ozgur koc*0032*d-24 ozgur koc kasim 2026 dogalgaz aidat*0144010")).toBe("24");
  });

  it("farkli ayiricilarla D yazimini kabul eder", () => {
    expect(extract("aidat d:13 kasim odemesi")).toBe("13");
    expect(extract("aidat d/13 kasim odemesi")).toBe("13");
    expect(extract("aidat d.13 kasim odemesi")).toBe("13");
    expect(extract("aidat d#13 kasim odemesi")).toBe("13");
  });

  it("daire N yazimini kabul eder (basindaki sifirlar atilir)", () => {
    expect(extract("daire 13 kasim aidat odemesi")).toBe("13");
    expect(extract("daire:013 kasim aidat odemesi")).toBe("13");
    expect(extract("nail umut aykurt*daire 2 temmuz aidati*xyz")).toBe("2");
  });

  it("ayiricisiz 'd 24' yazimini kabul etmez", () => {
    expect(extract("kasim aidat d 24 odemesi yapilmistir")).toBeNull();
  });

  it("PDF bozmasi 'd0galgaz 5' acik daire degildir", () => {
    expect(extract("d0galgaz 5 kasim odemesi yapildi")).toBeNull();
  });

  it("metnin sonunda kesilmis sayiyi dikkate almaz (daire 3 <- daire 30)", () => {
    expect(extract("ahmet yilmaz*0067*kasim aidat daire 3")).toBeNull();
    expect(extract("ahmet yilmaz*0067*kasim aidat d-3")).toBeNull();
  });

  it("birden fazla farkli daire yaziyorsa belirsizdir", () => {
    expect(extract("daire 13 ve daire 14 kasim aidat odemesi")).toBeNull();
    expect(extract("d-13 daire 14 kasim aidat odemesi")).toBeNull();
  });

  it("ayni daire iki kez yazilirsa tek daire sayilir", () => {
    expect(extract("daire 13 kasim aidat d-13 odemesi tamam")).toBe("13");
  });

  it("sistemde olmayan daire numarasini yok sayar", () => {
    expect(extract("daire 99 kasim aidat odemesi tamam")).toBeNull();
    expect(extract("daire 99 daire 13 kasim aidat odemesi")).toBe("13");
  });

  it("bos metinde null doner", () => {
    expect(extract("")).toBeNull();
    expect(extract("   ")).toBeNull();
  });
});

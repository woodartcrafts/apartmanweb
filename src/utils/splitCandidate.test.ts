import { describe, expect, it } from "vitest";
import {
  KNOWN_SPLIT_PAIRS,
  collectAlreadySplitBankRefs,
  detectSplitCandidateDoorNos,
  resolveKnownPairDoorNos,
} from "./splitCandidate";

describe("collectAlreadySplitBankRefs", () => {
  it("birden fazla kayitta gecen referansi bolunmus sayar", () => {
    const result = collectAlreadySplitBankRefs(["REF-A", "REF-A", "REF-B"]);
    expect([...result]).toEqual(["REF-A"]);
  });

  it("tek kayitta gecen referansi bolunmus saymaz", () => {
    expect(collectAlreadySplitBankRefs(["REF-A", "REF-B"]).size).toBe(0);
  });

  it("bos ve tanimsiz referanslari yok sayar", () => {
    expect(collectAlreadySplitBankRefs([null, undefined, "", "  ", null]).size).toBe(0);
  });

  it("bastaki/sondaki bosluklari ayni referans kabul eder", () => {
    expect([...collectAlreadySplitBankRefs([" REF-A", "REF-A "])]).toEqual(["REF-A"]);
  });
});

describe("resolveKnownPairDoorNos", () => {
  it("cift birlikte gectiginde ikisini birden dondurur", () => {
    expect(resolveKnownPairDoorNos("BULENT GUNER*0099*D57VED93 MAYIS26AIDATLAR")).toEqual(["57", "93"]);
    expect(resolveKnownPairDoorNos("daire 48 ve 65 aidat")).toEqual(["48", "65"]);
  });

  it("ciftin tek uyesi gectiginde de ikisini dondurur (kullanici istegi)", () => {
    expect(resolveKnownPairDoorNos("daire 57 mayis aidat")).toEqual(["57", "93"]);
    expect(resolveKnownPairDoorNos("d 35 haziran")).toEqual(["35", "45"]);
  });

  it("bilinen cift disindaki daireler icin bos doner", () => {
    expect(resolveKnownPairDoorNos("daire 6 ve 7 aidat")).toEqual([]);
    expect(resolveKnownPairDoorNos("daire 06-07 aidat")).toEqual([]);
    expect(resolveKnownPairDoorNos("d-8 ziya tahan haziran 06-07")).toEqual([]);
    expect(resolveKnownPairDoorNos("daire 12 aidat")).toEqual([]);
  });

  it("daire numarasi baska bir sayinin icindeyse eslesmez", () => {
    expect(resolveKnownPairDoorNos("ref 1579 aidat")).toEqual([]);
    expect(resolveKnownPairDoorNos("tutar 935 tl")).toEqual([]);
  });

  it("tanimli ciftler kullanicinin verdigi listeyle ayni", () => {
    expect(KNOWN_SPLIT_PAIRS.flat().sort()).toEqual(["35", "45", "48", "57", "65", "93"]);
  });
});

describe("detectSplitCandidateDoorNos", () => {
  it("birden fazla daireye isaret eden kaliplari yakalar", () => {
    expect(detectSplitCandidateDoorNos("daire 6 ve 7 aidat")).toEqual(["6", "7"]);
    expect(detectSplitCandidateDoorNos("daire 6,7 aidat")).toEqual(["6", "7"]);
    expect(detectSplitCandidateDoorNos("d12 ve d15 mayis")).toEqual(["12", "15"]);
    expect(detectSplitCandidateDoorNos("daire 06-07 aidat")).toEqual(["6", "7"]);
  });

  it("bastaki sifirlari temizler", () => {
    expect(detectSplitCandidateDoorNos("daire 06 ve 07")).toEqual(["6", "7"]);
  });

  it("tek daire varsa aday saymaz", () => {
    expect(detectSplitCandidateDoorNos("daire 8 haziran aidat")).toEqual([]);
    expect(detectSplitCandidateDoorNos("d-8 ziya tahan haziran")).toEqual([]);
  });

  it("bos ve gecersiz girdilerde bos doner", () => {
    expect(detectSplitCandidateDoorNos("")).toEqual([]);
    expect(detectSplitCandidateDoorNos(null)).toEqual([]);
    expect(detectSplitCandidateDoorNos(undefined)).toEqual([]);
  });

  it("otomatik bolme artik bu kalibi kullanmiyor: aday olan satir bilinen cift degilse bolunmez", () => {
    const description = "daire 6 ve 7 aidat";
    expect(detectSplitCandidateDoorNos(description).length).toBeGreaterThanOrEqual(2);
    expect(resolveKnownPairDoorNos(description)).toEqual([]);
  });
});

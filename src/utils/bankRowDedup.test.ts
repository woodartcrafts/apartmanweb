import { describe, expect, it } from "vitest";
import {
  bankDayNumber,
  classifyReference,
  extractPayerKey,
  extractTxNumbers,
  findCrossSourceDuplicateRowNos,
  groupExistingPaymentsByReference,
  groupRowsIntoTransactions,
  normalizeDescriptionKey,
  planCrossSourceDuplicates,
  type CommitRowLike,
  type ExistingPaymentRecord,
} from "./bankRowDedup";

const DEKONT_REF = "11188005235620261110214706978";
const HASH_REF = "4485057610F36B33";
const DESC = "BERİL KARAMAN*0067*Daire: 13 Beril Karaman, Kasim aidat*34925123456*FAST";

function existingPayment(
  ref: string,
  paidAt: string,
  amount: number,
  description = DESC,
  extra: string[] = []
): ExistingPaymentRecord {
  return {
    note: [`BANK_REF:${ref}`, `BANK_DESC:${description}`, ...extra].join(" | "),
    paidAt: new Date(paidAt),
    totalAmount: amount,
  };
}

function incomingRow(overrides: Partial<CommitRowLike> = {}): CommitRowLike {
  return {
    occurredAt: new Date("2026-11-17T00:00:00Z"),
    amount: 1500,
    entryType: "PAYMENT",
    description: DESC,
    reference: HASH_REF,
    ...overrides,
  };
}

describe("yardimci fonksiyonlar", () => {
  it("banka gunu UTC gunudur; 22:30 duvar saati ayni gunde kalir", () => {
    expect(bankDayNumber(new Date("2026-11-17T22:30:00Z"))).toBe(bankDayNumber(new Date("2026-11-17T00:00:00Z")));
    expect(bankDayNumber(new Date("2026-11-18T00:00:00Z"))).toBe(bankDayNumber(new Date("2026-11-17T00:00:00Z")) + 1);
  });

  it("aciklamayi Turkce karakter ve noktalamadan bagimsiz normalize eder", () => {
    expect(normalizeDescriptionKey("BERİL  KARAMAN*0067*Kasım aidat")).toBe(
      normalizeDescriptionKey("beril karaman 0067 kasim aidat")
    );
  });

  it("odeyen adini ilk yildiz bolumunden cikarir", () => {
    expect(extractPayerKey(DESC)).toBe("beril karaman");
    expect(extractPayerKey("yildizsiz aciklama")).toBe("");
  });

  it("uzun rakam dizilerini islem numarasi sayar", () => {
    expect([...extractTxNumbers(DESC)]).toEqual(["34925123456"]);
    expect(extractTxNumbers("Daire 13 0067").size).toBe(0);
  });

  it("referans turunu ayirir", () => {
    expect(classifyReference(HASH_REF)).toBe("HASH");
    expect(classifyReference(DEKONT_REF)).toBe("STATEMENT_REF");
    expect(classifyReference("")).toBe("NONE");
    expect(classifyReference(undefined)).toBe("NONE");
  });
});

describe("groupExistingPaymentsByReference", () => {
  it("bolunmus odemeleri ayni BANK_REF altinda toplar", () => {
    const grouped = groupExistingPaymentsByReference([
      existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 700, DESC, ["BANK_SPLIT:R1"]),
      existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 800, DESC, ["BANK_SPLIT:R1"]),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].amountCents).toBe(150000);
    expect(grouped[0].refKind).toBe("STATEMENT_REF");
    expect(grouped[0].description).toBe(DESC);
  });

  it("BANK_REF'i olmayan odemeleri yok sayar", () => {
    expect(
      groupExistingPaymentsByReference([{ note: "MANUEL", paidAt: new Date("2026-11-17T00:00:00Z"), totalAmount: 10 }])
    ).toHaveLength(0);
  });
});

describe("groupRowsIntoTransactions", () => {
  it("ayni kaynaktan bolunmus satirlari tek islemde toplar", () => {
    const grouped = groupRowsIntoTransactions([
      incomingRow({ amount: 700, splitSourceRowNo: 1 }),
      incomingRow({ amount: 800, splitSourceRowNo: 1 }),
      incomingRow({ amount: 250 }),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].rowNos).toEqual([1, 2]);
    expect(grouped[0].amountCents).toBe(150000);
    expect(grouped[1].rowNos).toEqual([3]);
  });
});

describe("findCrossSourceDuplicateRowNos", () => {
  it("Excel'den yuklenen islemi Gmail PDF satiri olarak tekrar yuklemez", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow()], existing);
    expect([...duplicates]).toEqual([1]);
  });

  it("Gmail PDF'den yuklenen islemi sonradan Excel satiri olarak tekrar yuklemez", () => {
    const existing = [existingPayment(HASH_REF, "2026-11-17T00:00:00Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow({ reference: DEKONT_REF, occurredAt: new Date("2026-11-17T16:27:26Z") })],
      existing
    );
    expect([...duplicates]).toEqual([1]);
  });

  it("21:00 sonrasi Excel saati ayni gundeki PDF satiriyla eslesir (saat dilimi kaymasi yok)", () => {
    const existing = [existingPayment(HASH_REF, "2026-11-17T00:00:00Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow({ reference: DEKONT_REF, occurredAt: new Date("2026-11-17T22:45:10Z") })],
      existing
    );
    expect([...duplicates]).toEqual([1]);
  });

  it("ayni referans turunde farkli referanslari farkli islem sayar", () => {
    const existing = [existingPayment("AAAAAAAAAAAAAAAA", "2026-11-17T00:00:00Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow({ reference: "BBBBBBBBBBBBBBBB" })], existing);
    expect(duplicates.size).toBe(0);
  });

  it("farkli tutari mukerrer saymaz", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    expect(findCrossSourceDuplicateRowNos([incomingRow({ amount: 1500.01 })], existing).size).toBe(0);
  });

  it("adet bazlidir: DB'de 1 kayit varsa gelen 2 ayni satirdan yalniz biri mukerrerdir", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow(), incomingRow({ reference: "0000000000000001" })],
      existing
    );
    expect(duplicates.size).toBe(1);
  });

  it("bolunmus mevcut kayitlari (D48+D65 gibi) tek PDF satiriyla eslestirir", () => {
    const existing = [
      existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 700, DESC, ["BANK_SPLIT:R1"]),
      existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 800, DESC, ["BANK_SPLIT:R1"]),
    ];
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow()], existing);
    expect([...duplicates]).toEqual([1]);
  });

  it("gelen bolunmus satirlarin hepsini birlikte mukerrer isaretler", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow({ amount: 700, splitSourceRowNo: 1 }), incomingRow({ amount: 800, splitSourceRowNo: 1 })],
      existing
    );
    expect([...duplicates].sort()).toEqual([1, 2]);
  });

  it("ayni gun ayni tutar ayni odeyen ama FARKLI islem numarasi: ayri odemedir", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const otherDesc = "BERİL KARAMAN*0067*Daire: 13 Beril Karaman, Kasim aidat*99999888777*FAST";
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow({ description: otherDesc })], existing);
    expect(duplicates.size).toBe(0);
  });

  it("aciklama kisaltilmis olsa da ayni gun + ayni odeyen + ayni tutar ile yakalar", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const shortDesc = "BERİL KARAMAN*0067*Daire 13";
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow({ description: shortDesc })], existing);
    expect([...duplicates]).toEqual([1]);
  });

  it("ortak islem numarasi varsa 1 gunluk tarih kaymasini tolere eder", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T23:59:00Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow({ occurredAt: new Date("2026-11-18T00:00:00Z") })],
      existing
    );
    expect([...duplicates]).toEqual([1]);
  });

  it("islem numarasi yoksa ardisik gunlerdeki ayni odemeyi ayri sayar", () => {
    const noNumberDesc = "BERİL KARAMAN*0067*Kasim aidat odemesi yapildi*FAST";
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T10:00:00Z", 1500, noNumberDesc)];
    const duplicates = findCrossSourceDuplicateRowNos(
      [incomingRow({ description: noNumberDesc, occurredAt: new Date("2026-11-18T00:00:00Z") })],
      existing
    );
    expect(duplicates.size).toBe(0);
  });

  it("gider satirlarini ve negatif tutarlari yok sayar", () => {
    const existing = [existingPayment(DEKONT_REF, "2026-11-17T16:27:26Z", 1500)];
    const duplicates = findCrossSourceDuplicateRowNos([incomingRow({ entryType: "EXPENSE" })], existing);
    expect(duplicates.size).toBe(0);
  });
});

describe("planCrossSourceDuplicates", () => {
  it("tur kisitlamasi verilmediginde (refKind yok) yine eslestirir", () => {
    const duplicates = planCrossSourceDuplicates(
      [{ key: "a", occurredAt: new Date("2026-11-17T00:00:00Z"), amountCents: 5000, description: DESC }],
      [{ occurredAt: new Date("2026-11-17T09:00:00Z"), amountCents: 5000, description: DESC }]
    );
    expect(duplicates.has("a")).toBe(true);
  });
});

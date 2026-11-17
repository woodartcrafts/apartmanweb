import { describe, expect, it } from "vitest";
import { auditPayments } from "./paymentAudit";
import {
  dayKeyInZone,
  digestAttentionCount,
  isDailyReportOverdue,
  mergeSyncSummaries,
  minutesOfDayInZone,
  type DailyDigest,
  type DigestPaymentLine,
  type DigestSyncSummary,
} from "./dailyDigest";

const emptyAudit = () => auditPayments({ payments: [], charges: [], doorNoSet: new Set(), windowDays: 45 });
const line = (n: number): DigestPaymentLine => ({
  paidAt: "2026-11-12T00:00:00.000Z",
  amount: 1325,
  doorLabel: `Daire ${n}`,
  description: "AHMET DEMIR*D-24 KASIM 2026 DOĞALGAZ AİDAT",
  reason: "Açık borcu aşan ödeme",
});
const base = (): DailyDigest => ({
  dayKey: "2026-11-18",
  generatedAt: "2026-11-18T09:00:00.000Z",
  dayLabel: "18.11.2026",
  sync: null,
  audit: emptyAudit(),
  awaiting: [],
  pending: { count: 0, total: 0, lines: [] },
});
const sync = (overrides: Partial<DigestSyncSummary> = {}): DigestSyncSummary => ({
  importedPaymentCount: 0,
  importedExpenseCount: 0,
  importedBatchCount: 0,
  skippedRowCount: 0,
  errorCount: 0,
  failureNote: null,
  ...overrides,
});

describe("digestAttentionCount", () => {
  it("hiçbir şey yoksa 0", () => {
    expect(digestAttentionCount(base())).toBe(0);
  });

  it("onay bekleyenler ve senkron hatası sayılır; ortada kalan alacak tek başına sayılmaz", () => {
    const digest: DailyDigest = {
      ...base(),
      sync: sync({ errorCount: 1, failureNote: "Gmail oturumu reddedildi" }),
      awaiting: [line(1), line(2)],
      pending: { count: 1, total: 1000, lines: [line(3)] },
    };
    expect(digestAttentionCount(digest)).toBe(3);
  });

  it("önemli/orta bulgular sayılır, INFO sayılmaz", () => {
    const audit = auditPayments({
      payments: [
        { id: "p1", paidAt: new Date("2026-11-12T00:00:00Z"), totalAmount: 1325, note: "BANK_REF:1 | BANK_DESC:X D-24 KASIM AIDAT TL | DOOR:54", linkedDoorNos: [] },
      ],
      charges: [],
      doorNoSet: new Set(["24", "54"]),
      windowDays: 45,
    });
    const actionable = audit.findings.filter((finding) => finding.severity !== "INFO").length;
    expect(actionable).toBeGreaterThan(0);
    expect(digestAttentionCount({ ...base(), audit })).toBe(actionable);
  });
});

describe("saat dilimi yardımcıları (Europe/Istanbul, UTC+3)", () => {
  const tz = "Europe/Istanbul";

  it("UTC gece yarısından sonraki saatler İstanbul'da aynı güne düşer, 21:00 UTC ertesi güne", () => {
    expect(dayKeyInZone(new Date("2026-11-18T08:00:00Z"), tz)).toBe("2026-11-18");
    expect(dayKeyInZone(new Date("2026-11-17T21:00:00Z"), tz)).toBe("2026-11-18");
    expect(dayKeyInZone(new Date("2026-11-17T20:59:00Z"), tz)).toBe("2026-11-17");
  });

  it("günün dakikası İstanbul saatine göre hesaplanır", () => {
    expect(minutesOfDayInZone(new Date("2026-11-18T09:00:00Z"), tz)).toBe(12 * 60);
    expect(minutesOfDayInZone(new Date("2026-11-17T21:00:00Z"), tz)).toBe(0);
  });
});

describe("isDailyReportOverdue", () => {
  const tz = "Europe/Istanbul";
  const args = { timeZone: tz, scheduleHour: 12, scheduleMinute: 0 };

  it("bugünün raporu varsa asla gecikmiş değildir", () => {
    expect(isDailyReportOverdue({ ...args, now: new Date("2026-11-18T20:00:00Z"), hasTodayReport: true })).toBe(false);
  });

  it("12:00 + 30 dk toleransından önce uyarı vermez", () => {
    expect(isDailyReportOverdue({ ...args, now: new Date("2026-11-18T09:29:00Z"), hasTodayReport: false })).toBe(false);
    expect(isDailyReportOverdue({ ...args, now: new Date("2026-11-18T05:00:00Z"), hasTodayReport: false })).toBe(false);
  });

  it("12:30'dan sonra rapor yoksa uyarır", () => {
    expect(isDailyReportOverdue({ ...args, now: new Date("2026-11-18T09:30:00Z"), hasTodayReport: false })).toBe(true);
  });
});

describe("mergeSyncSummaries", () => {
  it("biri yoksa diğerini döndürür", () => {
    expect(mergeSyncSummaries(null, null)).toBeNull();
    expect(mergeSyncSummaries(null, sync({ importedPaymentCount: 2 }))?.importedPaymentCount).toBe(2);
    expect(mergeSyncSummaries(sync({ importedPaymentCount: 3 }), null)?.importedPaymentCount).toBe(3);
  });

  it("ice aktarılanlar toplanır, hata durumu son çalışmanınkidir", () => {
    const merged = mergeSyncSummaries(
      sync({ importedPaymentCount: 5, importedExpenseCount: 1, importedBatchCount: 2, errorCount: 1, failureNote: "eski hata" }),
      sync({ importedPaymentCount: 1, importedBatchCount: 1 })
    );
    expect(merged).toEqual(sync({ importedPaymentCount: 6, importedExpenseCount: 1, importedBatchCount: 3 }));
  });
});

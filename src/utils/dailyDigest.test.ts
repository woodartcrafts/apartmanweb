import { describe, expect, it } from "vitest";
import { auditPayments } from "./paymentAudit";
import { buildDailyDigestEmail, digestAttentionCount, type DailyDigest, type DigestPaymentLine } from "./dailyDigest";

const emptyAudit = () => auditPayments({ payments: [], charges: [], doorNoSet: new Set(), windowDays: 45 });
const line = (n: number): DigestPaymentLine => ({
  paidAt: `2026-11-${String(10 + (n % 10)).padStart(2, "0")}T00:00:00.000Z`,
  amount: 1325,
  doorLabel: `D${n}`,
  description: "AHMET DEMIR*D-24 KASIM 2026 DOĞALGAZ AİDAT",
  reason: "Açık borcu aşan ödeme",
});
const base = (): DailyDigest => ({
  dayLabel: "18.11.2026",
  sync: null,
  audit: emptyAudit(),
  awaiting: [],
  pending: { count: 0, total: 0, lines: [] },
});

describe("buildDailyDigestEmail", () => {
  it("hiçbir şey yoksa 'bakılacak bir şey yok' der", () => {
    const mail = buildDailyDigestEmail(base());
    expect(mail.subject).toBe("ApartmanWeb günlük özet 18.11.2026: bakılacak bir şey yok");
    expect(mail.text).toContain("Bugün bakılması gereken bir kayıt yok.");
    expect(digestAttentionCount(base())).toBe(0);
  });

  it("senkron sonucu, onay bekleyenler ve bekleyen alacaklar listelenir", () => {
    const digest: DailyDigest = {
      ...base(),
      sync: { importedPaymentCount: 5, importedExpenseCount: 1, importedBatchCount: 2, skippedRowCount: 0, errorCount: 0, failureNote: null },
      awaiting: [line(1), line(2)],
      pending: { count: 1, total: 1000, lines: [line(3)] },
    };
    const mail = buildDailyDigestEmail(digest);
    expect(mail.subject).toContain("bakılması gereken 2 konu var");
    expect(mail.text).toContain("5 yeni ödeme, 1 gider işlendi");
    expect(mail.text).toContain("ONAY BEKLEYEN ÖDEMELER (2)");
    expect(mail.text).toContain("ORTADA KALAN ALACAKLAR: 1 ödeme, toplam 1.000,00 TL");
    expect(mail.text).toContain("D3");
  });

  it("senkron hatası konu sayısına eklenir ve başta görünür", () => {
    const digest: DailyDigest = {
      ...base(),
      sync: { importedPaymentCount: 0, importedExpenseCount: 0, importedBatchCount: 0, skippedRowCount: 0, errorCount: 1, failureNote: "Gmail oturumu reddedildi" },
    };
    expect(digestAttentionCount(digest)).toBe(1);
    expect(buildDailyDigestEmail(digest).text).toContain("Gmail senkronu SORUNLU: Gmail oturumu reddedildi");
  });

  it("denetim bulguları listelenir; liste 15 satırla sınırlanır ve kalan sayısı yazılır", () => {
    const audit = auditPayments({
      payments: [
        { id: "p1", paidAt: new Date("2026-11-12T00:00:00Z"), totalAmount: 1325, note: "BANK_REF:1 | BANK_DESC:X D-24 KASIM AIDAT TL | DOOR:54", linkedDoorNos: [] },
      ],
      charges: [],
      doorNoSet: new Set(["24", "54"]),
      windowDays: 45,
    });
    const many = Array.from({ length: 20 }, (_, i) => line(i + 1));
    const mail = buildDailyDigestEmail({ ...base(), audit, pending: { count: 20, total: 26500, lines: many } });
    expect(mail.text).toContain("BAKILMASI GEREKEN KAYITLAR (1)");
    expect(mail.text).toContain("[ÖNEMLİ]");
    expect(mail.text).toContain("… ve 5 kayıt daha");
    expect(mail.text.split("\n").filter((l) => l.startsWith("- 1")).length).toBeLessThanOrEqual(16);
  });

  it("HTML çıktısı kaçışlıdır", () => {
    const mail = buildDailyDigestEmail({
      ...base(),
      awaiting: [{ ...line(1), description: "<b>&</b>" }],
    });
    expect(mail.html).toContain("&lt;b&gt;&amp;&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>&</b>");
  });
});

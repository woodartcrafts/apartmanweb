/**
 * Gunluk denetim raporu ("gunun ozeti"): yoneticiye "bugun bakilmasi gereken bir sey var mi" sorusunun cevabi.
 * Hicbir kaydi degistirmez; okunmus verilerden uretilir ve veritabaninda gun basina bir satir olarak saklanir.
 */

import type { AuditReport } from "./paymentAudit";

export type DigestSyncSummary = {
  importedPaymentCount: number;
  importedExpenseCount: number;
  importedBatchCount: number;
  skippedRowCount: number;
  errorCount: number;
  /** Senkron hata verdiyse kisa aciklama; sorun yoksa null. */
  failureNote: string | null;
};

export type DigestPaymentLine = {
  paidAt: string;
  amount: number;
  doorLabel: string;
  description: string;
  reason: string;
};

export type DailyDigest = {
  /** Raporun ait oldugu gun (yyyy-mm-dd, uygulamanin saat diliminde). */
  dayKey: string;
  /** Rapor verisinin en son hesaplandigi an (ISO). */
  generatedAt: string;
  /** Gun etiketi (gg.aa.yyyy). */
  dayLabel: string;
  sync: DigestSyncSummary | null;
  audit: AuditReport;
  awaiting: DigestPaymentLine[];
  pending: { count: number; total: number; lines: DigestPaymentLine[] };
};

/** Veritabaninda saklanan satir basina ust sinir (ekranda hepsi gosterilir). */
export const DIGEST_MAX_LINES = 200;

/** "Zamanlayici gec kaldi" uyarisi icin tolerans: planlanan saatten sonra bu kadar dakika beklenir. */
export const DAILY_REPORT_GRACE_MINUTES = 30;

/** Dikkat gerektiren konu sayisi: onemli/orta bulgular + onay bekleyenler + senkron sorunu. */
export function digestAttentionCount(digest: DailyDigest): number {
  const findings = digest.audit.findings.filter((finding) => finding.severity !== "INFO").length;
  return findings + digest.awaiting.length + (digest.sync?.failureNote ? 1 : 0);
}

/** Verilen an, verilen saat diliminde hangi gune denk geliyor (yyyy-mm-dd). */
export function dayKeyInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Verilen an, verilen saat diliminde gece yarisindan kac dakika sonra. */
export function minutesOfDayInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Bugunun raporu yok ve planlanan saat + tolerans gectiyse true: zamanlayici calismamis demektir. */
export function isDailyReportOverdue(args: {
  now: Date;
  timeZone: string;
  scheduleHour: number;
  scheduleMinute: number;
  hasTodayReport: boolean;
  graceMinutes?: number;
}): boolean {
  if (args.hasTodayReport) {
    return false;
  }
  const dueMinutes = args.scheduleHour * 60 + args.scheduleMinute + (args.graceMinutes ?? DAILY_REPORT_GRACE_MINUTES);
  return minutesOfDayInZone(args.now, args.timeZone) >= dueMinutes;
}

/**
 * Ayni gun senkron birden fazla calisirsa (ornegin servis yeniden baslarsa) yeni ice aktarilanlar toplanir;
 * hata durumu ise en son calismanin durumudur.
 */
export function mergeSyncSummaries(
  previous: DigestSyncSummary | null,
  next: DigestSyncSummary | null
): DigestSyncSummary | null {
  if (!previous) {
    return next;
  }
  if (!next) {
    return previous;
  }
  return {
    importedPaymentCount: previous.importedPaymentCount + next.importedPaymentCount,
    importedExpenseCount: previous.importedExpenseCount + next.importedExpenseCount,
    importedBatchCount: previous.importedBatchCount + next.importedBatchCount,
    skippedRowCount: previous.skippedRowCount + next.skippedRowCount,
    errorCount: next.errorCount,
    failureNote: next.failureNote,
  };
}

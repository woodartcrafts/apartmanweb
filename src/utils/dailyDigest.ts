/**
 * Gunluk ozet e-postasi: yoneticiye "bugun bakilmasi gereken bir sey var mi" sorusunun cevabi.
 * Hicbir kaydi degistirmez; yalnizca okunmus verilerden metin uretir.
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
  dayLabel: string;
  sync: DigestSyncSummary | null;
  audit: AuditReport;
  awaiting: DigestPaymentLine[];
  pending: { count: number; total: number; lines: DigestPaymentLine[] };
};

export type DigestSendResult = {
  status: "sent" | "no_recipient" | "already_sent" | "no_sender";
  recipientCount: number;
};

export const DIGEST_MAX_LINES = 15;

function formatTry(amount: number): string {
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function formatDayTr(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function paymentLine(line: DigestPaymentLine): string {
  const description = line.description ? ` — "${shorten(line.description, 70)}"` : "";
  return `- ${formatDayTr(line.paidAt)} ${formatTry(line.amount)} ${line.doorLabel}${description} (${line.reason})`;
}

function limited(lines: DigestPaymentLine[], total: number): string[] {
  const shown = lines.slice(0, DIGEST_MAX_LINES).map(paymentLine);
  if (total > shown.length) {
    shown.push(`… ve ${total - shown.length} kayıt daha (Yönetim > Daire Alacakları)`);
  }
  return shown;
}

/** Dikkat gerektiren konu sayisi: onemli/orta bulgular + onay bekleyenler + senkron sorunu. */
export function digestAttentionCount(digest: DailyDigest): number {
  const findings = digest.audit.findings.filter((finding) => finding.severity !== "INFO").length;
  return findings + digest.awaiting.length + (digest.sync?.failureNote ? 1 : 0);
}

export function buildDailyDigestEmail(digest: DailyDigest): { subject: string; text: string; html: string } {
  const attention = digestAttentionCount(digest);
  const subject =
    attention > 0
      ? `ApartmanWeb günlük özet ${digest.dayLabel}: bakılması gereken ${attention} konu var`
      : `ApartmanWeb günlük özet ${digest.dayLabel}: bakılacak bir şey yok`;

  const lines: string[] = [`ApartmanWeb günlük özet — ${digest.dayLabel}`, ""];

  if (digest.sync) {
    const sync = digest.sync;
    lines.push(
      sync.failureNote
        ? `Gmail senkronu SORUNLU: ${sync.failureNote}`
        : `Gmail senkronu: ${sync.importedPaymentCount} yeni ödeme, ${sync.importedExpenseCount} gider işlendi (${sync.importedBatchCount} dosya, ${sync.skippedRowCount} satır atlandı). Hata yok.`
    );
    lines.push("");
  }

  const actionable = digest.audit.findings.filter((finding) => finding.severity !== "INFO");
  if (actionable.length > 0) {
    lines.push(`BAKILMASI GEREKEN KAYITLAR (${actionable.length}):`);
    for (const finding of actionable) {
      lines.push(`- [${finding.severity === "HIGH" ? "ÖNEMLİ" : "ORTA"}] ${finding.message}`);
    }
    lines.push("");
  }

  if (digest.awaiting.length > 0) {
    lines.push(`ONAY BEKLEYEN ÖDEMELER (${digest.awaiting.length}) — hiçbir borca yazılmadı, sizin onayınızı bekliyor:`);
    lines.push(...limited(digest.awaiting, digest.awaiting.length));
    lines.push("");
  }

  if (digest.pending.count > 0) {
    lines.push(
      `ORTADA KALAN ALACAKLAR: ${digest.pending.count} ödeme, toplam ${formatTry(digest.pending.total)} (borca yazılmamış tutar; yeni tahakkukta otomatik uygulanır ya da elle yazılır):`
    );
    lines.push(...limited(digest.pending.lines, digest.pending.count));
    lines.push("");
  }

  if (attention === 0 && digest.pending.count === 0) {
    lines.push("Bugün bakılması gereken bir kayıt yok.", "");
  }

  lines.push(
    `Taranan ödeme: son ${digest.audit.windowDays} gün, ${digest.audit.scannedPaymentCount} kayıt.`,
    "Bu özet yalnızca okur; hiçbir kaydı değiştirmez. Ayrıntılar: Yönetim > Daire Alacakları."
  );

  const text = lines.join("\n");
  const html = `<pre style="font-family:inherit;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
  return { subject, text, html };
}

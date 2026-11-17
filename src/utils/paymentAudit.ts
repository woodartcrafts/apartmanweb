/**
 * Gunluk salt-okunur denetim: sistemin kendi yazdigi kayitlardaki TUTARSIZLIKLARI listeler.
 * Hicbir kaydi degistirmez; yalnizca "bakilmasi gereken" satirlari uretir.
 *
 * Bulgu turleri (en onemliden aza):
 *  - WRITTEN_DOOR_MISMATCH: banka aciklamasinda acikca tek bir daire yaziyor ("D-24") ama odeme baska daireye etiketli.
 *  - LINKED_OTHER_APARTMENT: odeme X dairesine etiketli ama Y dairesinin borcuna yazilmis (elle karar verilmemisse).
 *  - OVERPAID_CHARGE: bir tahakkuka tutarindan fazla odeme islenmis.
 *  - POSSIBLE_DUPLICATE: ayni gun, ayni tutar, ayni daire; biri Excel biri Gmail/PDF kaynakli (referans turu farkli).
 *  - AWAITING_APPROVAL: onay bekleyen odemeler (bilgi).
 */

import {
  extractDoorNoTagFromPaymentNote,
  hasManualReconcileLock,
  isAwaitingApproval,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
} from "../routes/adminNoteUtils";
import { bankDayNumber, classifyReference } from "./bankRowDedup";
import { extractWrittenDoorNoFromNormalizedText } from "./doorHint";
import { toAsciiLower } from "./splitCandidate";

export type AuditSeverity = "HIGH" | "MEDIUM" | "INFO";

export type AuditFindingCode =
  | "WRITTEN_DOOR_MISMATCH"
  | "LINKED_OTHER_APARTMENT"
  | "OVERPAID_CHARGE"
  | "POSSIBLE_DUPLICATE"
  | "AWAITING_APPROVAL";

export type AuditFinding = {
  code: AuditFindingCode;
  severity: AuditSeverity;
  message: string;
  paymentId?: string;
  chargeId?: string;
  doorNo?: string | null;
  amount?: number;
  paidAt?: string;
};

export type AuditPaymentInput = {
  id: string;
  paidAt: Date;
  totalAmount: number;
  note: string | null;
  /** Odemenin yazildigi tahakkuklarin daire numaralari (tekrarlar olabilir). */
  linkedDoorNos: string[];
};

export type AuditChargeInput = {
  id: string;
  doorNo: string;
  label: string;
  amount: number;
  paidAmount: number;
};

export type AuditReport = {
  generatedAt: string;
  windowDays: number;
  scannedPaymentCount: number;
  findings: AuditFinding[];
  counts: Record<AuditFindingCode, number>;
};

const SEVERITY_ORDER: Record<AuditSeverity, number> = { HIGH: 0, MEDIUM: 1, INFO: 2 };

function notePart(note: string | null, prefix: string): string | null {
  const part = parsePaymentNoteParts(note).find((candidate) => candidate.startsWith(prefix));
  if (!part) {
    return null;
  }
  return part.slice(prefix.length).trim() || null;
}

function formatTry(amount: number): string {
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function auditPayments(input: {
  payments: AuditPaymentInput[];
  charges: AuditChargeInput[];
  doorNoSet: Set<string>;
  windowDays: number;
  now?: Date;
}): AuditReport {
  const findings: AuditFinding[] = [];

  for (const payment of input.payments) {
    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    const normalizedTag = normalizeDoorNoForCompare(doorTag);
    const description = notePart(payment.note, "BANK_DESC:");
    const isSplitPart = parsePaymentNoteParts(payment.note).some((part) => part.startsWith("BANK_SPLIT:"));
    const base = {
      paymentId: payment.id,
      doorNo: doorTag,
      amount: payment.totalAmount,
      paidAt: payment.paidAt.toISOString(),
    };

    // 1) Aciklamada acik daire yaziyor ama baska daireye etiketli. Bolunen satirlar haric
    //    ("daire 65 aidat" aciklamasi 48/65 ciftinde iki daireye de dagitilir).
    if (doorTag && description && !isSplitPart) {
      const written = extractWrittenDoorNoFromNormalizedText(toAsciiLower(description), input.doorNoSet);
      if (written && written !== normalizedTag) {
        findings.push({
          ...base,
          code: "WRITTEN_DOOR_MISMATCH",
          severity: "HIGH",
          message: `${formatDay(payment.paidAt)} ${formatTry(payment.totalAmount)}: aciklamada daire ${written} yaziyor ama odeme daire ${doorTag} olarak kayitli`,
        });
      }
    }

    // 2) Etiketli daireden baska dairenin borcuna yazilmis (insan karari yoksa).
    if (doorTag && !hasManualReconcileLock(payment.note) && payment.linkedDoorNos.length > 0) {
      const otherDoor = payment.linkedDoorNos
        .map((doorNo) => normalizeDoorNoForCompare(doorNo))
        .find((doorNo) => doorNo !== normalizedTag);
      if (otherDoor) {
        findings.push({
          ...base,
          code: "LINKED_OTHER_APARTMENT",
          severity: "HIGH",
          message: `${formatDay(payment.paidAt)} ${formatTry(payment.totalAmount)}: odeme daire ${doorTag} olarak etiketli ama daire ${otherDoor} borcuna yazilmis`,
        });
      }
    }
  }

  // 3) Fazla odenmis tahakkuk.
  for (const charge of input.charges) {
    if (charge.paidAmount > charge.amount + 0.005) {
      findings.push({
        code: "OVERPAID_CHARGE",
        severity: "HIGH",
        chargeId: charge.id,
        doorNo: charge.doorNo,
        amount: Number((charge.paidAmount - charge.amount).toFixed(2)),
        message: `${charge.label}: tahakkuk ${formatTry(charge.amount)}, islenen ${formatTry(charge.paidAmount)} (fazla ${formatTry(charge.paidAmount - charge.amount)})`,
      });
    }
  }

  // 4) Kaynaklar arasi olasi cift kayit: ayni gun + tutar + daire, referans turleri farkli.
  const groups = new Map<string, AuditPaymentInput[]>();
  for (const payment of input.payments) {
    const ref = notePart(payment.note, "BANK_REF:");
    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    if (!ref || !doorTag) {
      continue;
    }
    const key = `${bankDayNumber(payment.paidAt)}|${Math.round(payment.totalAmount * 100)}|${normalizeDoorNoForCompare(doorTag)}`;
    const list = groups.get(key) ?? [];
    list.push(payment);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) {
      continue;
    }
    const kinds = new Set(list.map((payment) => classifyReference(notePart(payment.note, "BANK_REF:"))));
    if (!(kinds.has("HASH") && kinds.has("STATEMENT_REF"))) {
      continue;
    }
    const first = list[0];
    findings.push({
      code: "POSSIBLE_DUPLICATE",
      severity: "MEDIUM",
      paymentId: first.id,
      doorNo: extractDoorNoTagFromPaymentNote(first.note),
      amount: first.totalAmount,
      paidAt: first.paidAt.toISOString(),
      message: `${formatDay(first.paidAt)} ${formatTry(first.totalAmount)} daire ${extractDoorNoTagFromPaymentNote(first.note)}: ${list.length} kayit (Excel + Gmail/PDF) ayni islem olabilir`,
    });
  }

  // 5) Onay bekleyenler (bilgi).
  const awaiting = input.payments.filter((payment) => isAwaitingApproval(payment.note));
  if (awaiting.length > 0) {
    const total = awaiting.reduce((sum, payment) => sum + payment.totalAmount, 0);
    findings.push({
      code: "AWAITING_APPROVAL",
      severity: "INFO",
      amount: Number(total.toFixed(2)),
      message: `${awaiting.length} odeme (${formatTry(total)}) hangi borca ait oldugu belli olmadigi icin onay bekliyor`,
    });
  }

  findings.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) {
      return bySeverity;
    }
    return (b.paidAt ?? "").localeCompare(a.paidAt ?? "");
  });

  const counts: Record<AuditFindingCode, number> = {
    WRITTEN_DOOR_MISMATCH: 0,
    LINKED_OTHER_APARTMENT: 0,
    OVERPAID_CHARGE: 0,
    POSSIBLE_DUPLICATE: 0,
    AWAITING_APPROVAL: 0,
  };
  for (const finding of findings) {
    counts[finding.code] += 1;
  }

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    windowDays: input.windowDays,
    scannedPaymentCount: input.payments.length,
    findings,
    counts,
  };
}

/** E-posta gerektiren (bilgi disi) bulgu var mi? */
export function hasActionableFindings(report: AuditReport): boolean {
  return report.findings.some((finding) => finding.severity !== "INFO");
}

/** Ayni bulgu kumesini gun gun tekrar yollamamak icin kararli imza. */
export function auditSignature(report: AuditReport): string {
  return report.findings
    .filter((finding) => finding.severity !== "INFO")
    .map((finding) => `${finding.code}:${finding.paymentId ?? ""}:${finding.chargeId ?? ""}`)
    .sort()
    .join("|");
}

export function formatAuditText(report: AuditReport): string {
  const actionable = report.findings.filter((finding) => finding.severity !== "INFO");
  const info = report.findings.filter((finding) => finding.severity === "INFO");
  const lines = [
    `ApartmanWeb denetimi - son ${report.windowDays} gun, ${report.scannedPaymentCount} odeme tarandi`,
    "",
    actionable.length > 0 ? `Bakilmasi gereken ${actionable.length} bulgu:` : "Bakilmasi gereken bulgu yok.",
    ...actionable.map((finding) => `- [${finding.severity === "HIGH" ? "ONEMLI" : "ORTA"}] ${finding.message}`),
    ...(info.length > 0 ? ["", ...info.map((finding) => `Bilgi: ${finding.message}`)] : []),
    "",
    "Bu denetim yalnizca okur; hicbir kaydi degistirmez. Ayrintilar: Yonetim > Daire Alacaklari.",
  ];
  return lines.join("\n");
}

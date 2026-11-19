import { prisma } from "../db";
import { getMobileMatrixLastDataAt } from "./mobileMatrixReport";
import { parsePaymentNoteParts } from "../routes/adminNoteUtils";

/**
 * "Kalan Islemler" notlari: ekstre yuklemesinden sonra tam kapanmayan, fazla gelen ya da
 * onay bekleyen odemeleri sade Turkce cumlelerle anlatir. Veriyi yazmaz, sadece okur.
 */
export type LeftoverNoteKind = "EKSIK" | "FAZLA" | "ONAY" | "ILERI";

export type LeftoverNote = {
  id: string;
  kind: LeftoverNoteKind;
  doorNo: string;
  /** Notun dayandigi odemenin tarihi (ISO). */
  date: string;
  /** Eksik/fazla kalan tutar. */
  amount: number;
  text: string;
  /** "Ne yapmali?" icin tek cumlelik, sade yonlendirme. */
  hint: string;
};

export type LeftoverNotesReport = {
  generatedAt: string;
  lastDataAt: string | null;
  days: number | null;
  notes: LeftoverNote[];
  totals: { eksik: number; fazla: number; onay: number; ileri: number };
};

const MONTH_NAMES = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

export function formatTryText(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

export function formatDayText(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

/** BANK_DESC etiketinden odeyen adini cikarir ("ADI*0111*aciklama*..." -> "ADI"). */
export function extractPayerName(note: string | null): string | null {
  if (!note) {
    return null;
  }
  const part = parsePaymentNoteParts(note).find((p) => p.startsWith("BANK_DESC:"));
  if (!part) {
    return null;
  }
  const raw = part.slice("BANK_DESC:".length).trim();
  const name = raw.split("*")[0]?.trim() ?? "";
  if (!name || /^\d+$/.test(name)) {
    return null;
  }
  return name.length > 40 ? `${name.slice(0, 40)}...` : name;
}

export function extractDoorNo(note: string | null): string | null {
  if (!note) {
    return null;
  }
  const part = parsePaymentNoteParts(note).find((p) => p.startsWith("DOOR:"));
  const value = part?.slice("DOOR:".length).trim();
  return value || null;
}

export function describePartialCharge(params: {
  doorNo: string;
  typeName: string;
  year: number;
  month: number;
  amount: number;
  paid: number;
  lastPaidAt: Date;
  payer: string | null;
  /** Vadesi henuz gelmemis kalemde kalan tutar "eksik" degil, onceden odeme sayilir. */
  dueDate?: Date;
  now?: Date;
}): string {
  const remaining = params.amount - params.paid;
  const who = params.payer ? ` (${params.payer})` : "";
  if (params.dueDate && params.now && params.dueDate.getTime() > params.now.getTime()) {
    return (
      `Daire ${params.doorNo} - ${monthLabel(params.year, params.month)} ${params.typeName}: ` +
      `Vadesi henüz gelmedi (${formatDayText(params.dueDate)}). ${formatTryText(params.paid)} önceden ödendi, ` +
      `kalan ${formatTryText(remaining)} vade gelince ödenecek. Son ödeme ${formatDayText(params.lastPaidAt)}${who}.`
    );
  }
  return (
    `Daire ${params.doorNo} - ${monthLabel(params.year, params.month)} ${params.typeName}: ` +
    `Borç ${formatTryText(params.amount)}, ödenen ${formatTryText(params.paid)}, ` +
    `ödenmeyen ${formatTryText(remaining)}. Son ödeme ${formatDayText(params.lastPaidAt)}${who}.`
  );
}

export function describeUnappliedPayment(params: {
  doorNo: string;
  paidAt: Date;
  total: number;
  unapplied: number;
  payer: string | null;
  pendingApproval: boolean;
  noOpenDebt: boolean;
  /** Elle duzenlenmis (kilitli) odeme yeni borca kendiliginden yazilmaz. */
  manualLock?: boolean;
}): string {
  const who = params.payer ? ` (${params.payer})` : "";
  if (params.pendingApproval) {
    return (
      `Daire ${params.doorNo} - ${formatDayText(params.paidAt)} tarihli ${formatTryText(params.total)} ödeme${who} geldi. ` +
      `Hangi borca ait olduğu belli olmadığı için hiçbir borca yazılmadı, onayını bekliyor.`
    );
  }
  const reason = params.noOpenDebt ? "Dairenin o an ödenmemiş borcu yoktu" : "Ödeme borçtan fazlaydı";
  const follow = params.manualLock
    ? "Elle düzenlendiği için yeni borca kendiliğinden yazılmaz."
    : "Dairenin yeni bir borcu eklenince otomatik olarak ona yazılır.";
  return (
    `Daire ${params.doorNo} - ${formatDayText(params.paidAt)} tarihli ${formatTryText(params.total)} ödemeden${who} ` +
    `${formatTryText(params.unapplied)} artakaldı. ${reason}. ${follow}`
  );
}

/** Her not turu icin "ne yapmali?" cumlesi. */
export function describeHint(kind: LeftoverNoteKind, manualLock: boolean): string {
  if (kind === "EKSIK") return "Kalan tutarın daire sakininden ödenmesi bekleniyor.";
  if (kind === "ILERI") return "Bir şey yapmana gerek yok.";
  if (kind === "ONAY") return "Ödemenin hangi borca yazılacağını onaylaman gerekiyor.";
  return manualLock
    ? "Elle düzenlendiği için kendiliğinden düşmez; ödemeyi bir borca yazman ya da iade etmen gerekir."
    : "Bir şey yapmana gerek yok, yeni borç eklenince kendiliğinden düşer.";
}

const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

export async function buildLeftoverNotes(days: number | null): Promise<LeftoverNotesReport> {
  const generatedAt = new Date();
  const since = days != null ? new Date(generatedAt.getTime() - days * MILLIS_IN_DAY) : null;

  const [partialCharges, unappliedPayments, lastDataAt] = await Promise.all([
    prisma.charge.findMany({
      where: { status: "OPEN", amount: { gt: 0 }, paymentItems: { some: {} } },
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
        dueDate: true,
        apartment: { select: { doorNo: true } },
        chargeType: { select: { name: true } },
        paymentItems: {
          select: { amount: true, payment: { select: { paidAt: true, note: true } } },
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        note: { contains: "UNAPPLIED:" },
        ...(since ? { paidAt: { gte: since } } : {}),
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        itemLinks: { select: { amount: true } },
      },
    }),
    getMobileMatrixLastDataAt(),
  ]);

  const notes: LeftoverNote[] = [];

  for (const charge of partialCharges) {
    const amount = Number(charge.amount);
    const paid = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = amount - paid;
    if (paid <= 0 || remaining <= 0.009) {
      continue;
    }
    const latest = charge.paymentItems.reduce((best, item) =>
      item.payment.paidAt.getTime() > best.payment.paidAt.getTime() ? item : best
    );
    if (since && latest.payment.paidAt < since) {
      continue;
    }
    const notDueYet = charge.dueDate.getTime() > generatedAt.getTime();
    notes.push({
      id: `charge:${charge.id}`,
      kind: notDueYet ? "ILERI" : "EKSIK",
      hint: describeHint(notDueYet ? "ILERI" : "EKSIK", false),
      doorNo: charge.apartment.doorNo,
      date: latest.payment.paidAt.toISOString(),
      amount: Math.round(remaining * 100) / 100,
      text: describePartialCharge({
        doorNo: charge.apartment.doorNo,
        typeName: charge.chargeType.name,
        year: charge.periodYear,
        month: charge.periodMonth,
        amount,
        paid,
        lastPaidAt: latest.payment.paidAt,
        payer: extractPayerName(latest.payment.note),
        dueDate: charge.dueDate,
        now: generatedAt,
      }),
    });
  }

  for (const payment of unappliedPayments) {
    const note = payment.note ?? "";
    // Iade edilmis ya da hesaplar arasi virmanla kapanmis kayitlar icin not uretme.
    if (note.includes("REFUNDED") || note.includes("ACCOUNT_TRANSFER:")) {
      continue;
    }
    const total = Number(payment.totalAmount);
    const applied = payment.itemLinks.reduce((sum, item) => sum + Number(item.amount), 0);
    const unapplied = Math.round((total - applied) * 100) / 100;
    if (unapplied <= 0.009) {
      continue;
    }
    const pendingApproval = note.includes("UNAPPLIED:PENDING_APPROVAL");
    const manualLock = note.includes("RECONCILE_LOCK:MANUAL");
    notes.push({
      id: `payment:${payment.id}`,
      kind: pendingApproval ? "ONAY" : "FAZLA",
      hint: describeHint(pendingApproval ? "ONAY" : "FAZLA", manualLock),
      doorNo: extractDoorNo(note) ?? "?",
      date: payment.paidAt.toISOString(),
      amount: unapplied,
      text: describeUnappliedPayment({
        doorNo: extractDoorNo(note) ?? "?",
        paidAt: payment.paidAt,
        total,
        unapplied,
        payer: extractPayerName(note),
        pendingApproval,
        noOpenDebt: note.includes("UNAPPLIED:NO_OPEN_DEBT"),
        manualLock,
      }),
    });
  }

  notes.sort((a, b) => b.date.localeCompare(a.date) || a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true }));

  const sumBy = (kind: LeftoverNoteKind) =>
    Math.round(notes.filter((n) => n.kind === kind).reduce((s, n) => s + n.amount, 0) * 100) / 100;

  return {
    generatedAt: generatedAt.toISOString(),
    lastDataAt: lastDataAt ? lastDataAt.toISOString() : null,
    days,
    notes,
    totals: { eksik: sumBy("EKSIK"), fazla: sumBy("FAZLA"), onay: sumBy("ONAY"), ileri: sumBy("ILERI") },
  };
}

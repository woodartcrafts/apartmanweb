import { formatDayText, formatTryText } from "./leftoverNotes";

/**
 * Fark kaynagi: bir dairenin borc ve odeme olaylarini tarih sirasiyla dizer, her olaydan sonra
 * "odenen - odenmesi gereken" bakiyesini hesaplar ve su anki farkin HANGI odemede dogdugunu bulur.
 *
 * Mantik: bakiyenin son kez tam sifir oldugu noktadan sonra gelen, bakiyeyi bugunku farka getiren
 * ilk odeme "kaynak" sayilir. Boylece "Ocak'tan beri ayni 280 TL tasiniyor" gibi durumlarda farkin
 * ilk dogdugu odeme gorunur. Hicbir sey yazmaz, sadece hesaplar.
 */
export type DiffEventKind = "CHARGE" | "PAYMENT";

export type DiffEvent = {
  date: Date;
  kind: DiffEventKind;
  /** Krus cinsinden pozitif tutar (borc ya da odeme). */
  cents: number;
  label: string;
};

export type DiffTimelineRow = {
  date: string;
  kind: DiffEventKind;
  label: string;
  /** Borc icin negatif, odeme icin pozitif. */
  amount: number;
  /** Bu olaydan sonraki bakiye: + fazla, - eksik. */
  balance: number;
};

export type DiffOrigin = {
  date: string;
  paid: number;
  owed: number;
  label: string;
};

export type DifferenceAnalysis = {
  /** + fazla, - eksik (TL). */
  diff: number;
  kind: "FAZLA" | "EKSIK";
  origin: DiffOrigin;
  summary: string;
  timeline: DiffTimelineRow[];
};

const TIMELINE_LIMIT = 40;

const money = (cents: number): number => cents / 100;

export function analyzeDifference(events: DiffEvent[], now: Date): DifferenceAnalysis | null {
  const sorted = events
    .filter((event) => event.date.getTime() <= now.getTime() && event.cents > 0)
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const byDate = a.event.date.getTime() - b.event.date.getTime();
      if (byDate !== 0) return byDate;
      // Ayni gun: once borc, sonra odeme; boylece "o gune kadar odenmesi gereken" borcu da icerir.
      if (a.event.kind !== b.event.kind) return a.event.kind === "CHARGE" ? -1 : 1;
      return a.index - b.index;
    })
    .map((entry) => entry.event);

  if (sorted.length === 0) {
    return null;
  }

  const balances: number[] = [];
  let running = 0;
  for (const event of sorted) {
    running += event.kind === "PAYMENT" ? event.cents : -event.cents;
    balances.push(running);
  }

  const finalCents = balances[balances.length - 1];
  if (finalCents === 0) {
    return null;
  }

  let lastZero = -1;
  for (let i = balances.length - 1; i >= 0; i -= 1) {
    if (balances[i] === 0) {
      lastZero = i;
      break;
    }
  }

  // Kaynak: son sifir noktasindan sonraki, bakiyeyi bugunku farka getiren ilk odeme.
  let originIndex = -1;
  for (let i = lastZero + 1; i < sorted.length; i += 1) {
    if (sorted[i].kind === "PAYMENT" && balances[i] === finalCents) {
      originIndex = i;
      break;
    }
  }
  if (originIndex === -1) {
    for (let i = lastZero + 1; i < sorted.length; i += 1) {
      if (sorted[i].kind === "PAYMENT") {
        originIndex = i;
        break;
      }
    }
  }
  // Son sifirdan beri hic odeme yoksa bu bir "fark" degil, odenmemis borctur.
  if (originIndex === -1) {
    return null;
  }

  const originEvent = sorted[originIndex];
  const before = originIndex > 0 ? balances[originIndex - 1] : 0;
  const owedCents = before < 0 ? -before : 0;
  const paidCents = originEvent.cents;
  const kind: "FAZLA" | "EKSIK" = finalCents > 0 ? "FAZLA" : "EKSIK";
  const absFinal = Math.abs(finalCents);
  const day = formatDayText(originEvent.date);

  let summary: string;
  if (kind === "EKSIK") {
    summary =
      `${day} tarihinde ${formatTryText(money(paidCents))} ödeme geldi, o güne kadar ödenmesi gereken ` +
      `${formatTryText(money(owedCents))} idi.`;
    if (owedCents > paidCents) {
      summary += ` ${formatTryText(money(owedCents - paidCents))} eksik kaldı.`;
    }
    if (owedCents - paidCents !== absFinal) {
      summary += ` Şu an toplam ${formatTryText(money(absFinal))} eksik görünüyor.`;
    }
  } else {
    summary =
      `${day} tarihinde ${formatTryText(money(paidCents))} ödeme geldi, o güne kadar borç ` +
      `${formatTryText(money(owedCents))} idi.`;
    if (paidCents > owedCents) {
      summary += ` ${formatTryText(money(paidCents - owedCents))} fazla geldi.`;
    }
    if (paidCents - owedCents !== absFinal) {
      summary += ` Şu an toplam ${formatTryText(money(absFinal))} fazla görünüyor.`;
    }
  }

  const startIndex = Math.max(lastZero, 0);
  const rows: DiffTimelineRow[] = [];
  for (let i = startIndex; i < sorted.length; i += 1) {
    const event = sorted[i];
    rows.push({
      date: event.date.toISOString(),
      kind: event.kind,
      label: event.label,
      amount: money(event.kind === "PAYMENT" ? event.cents : -event.cents),
      balance: money(balances[i]),
    });
  }

  return {
    diff: money(finalCents),
    kind,
    origin: {
      date: originEvent.date.toISOString(),
      paid: money(paidCents),
      owed: money(owedCents),
      label: originEvent.label,
    },
    summary,
    timeline: rows.length > TIMELINE_LIMIT ? rows.slice(rows.length - TIMELINE_LIMIT) : rows,
  };
}

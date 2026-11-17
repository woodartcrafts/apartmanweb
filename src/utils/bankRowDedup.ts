/**
 * Banka satirlarinin KAYNAKTAN BAGIMSIZ mukerrer tespiti.
 *
 * Neden gerekli: ayni islem hem Excel ekstresinden (referans = uzun dekont no) hem de Gmail
 * PDF ekstresinden (referans yoksa tarih+tutar+aciklamanin karmasi, 16 hane hex) yuklenebiliyor.
 * Mevcut tekrar kontrolu yalnizca BIREBIR ayni referansa baktigi icin iki kaynak birbirini
 * tanimiyor, ayni odeme ikinci kez yukleniyor ve acik borclara yeniden yaziliyor.
 *
 * Tasarim kararlari (hepsi "yanlislikla gercek odemeyi atlamamak" icin muhafazakar):
 * - Yalniz FARKLI kaynak turleri arasinda eslestirir (hex16 hash <-> dekont no). Ayni turde
 *   referanslar zaten birebir kontrol ediliyor; farkli referans = farkli islem demektir.
 * - ADET BAZLIDIR: veritabaninda M tane eslesen islem varsa gelen N satirdan en fazla M tanesi
 *   mukerrer sayilir. Ayni gun ayni tutarda gercekten iki odeme gelirse fazlasi yuklenir.
 * - Banka gunu UTC gunudur (bkz. bankDayNumber); saat dilimi donusumu yapilmaz.
 *
 * Bu modul saftir (veritabani yok); DB okumasi admin.ts'te yapilir.
 */

const MS_PER_DAY = 86_400_000;

/** Aciklama anahtarlarinin "ayni islem" sayilmasi icin gereken en az uzunluk (onek eslesmesinde). */
const MIN_PREFIX_MATCH_LENGTH = 24;

/** Islem numarasi sayilacak en kisa rakam dizisi. */
const MIN_TX_NUMBER_DIGITS = 8;

/**
 * Banka gununu, epoch'tan itibaren gun sayisi olarak dondurur.
 *
 * ONEMLI: hem Excel hem PDF ayristiricilari ekstredeki duvar saatini Date.UTC(...) ile
 * saklar (yani saat dilimi donusumu YAPILMAZ). Bu yuzden saklanan degerin UTC gunu bankanin
 * gunudur; Istanbul'a cevirmek 21:00 sonrasi islemleri ertesi gune kaydirirdi.
 */
export function bankDayNumber(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

function foldTurkish(value: string): string {
  return value
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Aciklamayi harf/rakam disindakilerden arindirir (bosluk ve noktalama farklari onemsiz). */
export function normalizeDescriptionKey(description: string | null | undefined): string {
  return foldTurkish(description ?? "").replace(/[^a-z0-9]+/g, "");
}

/**
 * Banka aciklamasi "AD SOYAD*0067*metin*islemNo*FAST" bicimindedir; ilk bolum ordeyen adidir.
 * Yildiz yoksa guvenilir bir ordeyen adi cikarilamaz ve bos dondurulur.
 */
export function extractPayerKey(description: string | null | undefined): string {
  const text = description ?? "";
  if (!text.includes("*")) {
    return "";
  }
  return foldTurkish(text.split("*")[0] ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Aciklamadaki uzun rakam dizileri (islem/dekont numarasi). */
export function extractTxNumbers(description: string | null | undefined): Set<string> {
  const matches = (description ?? "").match(new RegExp(`\\d{${MIN_TX_NUMBER_DIGITS},}`, "g")) ?? [];
  return new Set(matches);
}

export type ReferenceKind = "HASH" | "STATEMENT_REF" | "NONE";

/**
 * Referansin turu: Gmail yedek referansi 16 haneli hex'tir; digerleri bankanin kendi
 * dekont/referans numarasidir.
 */
export function classifyReference(reference: string | null | undefined): ReferenceKind {
  const value = (reference ?? "").trim();
  if (!value) {
    return "NONE";
  }
  return /^[0-9A-Fa-f]{16}$/.test(value) ? "HASH" : "STATEMENT_REF";
}

export type DedupTx = {
  occurredAt: Date;
  amountCents: number;
  description: string;
  /** Satirin referans turu. Verilmezse tur kisitlamasi uygulanmaz. */
  refKind?: ReferenceKind;
};

export type DedupIncoming<K> = DedupTx & { key: K };

type PreparedTx = {
  day: number;
  amountCents: number;
  descKey: string;
  payerKey: string;
  txNumbers: Set<string>;
  refKind: ReferenceKind | undefined;
};

function prepare(tx: DedupTx): PreparedTx {
  return {
    day: bankDayNumber(tx.occurredAt),
    amountCents: tx.amountCents,
    descKey: normalizeDescriptionKey(tx.description),
    payerKey: extractPayerKey(tx.description),
    txNumbers: extractTxNumbers(tx.description),
    refKind: tx.refKind,
  };
}

function descriptionsMatch(a: string, b: string): boolean {
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  // Bir kaynakta aciklama kisaltilmis olabilir: yeterince uzun onek eslesmesi de ayni islemdir.
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= MIN_PREFIX_MATCH_LENGTH && longer.startsWith(shorter);
}

function sharesTxNumber(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) {
    if (b.has(value)) {
      return true;
    }
  }
  return false;
}

/** Iki tarafta da islem numarasi var ama hic ortak degilse bunlar FARKLI islemlerdir. */
function haveConflictingTxNumbers(a: Set<string>, b: Set<string>): boolean {
  return a.size > 0 && b.size > 0 && !sharesTxNumber(a, b);
}

/** Ayni referans turundeki satirlar bu fonksiyonla eslestirilmez (birebir referans kontrolu zaten var). */
function sameKind(a: ReferenceKind | undefined, b: ReferenceKind | undefined): boolean {
  return a !== undefined && b !== undefined && a !== "NONE" && a === b;
}

/**
 * Gelen islemlerden, mevcut islemlerle ayni olanlarin anahtarlarini dondurur.
 *
 * 1. tur (guclu): tutar ayni + aciklama ayni/onek-uyumlu. Gun farki 0 olmali; yalniz ortak bir
 *    islem numarasi varsa 1 gun tolerans taninir (kaynaklar arasi tarih kaymasi olabiliyor).
 * 2. tur (ordeyen): tutar ayni + AYNI banka gunu + ayni ordeyen adi, aciklama metni farkli
 *    yazilmis olsa bile (kisaltma vb.) yakalar. Iki tarafta da islem numarasi var ve ortak
 *    degilse ESLESTIRMEZ.
 */
export function planCrossSourceDuplicates<K>(
  incoming: Array<DedupIncoming<K>>,
  existing: DedupTx[]
): Set<K> {
  const pool = existing.map((tx) => ({ ...prepare(tx), used: false }));
  const pending = incoming.map((tx) => ({ key: tx.key, ...prepare(tx), done: false }));
  const duplicates = new Set<K>();

  // 1. tur: guclu eslesme (en yakin gun once).
  for (const inc of pending) {
    let best: (typeof pool)[number] | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const candidate of pool) {
      if (
        candidate.used ||
        candidate.amountCents !== inc.amountCents ||
        sameKind(candidate.refKind, inc.refKind) ||
        !descriptionsMatch(candidate.descKey, inc.descKey)
      ) {
        continue;
      }
      const diff = Math.abs(candidate.day - inc.day);
      const maxDiff = sharesTxNumber(candidate.txNumbers, inc.txNumbers) ? 1 : 0;
      if (diff > maxDiff) {
        continue;
      }
      if (diff < bestDiff) {
        best = candidate;
        bestDiff = diff;
      }
    }
    if (best) {
      best.used = true;
      inc.done = true;
      duplicates.add(inc.key);
    }
  }

  // 2. tur: ayni gun + ayni ordeyen + ayni tutar.
  for (const inc of pending) {
    if (inc.done || !inc.payerKey) {
      continue;
    }
    const match = pool.find(
      (candidate) =>
        !candidate.used &&
        candidate.amountCents === inc.amountCents &&
        candidate.day === inc.day &&
        candidate.payerKey === inc.payerKey &&
        !sameKind(candidate.refKind, inc.refKind) &&
        !haveConflictingTxNumbers(candidate.txNumbers, inc.txNumbers)
    );
    if (match) {
      match.used = true;
      inc.done = true;
      duplicates.add(inc.key);
    }
  }

  return duplicates;
}

export type CommitRowLike = {
  occurredAt: Date;
  amount: number;
  entryType: "PAYMENT" | "EXPENSE";
  description: string;
  reference?: string;
  splitSourceRowNo?: number;
};

export type GroupedTransaction = {
  /** Satir numaralari (1 tabanli, dizideki sira). Bolunmus islemde birden cok olur. */
  rowNos: number[];
  entryType: "PAYMENT" | "EXPENSE";
  occurredAt: Date;
  amountCents: number;
  description: string;
  reference: string | undefined;
};

function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100);
}

/**
 * Satirlari "banka ekstresindeki orijinal islem" duzeyine toplar: ayni splitSourceRowNo'yu
 * paylasan bolunmus parcalar tek islem sayilir ve tutarlari toplanir.
 */
export function groupRowsIntoTransactions(rows: CommitRowLike[]): GroupedTransaction[] {
  const result: GroupedTransaction[] = [];
  const splitGroups = new Map<number, GroupedTransaction>();

  rows.forEach((row, index) => {
    const rowNo = index + 1;
    const splitKey = row.entryType === "PAYMENT" ? row.splitSourceRowNo : undefined;
    const reference = row.reference?.trim() || undefined;

    if (splitKey != null && Number.isFinite(splitKey)) {
      const existing = splitGroups.get(splitKey);
      if (existing) {
        existing.rowNos.push(rowNo);
        existing.amountCents += toCents(row.amount);
        return;
      }
      const group: GroupedTransaction = {
        rowNos: [rowNo],
        entryType: row.entryType,
        occurredAt: row.occurredAt,
        amountCents: toCents(row.amount),
        description: row.description,
        reference,
      };
      splitGroups.set(splitKey, group);
      result.push(group);
      return;
    }

    result.push({
      rowNos: [rowNo],
      entryType: row.entryType,
      occurredAt: row.occurredAt,
      amountCents: toCents(row.amount),
      description: row.description,
      reference,
    });
  });

  return result;
}

export type ExistingPaymentRecord = {
  note: string | null;
  paidAt: Date;
  totalAmount: number;
};

/**
 * Veritabanindaki banka odemelerini orijinal islem duzeyine indirger: ayni BANK_REF'i
 * paylasan (bolunmus) odemelerin tutarlari toplanir. Not parcalari " | " ile ayrilir.
 */
export function groupExistingPaymentsByReference(payments: ExistingPaymentRecord[]): DedupTx[] {
  const groups = new Map<string, DedupTx>();

  for (const payment of payments) {
    const parts = (payment.note ?? "").split(" | ").map((part) => part.trim());
    const ref = parts.find((part) => part.startsWith("BANK_REF:"))?.slice("BANK_REF:".length).trim();
    if (!ref) {
      continue;
    }
    const description =
      parts.find((part) => part.startsWith("BANK_DESC:"))?.slice("BANK_DESC:".length).trim() ?? "";
    const cents = toCents(payment.totalAmount);

    const existing = groups.get(ref);
    if (existing) {
      existing.amountCents += cents;
    } else {
      groups.set(ref, {
        occurredAt: payment.paidAt,
        amountCents: cents,
        description,
        refKind: classifyReference(ref),
      });
    }
  }

  return [...groups.values()];
}

/**
 * Bir ekstre icin, gelen islemlerden hangilerinin baska bir kaynaktan zaten yuklenmis oldugunu
 * bulur. Donus: mukerrer sayilan islemlerin satir numaralari (1 tabanli).
 */
export function findCrossSourceDuplicateRowNos(
  rows: CommitRowLike[],
  existingPayments: ExistingPaymentRecord[]
): Set<number> {
  const allTransactions = groupRowsIntoTransactions(rows);

  const duplicateIndexes = planCrossSourceDuplicates(
    allTransactions
      .map((tx, index) => ({ tx, index }))
      .filter(({ tx }) => tx.entryType === "PAYMENT" && tx.amountCents > 0)
      .map(({ tx, index }) => ({
        key: index,
        occurredAt: tx.occurredAt,
        amountCents: tx.amountCents,
        description: tx.description,
        refKind: classifyReference(tx.reference),
      })),
    groupExistingPaymentsByReference(existingPayments)
  );

  const rowNos = new Set<number>();
  for (const index of duplicateIndexes) {
    for (const rowNo of allTransactions[index].rowNos) {
      rowNos.add(rowNo);
    }
  }
  return rowNos;
}

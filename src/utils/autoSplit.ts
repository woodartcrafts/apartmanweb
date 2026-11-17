/**
 * Banka satirlarinin dairelere otomatik bolunmesi: TEK yer, yalnizca sunucuda.
 *
 * Daha once ayni mantik uc kopyaydi (Gmail yolu, admin.ts; onizleme, AdminPage.tsx; daire
 * listesi, splitCandidate.ts) ve kopyalar birbirinden ayrilmisti: onizleme sabit tutarli
 * kurali ve "aciklamada cift disinda acik daire yaziyorsa bolme" korumasini bilmiyordu;
 * ekrandaki "Coklu Daire Satirlarini Bol" dugmesi de zaten bolunmus satirlari tekrar boluyordu
 * (2 daire -> 4 satir). Artik onizleme, dogrudan ice aktarim ve Gmail ayni fonksiyonu kullanir
 * ve fonksiyon tekrar calistirildiginda sonucu degistirmez (idempotent).
 *
 * Bolunecek ciftler ve sabit tutarli kurallar `splitCandidate.ts` icindeki tek listededir.
 */

import { normalizeDoorNoForCompare } from "../routes/adminNoteUtils";
import { resolveFixedAmountSplit, resolveKnownPairDoorNos, toAsciiLower } from "./splitCandidate";

/**
 * Aciklamada ACIKCA yazilmis daire numaralari ("daire N", "D-N", "D N"), normalize edilmis metin uzerinde.
 * "d" icin ayirici ya da bosluk sart: "d0galgaz" gibi PDF bozmalari daire sayilmaz.
 */
export function collectExplicitDoorCapturesFromNormalizedText(text: string): string[] {
  return [
    ...text.matchAll(/\bdaire(?:ler)?\s*[:#\-/.]?\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\bd\s*[#:/.\-]\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\bd\s+0*(\d{1,4})\b/g),
  ].map((m) => m[1]);
}

/**
 * Aciklama bilinen bir cifte isaret ediyorsa o cift (sistemde var olan her iki daire), yoksa [].
 *
 * "DAIRE 47 ... *45" gibi aciklamada cift disinda ACIK bir daire yaziyorsa odeme o daireye aittir;
 * cift uyesinin gecmesi bolme icin yeterli sayilmaz.
 */
export function resolvePairSplitDoorNos(description: string, validDoorNos: Set<string>): string[] {
  const pair = resolveKnownPairDoorNos(description);
  if (pair.length < 2) {
    return [];
  }

  const normalizedPair = pair.map((doorNo) => normalizeDoorNoForCompare(doorNo));
  const explicitDoorNos = collectExplicitDoorCapturesFromNormalizedText(toAsciiLower(description))
    .map((doorNo) => normalizeDoorNoForCompare(doorNo))
    .filter((doorNo) => validDoorNos.has(doorNo));

  if (explicitDoorNos.some((doorNo) => !normalizedPair.includes(doorNo))) {
    return [];
  }

  const known = normalizedPair.filter((doorNo) => validDoorNos.has(doorNo));
  return known.length >= 2 ? known : [];
}

/** Bolunebilecek en kucuk satir bicimi. Onizleme, Gmail ve ice aktarim satirlari bunu karsilar. */
export type SplittableRow = {
  entryType: "PAYMENT" | "EXPENSE";
  amount: number;
  description: string;
  doorNo?: string | null;
  isAutoSplit?: boolean;
  splitSourceRowNo?: number | null;
};

export type AutoSplitResult<T> = { rows: T[]; splitSourceCount: number };

/**
 * Satirlari bolme kurallarina gore boler. Sira ve digger alanlar korunur.
 *
 * - Yalnizca pozitif tutarli PAYMENT satirlari bolunebilir.
 * - Once sabit tutarli kural (ornegin kisi + daire adi), sonra bilinen cift (esit bolme;
 *   kurus farki ilk daireye).
 * - Zaten bolunmus satir (`isAutoSplit === true` ya da `splitSourceRowNo` dolu) aynen gecer:
 *   fonksiyonu iki kez calistirmak satir sayisini degistirmez.
 * - Bolunen satirlarin `splitSourceRowNo` degeri kaynak satirin numarasidir; varsayilan 1 tabanli
 *   sira, onizlemede `rowNoOf: (row) => row.rowNo`.
 */
export function planAutoSplit<T extends SplittableRow>(
  rows: T[],
  validDoorNos: Set<string>,
  options: { rowNoOf?: (row: T, index: number) => number } = {}
): AutoSplitResult<T> {
  const rowNoOf = options.rowNoOf ?? ((_row: T, index: number) => index + 1);
  const nextRows: T[] = [];
  let splitSourceCount = 0;

  rows.forEach((row, index) => {
    const alreadySplit = row.isAutoSplit === true || (row.splitSourceRowNo ?? null) !== null;
    if (alreadySplit) {
      nextRows.push(row);
      return;
    }

    const passthrough = (): void => {
      nextRows.push({ ...row, isAutoSplit: false, splitSourceRowNo: undefined });
    };

    if (row.entryType !== "PAYMENT" || !Number.isFinite(row.amount) || row.amount <= 0) {
      passthrough();
      return;
    }

    const sourceRowNo = rowNoOf(row, index);

    const fixedParts = resolveFixedAmountSplit(row.description, row.amount);
    if (fixedParts.length > 0 && fixedParts.every((part) => validDoorNos.has(part.doorNo))) {
      splitSourceCount += 1;
      for (const part of fixedParts) {
        nextRows.push({ ...row, doorNo: part.doorNo, amount: part.amount, isAutoSplit: true, splitSourceRowNo: sourceRowNo });
      }
      return;
    }

    const doorNos = resolvePairSplitDoorNos(row.description, validDoorNos);
    if (doorNos.length < 2) {
      passthrough();
      return;
    }

    splitSourceCount += 1;
    const count = doorNos.length;
    const base = Math.floor((row.amount / count) * 100) / 100;
    const remainder = Number((row.amount - base * count).toFixed(2));
    doorNos.forEach((doorNo, idx) => {
      nextRows.push({
        ...row,
        doorNo,
        amount: Number((base + (idx === 0 ? remainder : 0)).toFixed(2)),
        isAutoSplit: true,
        splitSourceRowNo: sourceRowNo,
      });
    });
  });

  return { rows: nextRows, splitSourceCount };
}

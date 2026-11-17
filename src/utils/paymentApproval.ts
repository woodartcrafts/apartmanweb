/**
 * "Emin degilsem yazma" kapisi ve onay dagitimi (saf fonksiyonlar).
 *
 * Banka iceri aktarimi bazi eslestirmelerden emin olamaz: ornegin dairede birden cok acik
 * kalem varken ne tutar ne aciklama hangisinin odendigini gostermiyorsa en eski borca
 * yazmak (FIFO_FALLBACK) yanlis kalemi kapatabilir. Bu tur dusuk guvenli eslestirmeler
 * borca YAZILMAZ; yonetici onayini bekler.
 */

/** Dusuk guvenli sayilan otomatik eslestirme nedenleri. */
const LOW_CONFIDENCE_AUTO_MATCH_REASONS = new Set<string>(["FIFO_FALLBACK"]);

export function isLowConfidenceAutoMatch(reason: string | null | undefined): boolean {
  if (!reason) {
    return false;
  }
  // "FIFO_FALLBACK:TYPE_HINT" gibi sonekli nedenler de ana nedenle degerlendirilir.
  const base = reason.split(":")[0]?.trim().toUpperCase() ?? "";
  return LOW_CONFIDENCE_AUTO_MATCH_REASONS.has(base);
}

export type ApprovalChargeSlot = {
  chargeId: string;
  remainingCents: number;
};

export type ApprovalAllocation = {
  chargeId: string;
  amountCents: number;
};

export type ApprovalPlan = {
  allocations: ApprovalAllocation[];
  /** Secilen kalemlere sigmayan tutar. */
  leftoverCents: number;
  /** Istenen ama acik borcu olmayan / bu daireye ait olmayan kalemler. */
  invalidChargeIds: string[];
};

/**
 * Onaylanan odemenin dagitimini planlar.
 *
 * `charges` vade sirasindaki ACIK kalemlerdir. `preferredChargeIds` verilirse yalnizca o
 * kalemlere, verilen sirayla yazilir; verilmezse tum acik kalemlere vade sirasiyla (FIFO).
 * Hicbir kaleme kalan borcundan fazlasi yazilmaz.
 */
export function planApprovalAllocation(params: {
  amountCents: number;
  charges: ApprovalChargeSlot[];
  preferredChargeIds?: string[];
}): ApprovalPlan {
  const openById = new Map(
    params.charges.filter((charge) => charge.remainingCents > 0).map((charge) => [charge.chargeId, charge])
  );

  const invalidChargeIds: string[] = [];
  let ordered: ApprovalChargeSlot[];

  if (params.preferredChargeIds && params.preferredChargeIds.length > 0) {
    const seen = new Set<string>();
    ordered = [];
    for (const chargeId of params.preferredChargeIds) {
      if (seen.has(chargeId)) {
        continue;
      }
      seen.add(chargeId);
      const slot = openById.get(chargeId);
      if (!slot) {
        invalidChargeIds.push(chargeId);
        continue;
      }
      ordered.push(slot);
    }
  } else {
    ordered = [...openById.values()];
  }

  let remaining = Math.max(0, params.amountCents);
  const allocations: ApprovalAllocation[] = [];
  for (const slot of ordered) {
    if (remaining <= 0) {
      break;
    }
    const applied = Math.min(remaining, slot.remainingCents);
    if (applied > 0) {
      allocations.push({ chargeId: slot.chargeId, amountCents: applied });
      remaining -= applied;
    }
  }

  return { allocations, leftoverCents: remaining, invalidChargeIds };
}

/**
 * Aciklama ipucuyla secilen (ornegin "dogalgaz") kalemleri kapattiktan sonra artan tutar,
 * YALNIZCA ayni turdeki diger kalemlere tasar. Baska turdeki kalemlere (dogalgaz artigi
 * aidata ya da tersi) yazilmaz; kalan tutar daire alacagi olarak bekler.
 *
 * `typeCodeOf` bir kalem icin tur kodunu dondurur; bilinmiyorsa (undefined) kalem kisitlanmaz.
 */
export function restrictSpillToPrimaryTypes<T extends { chargeId: string }>(
  primary: T[],
  rest: T[],
  typeCodeOf: (chargeId: string) => string | undefined
): T[] {
  const primaryTypes = new Set(
    primary.map((charge) => typeCodeOf(charge.chargeId)).filter((code): code is string => Boolean(code))
  );
  if (primaryTypes.size === 0) {
    return rest;
  }
  return rest.filter((charge) => {
    const code = typeCodeOf(charge.chargeId);
    return !code || primaryTypes.has(code);
  });
}

export type HistoryPayment = {
  amountCents: number;
  /** Odemenin kapattigi borclarin tur kodlari (tekrarsiz). */
  typeCodes: string[];
};

export type HistoryTypeHint = { typeCode: string; count: number };

/**
 * Ayni dairenin gecmisteki ayni tutarli odemeleri hep AYNI turu kapatmissa o turu ipucu olarak doner.
 * Gecmis yoksa, karisiksa (farkli turler) ya da odeme birden cok tur kapatmissa null.
 * Yalnizca ipucudur: odeme otomatik yazilmaz, onay ekraninda gosterilir.
 */
export function suggestTypeFromHistory(amountCents: number, history: HistoryPayment[]): HistoryTypeHint | null {
  const matching = history.filter((entry) => entry.amountCents === amountCents && entry.typeCodes.length > 0);
  if (matching.length === 0) {
    return null;
  }
  if (matching.some((entry) => entry.typeCodes.length !== 1)) {
    return null;
  }
  const first = matching[0].typeCodes[0];
  if (matching.some((entry) => entry.typeCodes[0] !== first)) {
    return null;
  }
  return { typeCode: first, count: matching.length };
}

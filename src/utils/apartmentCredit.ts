/**
 * Daire alacagi (bekleyen fazla odeme) yonetimi.
 *
 * Bir daire borcundan fazla odedi ginde fazla kisim hicbir tahakkuga
 * yazilmadan odeme kaydinda bekler (banka ice aktarimi bunu
 * `UNAPPLIED:OVERPAYMENT:<tutar>` etiketiyle isaretler; devir alacagi ve
 * acilis fazla odemesi de dagitimsiz durur).
 *
 * Bu modul o bekleyen tutari yeni acilan tahakkuklara yazar. Tam mutabakattan
 * (`reconcileApartmentPaymentLinks`) farki: MEVCUT dagitimlara hic dokunmaz,
 * yalnizca eksik kalan kismi ekler. Tam mutabakat dagitimlari silip FIFO ile
 * yeniden kurdugu icin, elle yapilmis ama kilitlenmemis dagitim kararlarini
 * bozabiliyor; tahakkuk olusturma gibi sik tetiklenen bir yerde bu risk kabul
 * edilemez.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  OVERPAYMENT_NOTE_PREFIX,
  extractDoorNoTagFromPaymentNote,
  hasManualReconcileLock,
  isSystemPreallocatedManualReview,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
  withOverpaymentNote,
} from "../routes/adminNoteUtils";
import { fromCents, toCents } from "./money";

/** Tek seferde taranacak bekleyen odeme ust siniri. */
const PENDING_CREDIT_SCAN_LIMIT = 20000;

export type PendingCreditSource = {
  paymentId: string;
  surplusCents: number;
  paidAt: Date;
  createdAt: Date;
};

export type OpenChargeSlot = {
  chargeId: string;
  remainingCents: number;
};

export type PlannedCreditAllocation = {
  paymentId: string;
  chargeId: string;
  amountCents: number;
};

/**
 * Bekleyen alacaklari acik tahakkuklara dagitir.
 *
 * Odemeler eskiden yeniye, tahakkuklar cagirana ait siraya gore (vade sirasi)
 * tuketilir. Hicbir tahakkuga kalan borcundan fazlasi yazilmaz.
 */
export function planPendingCreditAllocations(
  sources: PendingCreditSource[],
  charges: OpenChargeSlot[]
): { allocations: PlannedCreditAllocation[]; leftoverCentsByPayment: Map<string, number> } {
  const allocations: PlannedCreditAllocation[] = [];
  const leftoverCentsByPayment = new Map<string, number>();

  const slots = charges
    .filter((charge) => charge.remainingCents > 0)
    .map((charge) => ({ ...charge }));

  const orderedSources = [...sources].sort((a, b) => {
    const paidAtDiff = a.paidAt.getTime() - b.paidAt.getTime();
    if (paidAtDiff !== 0) {
      return paidAtDiff;
    }
    const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }
    return a.paymentId.localeCompare(b.paymentId);
  });

  for (const source of orderedSources) {
    let remaining = source.surplusCents;
    if (remaining <= 0) {
      continue;
    }

    for (const slot of slots) {
      if (remaining <= 0) {
        break;
      }
      if (slot.remainingCents <= 0) {
        continue;
      }

      const applied = Math.min(remaining, slot.remainingCents);
      allocations.push({
        paymentId: source.paymentId,
        chargeId: slot.chargeId,
        amountCents: applied,
      });
      slot.remainingCents -= applied;
      remaining -= applied;
    }

    if (remaining > 0) {
      leftoverCentsByPayment.set(source.paymentId, remaining);
    }
  }

  return { allocations, leftoverCentsByPayment };
}

export type RequestedAllocation = {
  chargeId: string;
  requestedCents: number;
};

export type CappedAllocation = {
  chargeId: string;
  amountCents: number;
};

/**
 * Istenen dagitimi tahakkuklarin kalan borcuyla sinirlar.
 *
 * Bir tahakkuga kalan borcundan fazlasi yazilmaz; sigmayan kisim `excessCents`
 * olarak doner ve cagiran tarafta daire alacagi olarak bekletilir. Ayni
 * tahakkuk birden fazla kez istenirse kalan borc paylasilir.
 *
 * `capped` girisle birebir hizalidir (sifir kalan bir tahakkuk icin 0 doner),
 * boylece cagiran taraf mevcut kalemleri sirasiyla eslestirebilir.
 */
export function capAllocationsToRemainingDebt(
  requested: RequestedAllocation[],
  remainingCentsByChargeId: Map<string, number>
): { capped: CappedAllocation[]; excessCents: number } {
  const budget = new Map(remainingCentsByChargeId);
  const capped: CappedAllocation[] = [];
  let excessCents = 0;

  for (const item of requested) {
    const available = Math.max(0, budget.get(item.chargeId) ?? 0);
    const applied = Math.max(0, Math.min(item.requestedCents, available));

    capped.push({ chargeId: item.chargeId, amountCents: applied });
    budget.set(item.chargeId, available - applied);
    excessCents += item.requestedCents - applied;
  }

  return { capped, excessCents };
}

/**
 * Bir odemenin bekleyen alacak olarak degerlendirilip degerlendirilemeyecegini
 * belirler. Insan karari bekleyen kayitlara dokunmayiz.
 */
function isEligibleForAutoApply(note: string | null): boolean {
  if (hasManualReconcileLock(note) && !isSystemPreallocatedManualReview(note)) {
    return false;
  }

  // Manuel inceleme bekleyen kayitlar bilerek dagitilmamis; sistem bir daireye
  // on-dagitim yapmadiysa otomatik uygulamak o incelemeyi atlamak olur.
  const awaitsManualReview = parsePaymentNoteParts(note).some((part) =>
    part.trim().toUpperCase().startsWith("UNAPPLIED:MANUAL_REVIEW")
  );
  if (awaitsManualReview && !isSystemPreallocatedManualReview(note)) {
    return false;
  }

  return true;
}

export type ApplyPendingCreditsResult = {
  appliedPaymentCount: number;
  createdItemCount: number;
  appliedTotal: number;
  scannedPaymentCount: number;
  truncated: boolean;
};

type RefreshChargeStatuses = (
  chargeIds: string[],
  client?: Prisma.TransactionClient
) => Promise<void>;

/**
 * Verilen dairelerin bekleyen alacaklarini acik tahakkuklarina yazar.
 * Mevcut dagitimlar korunur; yalnizca yeni PaymentItem eklenir.
 */
export async function applyPendingApartmentCredits(params: {
  apartmentIds: string[];
  refreshChargeStatusesForIds: RefreshChargeStatuses;
}): Promise<ApplyPendingCreditsResult> {
  const empty: ApplyPendingCreditsResult = {
    appliedPaymentCount: 0,
    createdItemCount: 0,
    appliedTotal: 0,
    scannedPaymentCount: 0,
    truncated: false,
  };

  const apartmentIds = [...new Set(params.apartmentIds)].filter(Boolean);
  if (apartmentIds.length === 0) {
    return empty;
  }

  const apartments = await prisma.apartment.findMany({
    where: { id: { in: apartmentIds } },
    select: { id: true, doorNo: true },
  });
  if (apartments.length === 0) {
    return empty;
  }

  const apartmentIdByDoorNo = new Map(
    apartments.map((apt) => [normalizeDoorNoForCompare(apt.doorNo), apt.id])
  );
  const targetApartmentIds = new Set(apartments.map((apt) => apt.id));

  // Aday havuzu: daire etiketi olan ve ya hic dagitilmamis ya da uzerinde
  // dagitimsiz bakiye isareti tasiyan odemeler.
  const candidatePayments = await prisma.payment.findMany({
    where: {
      note: { contains: "DOOR:" },
      OR: [{ itemLinks: { none: {} } }, { note: { contains: "UNAPPLIED:" } }],
    },
    select: {
      id: true,
      paidAt: true,
      createdAt: true,
      totalAmount: true,
      note: true,
      itemLinks: {
        select: {
          id: true,
          amount: true,
          chargeId: true,
          charge: { select: { apartmentId: true } },
        },
      },
    },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    take: PENDING_CREDIT_SCAN_LIMIT,
  });

  const sourcesByApartment = new Map<string, PendingCreditSource[]>();
  // (paymentId|chargeId) -> mevcut kalem. Ayni cifte ikinci satir acmak yerine
  // mevcut satiri buyutuyoruz; kod tabani mukerrer (paymentId, chargeId)
  // satirlarini istenmeyen durum sayiyor.
  const existingItemByKey = new Map<string, { id: string; amountCents: number }>();

  for (const payment of candidatePayments) {
    if (!isEligibleForAutoApply(payment.note)) {
      continue;
    }

    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    const apartmentId = apartmentIdByDoorNo.get(normalizeDoorNoForCompare(doorTag));
    if (!apartmentId) {
      continue;
    }

    // Kalemleri baska dairelere de dagilmis odemelere dokunmayiz; fazla tutarin
    // hangi daireye ait oldugu belirsizdir.
    const linkedApartmentIds = new Set(payment.itemLinks.map((item) => item.charge.apartmentId));
    if (linkedApartmentIds.size > 1) {
      continue;
    }
    if (linkedApartmentIds.size === 1 && !linkedApartmentIds.has(apartmentId)) {
      continue;
    }

    const linkedCents = payment.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
    const surplusCents = toCents(payment.totalAmount) - linkedCents;
    if (surplusCents <= 0) {
      continue;
    }

    for (const item of payment.itemLinks) {
      existingItemByKey.set(`${payment.id}|${item.chargeId}`, {
        id: item.id,
        amountCents: toCents(item.amount),
      });
    }

    const list = sourcesByApartment.get(apartmentId) ?? [];
    list.push({
      paymentId: payment.id,
      surplusCents,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    });
    sourcesByApartment.set(apartmentId, list);
  }

  if (sourcesByApartment.size === 0) {
    return {
      ...empty,
      scannedPaymentCount: candidatePayments.length,
      truncated: candidatePayments.length >= PENDING_CREDIT_SCAN_LIMIT,
    };
  }

  const charges = await prisma.charge.findMany({
    where: { apartmentId: { in: [...sourcesByApartment.keys()] } },
    select: {
      id: true,
      apartmentId: true,
      amount: true,
      paymentItems: { select: { amount: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const openChargesByApartment = new Map<string, OpenChargeSlot[]>();
  for (const charge of charges) {
    if (!targetApartmentIds.has(charge.apartmentId)) {
      continue;
    }
    const paidCents = charge.paymentItems.reduce((sum, item) => sum + toCents(item.amount), 0);
    const remainingCents = toCents(charge.amount) - paidCents;
    if (remainingCents <= 0) {
      continue;
    }
    const list = openChargesByApartment.get(charge.apartmentId) ?? [];
    list.push({ chargeId: charge.id, remainingCents });
    openChargesByApartment.set(charge.apartmentId, list);
  }

  const allAllocations: PlannedCreditAllocation[] = [];
  for (const [apartmentId, sources] of sourcesByApartment) {
    const openCharges = openChargesByApartment.get(apartmentId) ?? [];
    if (openCharges.length === 0) {
      continue;
    }
    const { allocations } = planPendingCreditAllocations(sources, openCharges);
    allAllocations.push(...allocations);
  }

  if (allAllocations.length === 0) {
    return {
      ...empty,
      scannedPaymentCount: candidatePayments.length,
      truncated: candidatePayments.length >= PENDING_CREDIT_SCAN_LIMIT,
    };
  }

  const affectedChargeIds = [...new Set(allAllocations.map((x) => x.chargeId))];

  // Notta yazan fazla tutar etiketi dagitimdan sonra eskimemeli; kalan alacaga
  // gore yeniden yaziyoruz (kalmadiysa etiket silinir).
  const appliedCentsByPaymentId = new Map<string, number>();
  for (const allocation of allAllocations) {
    appliedCentsByPaymentId.set(
      allocation.paymentId,
      (appliedCentsByPaymentId.get(allocation.paymentId) ?? 0) + allocation.amountCents
    );
  }

  const noteUpdates: Array<{ paymentId: string; note: string | null }> = [];
  for (const payment of candidatePayments) {
    const appliedCents = appliedCentsByPaymentId.get(payment.id);
    if (appliedCents === undefined || !payment.note?.includes(OVERPAYMENT_NOTE_PREFIX)) {
      continue;
    }

    const linkedCents = payment.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
    const remainingSurplusCents = toCents(payment.totalAmount) - linkedCents - appliedCents;
    const nextNote = withOverpaymentNote(
      payment.note,
      extractDoorNoTagFromPaymentNote(payment.note) ?? "",
      fromCents(Math.max(0, remainingSurplusCents))
    );
    if (nextNote !== payment.note) {
      noteUpdates.push({ paymentId: payment.id, note: nextNote });
    }
  }

  const itemsToCreate: PlannedCreditAllocation[] = [];
  const itemsToGrow: Array<{ id: string; amountCents: number }> = [];

  for (const allocation of allAllocations) {
    const existing = existingItemByKey.get(`${allocation.paymentId}|${allocation.chargeId}`);
    if (existing) {
      itemsToGrow.push({
        id: existing.id,
        amountCents: existing.amountCents + allocation.amountCents,
      });
      continue;
    }
    itemsToCreate.push(allocation);
  }

  await prisma.$transaction(
    async (tx) => {
      if (itemsToCreate.length > 0) {
        await tx.paymentItem.createMany({
          data: itemsToCreate.map((allocation) => ({
            paymentId: allocation.paymentId,
            chargeId: allocation.chargeId,
            amount: fromCents(allocation.amountCents),
          })),
        });
      }

      for (const item of itemsToGrow) {
        await tx.paymentItem.update({
          where: { id: item.id },
          data: { amount: fromCents(item.amountCents) },
        });
      }

      for (const update of noteUpdates) {
        await tx.payment.update({
          where: { id: update.paymentId },
          data: { note: update.note },
        });
      }

      await params.refreshChargeStatusesForIds(affectedChargeIds, tx);
    },
    { timeout: 60000 }
  );

  return {
    appliedPaymentCount: new Set(allAllocations.map((x) => x.paymentId)).size,
    createdItemCount: allAllocations.length,
    appliedTotal: fromCents(allAllocations.reduce((sum, x) => sum + x.amountCents, 0)),
    scannedPaymentCount: candidatePayments.length,
    truncated: candidatePayments.length >= PENDING_CREDIT_SCAN_LIMIT,
  };
}

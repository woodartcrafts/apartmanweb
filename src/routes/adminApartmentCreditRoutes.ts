import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  MANUAL_RECONCILE_LOCK_TAG,
  extractDoorNoTagFromPaymentNote,
  hasManualReconcileLock,
  isAwaitingApproval,
  isSystemPreallocatedManualReview,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
  parseRefundedAmountFromNote,
  withApprovedNote,
  withOverpaymentNote,
} from "./adminNoteUtils";
import { applyPendingApartmentCredits } from "../utils/apartmentCredit";
import { fromCents, toCents } from "../utils/money";
import { planApprovalAllocation, type ApprovalChargeSlot } from "../utils/paymentApproval";

type ApprovalProposalRow = { chargeId: string; amount: number };
type ApprovalOpenChargeRow = {
  chargeId: string;
  periodYear: number;
  periodMonth: number;
  chargeTypeName: string;
  description: string | null;
  remaining: number;
};

const PENDING_CREDIT_LIMIT = 5000;
const OVERPAID_CHARGE_LIMIT = 2000;

type RefreshChargeStatuses = (
  chargeIds: string[],
  client?: Prisma.TransactionClient
) => Promise<void>;

/** Bekleyen tutarin nicin dagitilmadigini insan diline cevirir. */
function describePendingReason(note: string | null): string {
  const parts = parsePaymentNoteParts(note);

  if (isAwaitingApproval(note)) {
    return "Hangi borca ait oldugu belli degil - onay bekliyor";
  }

  for (const part of parts) {
    const upper = part.trim().toUpperCase();
    if (upper.startsWith("UNAPPLIED:OVERPAYMENT")) {
      return "Acik borcu asan odeme";
    }
    if (upper.startsWith("UNAPPLIED:NO_OPEN_DEBT")) {
      return "Odeme sirasinda acik borc yoktu";
    }
    if (upper.startsWith("UNAPPLIED:PARTIAL_MANUAL_SPLIT")) {
      return "Elle bolmede acik borca sigmadi";
    }
    if (upper.startsWith("UNAPPLIED:CARRY_FORWARD")) {
      return "Devir alacagi";
    }
    if (upper.startsWith("UNAPPLIED:OPENING")) {
      return parts.some((x) => x.trim().toUpperCase() === "OPENING:FAZLA_ODEME")
        ? "Acilis kaydi - fazla odeme"
        : "Acilis kaydi";
    }
    if (upper.startsWith("UNAPPLIED:MANUAL_REVIEW")) {
      return "Manuel inceleme bekliyor";
    }
  }

  return "Dagitimsiz bakiye";
}

/**
 * Tutarin otomatik uygulanmasini engelleyen bir durum varsa aciklamasini doner.
 * `null` ise yeni tahakkuk olustugunda kendiliginden uygulanir.
 */
function describeAutoApplyBlocker(params: {
  note: string | null;
  apartmentFound: boolean;
  linkedApartmentCount: number;
}): string | null {
  if (isAwaitingApproval(params.note)) {
    return "Onayinizi bekliyor (kendiliginden yazilmaz)";
  }

  if (!params.apartmentFound) {
    return "Daire etiketi bir daireyle eslesmiyor";
  }

  if (params.linkedApartmentCount > 1) {
    return "Odeme birden fazla daireye dagilmis";
  }

  if (hasManualReconcileLock(params.note) && !isSystemPreallocatedManualReview(params.note)) {
    return "Elle kilitlenmis (otomatik dagitima kapali)";
  }

  const awaitsManualReview = parsePaymentNoteParts(params.note).some((part) =>
    part.trim().toUpperCase().startsWith("UNAPPLIED:MANUAL_REVIEW")
  );
  if (awaitsManualReview && !isSystemPreallocatedManualReview(params.note)) {
    return "Manuel inceleme bekliyor";
  }

  return null;
}

export function createAdminApartmentCreditRoutes(deps: {
  refreshChargeStatusesForIds: RefreshChargeStatuses;
}): Router {
  const router = Router();

  router.get("/apartment-credits", async (_req, res) => {
    const apartments = await prisma.apartment.findMany({
      select: {
        id: true,
        doorNo: true,
        ownerFullName: true,
        block: { select: { name: true } },
      },
    });
    const apartmentByDoorNo = new Map(
      apartments.map((apt) => [normalizeDoorNoForCompare(apt.doorNo), apt])
    );

    // --- 1. Bekleyen alacaklar: dagitilmamis tutar tasiyan odemeler ---
    const candidatePayments = await prisma.payment.findMany({
      where: {
        note: { contains: "DOOR:" },
        OR: [{ itemLinks: { none: {} } }, { note: { contains: "UNAPPLIED:" } }],
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        method: true,
        note: true,
        itemLinks: {
          select: {
            amount: true,
            charge: { select: { apartmentId: true, chargeType: { select: { code: true, name: true } } } },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }],
      take: PENDING_CREDIT_LIMIT,
    });

    const pendingCredits = candidatePayments
      .map((payment) => {
        // Iade edilmis tutar bekleyen alacak degil: para daireye geri gitti.
        const linkedCents = payment.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
        const totalCents = toCents(payment.totalAmount);
        const refundedCents = toCents(parseRefundedAmountFromNote(payment.note));
        const pendingCents = totalCents - linkedCents - refundedCents;
        if (pendingCents <= 0) {
          return null;
        }

        const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
        const apartment = apartmentByDoorNo.get(normalizeDoorNoForCompare(doorTag));
        const linkedApartmentIds = new Set(
          payment.itemLinks.map((item) => item.charge.apartmentId)
        );

        return {
          paymentId: payment.id,
          paidAt: payment.paidAt,
          method: payment.method,
          doorNo: doorTag,
          apartmentId: apartment?.id ?? null,
          apartmentLabel: apartment
            ? `${apartment.block.name}/${apartment.doorNo}${
                apartment.ownerFullName ? ` - ${apartment.ownerFullName}` : ""
              }`
            : null,
          totalAmount: fromCents(totalCents),
          appliedAmount: fromCents(linkedCents),
          pendingAmount: fromCents(pendingCents),
          reason: describePendingReason(payment.note),
          autoApplyBlocker: describeAutoApplyBlocker({
            note: payment.note,
            apartmentFound: Boolean(apartment),
            linkedApartmentCount: linkedApartmentIds.size,
          }),
          pendingApproval: isAwaitingApproval(payment.note),
          approvalProposal: null as ApprovalProposalRow[] | null,
          approvalOpenCharges: null as ApprovalOpenChargeRow[] | null,
          /** Fazla tutarin yalnizca yazilabilecegi tahakkuk turleri (adlari); kisitlama yoksa null. */
          typeRestriction: (() => {
            if (isAwaitingApproval(payment.note)) {
              return null;
            }
            const names = [
              ...new Set(payment.itemLinks.map((item) => item.charge.chargeType.name)),
            ];
            return names.length > 0 ? names : null;
          })() as string[] | null,
          typeRestrictionCodes: [
            ...new Set(payment.itemLinks.map((item) => item.charge.chargeType.code)),
          ],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // Elle uygulanabilecek satirlar: onay bekleyenler ve tur kisitina takilanlar. Bunlar icin
    // dairenin acik kalemlerini getiriyoruz; onay bekleyenlere ayrica onerilen dagitim hesaplanir.
    const needsChargesRows = pendingCredits.filter(
      (row) => row.apartmentId && (row.pendingApproval || row.typeRestriction !== null)
    );
    if (needsChargesRows.length > 0) {
      const apartmentIdsForCharges = [...new Set(needsChargesRows.map((row) => row.apartmentId as string))];
      const chargesForRows = await prisma.charge.findMany({
        where: { apartmentId: { in: apartmentIdsForCharges } },
        select: {
          id: true,
          apartmentId: true,
          amount: true,
          periodYear: true,
          periodMonth: true,
          description: true,
          chargeType: { select: { code: true, name: true } },
          paymentItems: { select: { amount: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      });

      const openByApartment = new Map<
        string,
        Array<ApprovalChargeSlot & { chargeTypeCode: string; meta: ApprovalOpenChargeRow }>
      >();
      for (const charge of chargesForRows) {
        const paidCents = charge.paymentItems.reduce((sum, item) => sum + toCents(item.amount), 0);
        const remainingCents = toCents(charge.amount) - paidCents;
        if (remainingCents <= 0) {
          continue;
        }
        const list = openByApartment.get(charge.apartmentId) ?? [];
        list.push({
          chargeId: charge.id,
          remainingCents,
          chargeTypeCode: charge.chargeType.code,
          meta: {
            chargeId: charge.id,
            periodYear: charge.periodYear,
            periodMonth: charge.periodMonth,
            chargeTypeName: charge.chargeType.name,
            description: charge.description ?? null,
            remaining: fromCents(remainingCents),
          },
        });
        openByApartment.set(charge.apartmentId, list);
      }

      const orderedRows = [...needsChargesRows].sort(
        (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
      );
      for (const row of orderedRows) {
        const slots = openByApartment.get(row.apartmentId as string) ?? [];
        row.approvalOpenCharges = slots.map((slot) => slot.meta);

        if (row.pendingApproval) {
          const plan = planApprovalAllocation({
            amountCents: toCents(row.pendingAmount),
            charges: slots.map((slot) => ({ chargeId: slot.chargeId, remainingCents: slot.remainingCents })),
          });
          row.approvalProposal = plan.allocations.map((allocation) => ({
            chargeId: allocation.chargeId,
            amount: fromCents(allocation.amountCents),
          }));
          // Sonraki bekleyen odeme ayni kalemleri tekrar onermesin.
          for (const allocation of plan.allocations) {
            const slot = slots.find((candidate) => candidate.chargeId === allocation.chargeId);
            if (slot) {
              slot.remainingCents -= allocation.amountCents;
            }
          }
          continue;
        }

        // Tur kisitli alacak: ayni turde acik kalem yoksa otomatik uygulanmaz, elle secilebilir.
        const allowedCodes = row.typeRestrictionCodes;
        const hasAllowedOpenCharge = slots.some((slot) => allowedCodes.includes(slot.chargeTypeCode));
        if (row.autoApplyBlocker === null && !hasAllowedOpenCharge) {
          row.autoApplyBlocker = `Yalnizca ${(row.typeRestriction ?? []).join(" / ")} borcuna otomatik yazilir; su an acik ${(row.typeRestriction ?? []).join(" / ")} borcu yok`;
        }
      }
    }

    // --- 2. Fazla odenmis tahakkuklar: odenen > tahakkuk tutari ---
    // Eski elle giris yolu fazla tutari dogrudan tahakkuga yazabiliyordu;
    // bu kayitlar raporlarda kapali gorunur ve fark hicbir yerde cikmaz.
    const paidGrouped = await prisma.paymentItem.groupBy({
      by: ["chargeId"],
      _sum: { amount: true },
    });

    const paidCentsByChargeId = new Map(
      paidGrouped.map((row) => [row.chargeId, toCents(row._sum.amount ?? 0)])
    );

    const chargeAmounts = await prisma.charge.findMany({
      where: { id: { in: [...paidCentsByChargeId.keys()] } },
      select: { id: true, amount: true },
    });

    const overpaidChargeIds = chargeAmounts
      .filter((charge) => (paidCentsByChargeId.get(charge.id) ?? 0) > toCents(charge.amount))
      .map((charge) => charge.id);

    const overpaidChargeRows = await prisma.charge.findMany({
      where: { id: { in: overpaidChargeIds.slice(0, OVERPAID_CHARGE_LIMIT) } },
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
        status: true,
        chargeType: { select: { name: true } },
        apartment: {
          select: {
            id: true,
            doorNo: true,
            ownerFullName: true,
            block: { select: { name: true } },
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    const overpaidCharges = overpaidChargeRows.map((charge) => {
      const paidCents = paidCentsByChargeId.get(charge.id) ?? 0;
      const amountCents = toCents(charge.amount);
      return {
        chargeId: charge.id,
        apartmentId: charge.apartment.id,
        doorNo: charge.apartment.doorNo,
        apartmentLabel: `${charge.apartment.block.name}/${charge.apartment.doorNo}${
          charge.apartment.ownerFullName ? ` - ${charge.apartment.ownerFullName}` : ""
        }`,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        chargeTypeName: charge.chargeType.name,
        status: charge.status,
        amount: fromCents(amountCents),
        paidAmount: fromCents(paidCents),
        excessAmount: fromCents(paidCents - amountCents),
      };
    });

    return res.json({
      snapshotAt: new Date(),
      truncated:
        candidatePayments.length >= PENDING_CREDIT_LIMIT ||
        overpaidChargeIds.length > OVERPAID_CHARGE_LIMIT,
      pendingCredits,
      pendingTotal: Number(
        pendingCredits.reduce((sum, row) => sum + row.pendingAmount, 0).toFixed(2)
      ),
      applicablePendingTotal: Number(
        pendingCredits
          .filter((row) => row.autoApplyBlocker === null)
          .reduce((sum, row) => sum + row.pendingAmount, 0)
          .toFixed(2)
      ),
      overpaidCharges,
      overpaidTotal: Number(
        overpaidCharges.reduce((sum, row) => sum + row.excessAmount, 0).toFixed(2)
      ),
    });
  });

  /**
   * Bekleyen alacaklari simdi uygular. Normalde yeni tahakkuk olustugunda
   * kendiliginden calisir; bu uc gecmis birikmis alacaklari temizlemek icin.
   */
  router.post("/apartment-credits/apply", async (req, res) => {
    const parsed = z
      .object({ apartmentIds: z.array(z.string().min(1)).max(1000).optional() })
      .safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    let apartmentIds = parsed.data.apartmentIds ?? [];

    if (apartmentIds.length === 0) {
      const allApartments = await prisma.apartment.findMany({ select: { id: true } });
      apartmentIds = allApartments.map((apt) => apt.id);
    }

    const result = await applyPendingApartmentCredits({
      apartmentIds,
      refreshChargeStatusesForIds: deps.refreshChargeStatusesForIds,
    });

    return res.json(result);
  });

  /**
   * Bekleyen odemeyi elle borca yazar.
   * - Onay bekleyen odeme: `chargeIds` verilmezse onerilen dagitim (vade sirasiyla tum acik
   *   kalemler); verilirse yalnizca o kalemlere, verilen sirayla yazilir. Onaylanan odeme
   *   `RECONCILE_LOCK:MANUAL` kilidini tasir: insan karari mutabakatla bozulmaz.
   * - Diger bekleyen alacaklar (ornegin tur kisitina takilanlar): `chargeIds` ZORUNLUDUR.
   */
  router.post("/apartment-credits/approve", async (req, res) => {
    const parsed = z
      .object({
        paymentId: z.string().min(1),
        chargeIds: z.array(z.string().min(1)).max(200).optional(),
      })
      .safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parsed.data.paymentId },
      select: {
        id: true,
        totalAmount: true,
        note: true,
        itemLinks: { select: { amount: true, charge: { select: { apartmentId: true } } } },
      },
    });
    if (!payment) {
      return res.status(404).json({ message: "Odeme bulunamadi" });
    }
    const awaitingApproval = isAwaitingApproval(payment.note);
    // Onay beklemeyen (ornegin tura takilmis) alacaklar yalnizca yoneticinin ACIKCA sectigi
    // kalemlere yazilir; varsayilan FIFO onerisi sadece onay bekleyen odemeler icindir.
    if (!awaitingApproval && !(parsed.data.chargeIds && parsed.data.chargeIds.length > 0)) {
      return res.status(409).json({ message: "Bu odeme icin yazilacak borc kalemlerini secmelisiniz" });
    }
    if (!awaitingApproval && !extractDoorNoTagFromPaymentNote(payment.note)) {
      return res.status(422).json({ message: "Odemenin daire etiketi yok" });
    }

    const doorTag = extractDoorNoTagFromPaymentNote(payment.note);
    const apartments = await prisma.apartment.findMany({ select: { id: true, doorNo: true } });
    const apartment = apartments.find(
      (apt) => normalizeDoorNoForCompare(apt.doorNo) === normalizeDoorNoForCompare(doorTag)
    );
    if (!apartment) {
      return res.status(422).json({ message: "Odemenin daire etiketi bir daireyle eslesmiyor" });
    }

    // Baska dairelere de dagilmis odemeye dokunma: kalan tutarin hangi daireye ait oldugu belirsiz.
    if (payment.itemLinks.some((item) => item.charge.apartmentId !== apartment.id)) {
      return res.status(422).json({ message: "Odeme baska dairelere de dagilmis; elle duzeltilmeli" });
    }

    const linkedCents = payment.itemLinks.reduce((sum, item) => sum + toCents(item.amount), 0);
    const refundedCents = toCents(parseRefundedAmountFromNote(payment.note));
    const availableCents = toCents(payment.totalAmount) - linkedCents - refundedCents;
    if (availableCents <= 0) {
      return res.status(409).json({ message: "Dagitilacak tutar kalmamis" });
    }

    const charges = await prisma.charge.findMany({
      where: { apartmentId: apartment.id },
      select: { id: true, amount: true, paymentItems: { select: { amount: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });
    const slots: ApprovalChargeSlot[] = charges.map((charge) => ({
      chargeId: charge.id,
      remainingCents:
        toCents(charge.amount) -
        charge.paymentItems.reduce((sum, item) => sum + toCents(item.amount), 0),
    }));

    const plan = planApprovalAllocation({
      amountCents: availableCents,
      charges: slots,
      preferredChargeIds: parsed.data.chargeIds,
    });
    if (plan.invalidChargeIds.length > 0) {
      return res.status(400).json({
        message: "Secilen kalemlerden bazilari bu dairenin acik borcu degil",
        invalidChargeIds: plan.invalidChargeIds,
      });
    }
    if (plan.allocations.length === 0) {
      return res.status(409).json({ message: "Dairede yazilacak acik borc yok" });
    }

    let nextNote: string | null;
    if (awaitingApproval) {
      const approvedTag =
        parsed.data.chargeIds && parsed.data.chargeIds.length > 0
          ? "AUTO_MATCH:MANUAL_APPROVED"
          : "AUTO_MATCH:FIFO_FALLBACK:APPROVED";
      nextNote = withApprovedNote(payment.note, approvedTag);
      if (plan.leftoverCents > 0) {
        nextNote = withOverpaymentNote(nextNote, doorTag ?? "", fromCents(plan.leftoverCents));
      }
      if (nextNote && !nextNote.includes(MANUAL_RECONCILE_LOCK_TAG)) {
        nextNote = `${nextNote} | ${MANUAL_RECONCILE_LOCK_TAG}`;
      }
    } else {
      // Tura takilmis alacak: yalnizca kalan alacak etiketini guncelle. Kilit eklenmez ki
      // artan tutar (varsa) sonraki tahakkuklara kendiliginden yazilmaya devam etsin.
      nextNote = withOverpaymentNote(payment.note, doorTag ?? "", fromCents(plan.leftoverCents));
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          // Es zamanli ikinci onayi engelle: not hala ayni (onay bekliyor) olmali.
          const claimed = await tx.payment.updateMany({
            where: { id: payment.id, note: payment.note },
            data: { note: nextNote },
          });
          if (claimed.count !== 1) {
            throw new Error("APPROVAL_CONFLICT");
          }

          await tx.paymentItem.createMany({
            data: plan.allocations.map((allocation) => ({
              paymentId: payment.id,
              chargeId: allocation.chargeId,
              amount: fromCents(allocation.amountCents),
            })),
          });

          await deps.refreshChargeStatusesForIds(
            plan.allocations.map((allocation) => allocation.chargeId),
            tx
          );
        },
        { timeout: 30000 }
      );
    } catch (err) {
      if (err instanceof Error && err.message === "APPROVAL_CONFLICT") {
        return res.status(409).json({ message: "Bu odeme baska bir islemle zaten guncellendi" });
      }
      throw err;
    }

    return res.json({
      paymentId: payment.id,
      appliedTotal: fromCents(plan.allocations.reduce((sum, a) => sum + a.amountCents, 0)),
      leftover: fromCents(plan.leftoverCents),
      itemCount: plan.allocations.length,
    });
  });

  return router;
}

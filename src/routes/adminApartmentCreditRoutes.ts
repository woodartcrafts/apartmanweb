import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  extractDoorNoTagFromPaymentNote,
  hasManualReconcileLock,
  isSystemPreallocatedManualReview,
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
  parseRefundedAmountFromNote,
} from "./adminNoteUtils";
import { applyPendingApartmentCredits } from "../utils/apartmentCredit";
import { fromCents, toCents } from "../utils/money";

const PENDING_CREDIT_LIMIT = 5000;
const OVERPAID_CHARGE_LIMIT = 2000;

type RefreshChargeStatuses = (
  chargeIds: string[],
  client?: Prisma.TransactionClient
) => Promise<void>;

/** Bekleyen tutarin nicin dagitilmadigini insan diline cevirir. */
function describePendingReason(note: string | null): string {
  const parts = parsePaymentNoteParts(note);

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
            charge: { select: { apartmentId: true } },
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
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

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

  return router;
}

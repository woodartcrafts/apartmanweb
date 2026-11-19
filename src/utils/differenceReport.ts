import { UserRole } from "@prisma/client";
import { prisma } from "../db";
import { parseRefundedAmountFromNote } from "../routes/adminNoteUtils";
import { analyzeDifference, type DifferenceAnalysis, type DiffEvent } from "./differenceSource";
import { buildLeftoverNotes, extractDoorNo, extractPayerName, type LeftoverNote } from "./leftoverNotes";
import { toCents } from "./money";

/**
 * Mobil Kalan Islemler (fark kaynagi): her dairenin bugunku "odenen - odenmesi gereken" farkini ve
 * bu farkin hangi odemede dogdugunu gosterir. Sadece okur, hicbir kaydi degistirmez.
 */
export type DifferenceItem = DifferenceAnalysis & {
  doorNo: string;
  name: string;
};

export type DifferenceReport = {
  generatedAt: string;
  lastDataAt: string | null;
  totals: { eksik: number; fazla: number; onay: number };
  differences: DifferenceItem[];
  pendingApprovals: LeftoverNote[];
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Nakit",
  BANK_TRANSFER: "Banka",
  CREDIT_CARD: "Kart",
};

function describePayment(note: string | null, method: string): string {
  const payer = extractPayerName(note);
  if (payer) {
    return payer;
  }
  return METHOD_LABEL[method] ?? "Ödeme";
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export async function buildDifferenceReport(now: Date = new Date()): Promise<DifferenceReport> {
  const [apartments, charges, payments, leftover] = await Promise.all([
    prisma.apartment.findMany({
      select: {
        id: true,
        doorNo: true,
        ownerFullName: true,
        users: {
          where: { role: UserRole.RESIDENT },
          select: { fullName: true },
          orderBy: [{ fullName: "asc" }],
        },
      },
    }),
    prisma.charge.findMany({
      where: { amount: { gt: 0 }, dueDate: { lte: now } },
      select: {
        apartmentId: true,
        amount: true,
        dueDate: true,
        periodYear: true,
        periodMonth: true,
        chargeType: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { paidAt: { lte: now } },
      select: {
        paidAt: true,
        totalAmount: true,
        method: true,
        note: true,
        itemLinks: { select: { amount: true, charge: { select: { apartmentId: true } } } },
      },
    }),
    buildLeftoverNotes(null),
  ]);

  const apartmentByDoor = new Map<string, string>();
  const nameByApartment = new Map<string, { doorNo: string; name: string }>();
  for (const apartment of apartments) {
    const residents = apartment.users.map((user) => user.fullName.trim()).filter(Boolean);
    const name = residents.length > 0 ? residents.join(", ") : apartment.ownerFullName?.trim() ?? "";
    apartmentByDoor.set(apartment.doorNo, apartment.id);
    nameByApartment.set(apartment.id, { doorNo: apartment.doorNo, name });
  }

  const eventsByApartment = new Map<string, DiffEvent[]>();
  const pushEvent = (apartmentId: string, event: DiffEvent): void => {
    const list = eventsByApartment.get(apartmentId);
    if (list) {
      list.push(event);
    } else {
      eventsByApartment.set(apartmentId, [event]);
    }
  };

  for (const charge of charges) {
    const cents = toCents(charge.amount);
    if (!Number.isFinite(cents) || cents <= 0) {
      continue;
    }
    pushEvent(charge.apartmentId, {
      date: charge.dueDate,
      kind: "CHARGE",
      cents,
      label: `${charge.chargeType.name} ${charge.periodYear}-${String(charge.periodMonth).padStart(2, "0")}`,
    });
  }

  // Onay bekleyen odemesi olan daireler fark listesine girmez; "Onay bekleyen" bolumunde gorunur.
  const pendingApartments = new Set<string>();

  for (const payment of payments) {
    const note = payment.note ?? "";
    const totalCents = toCents(payment.totalAmount);
    if (!Number.isFinite(totalCents)) {
      continue;
    }

    const appliedByApartment = new Map<string, number>();
    let appliedCents = 0;
    for (const link of payment.itemLinks) {
      const cents = toCents(link.amount);
      if (!Number.isFinite(cents)) {
        continue;
      }
      appliedCents += cents;
      const apartmentId = link.charge.apartmentId;
      appliedByApartment.set(apartmentId, (appliedByApartment.get(apartmentId) ?? 0) + cents);
    }

    // Iade edilmis ya da hesaplar arasi virmanla kapanmis kisim daireye alacak sayilmaz.
    const refundedCents = toCents(parseRefundedAmountFromNote(note));
    const transferred = note.includes("ACCOUNT_TRANSFER:");
    const unappliedCents = transferred ? 0 : Math.max(0, totalCents - appliedCents - (Number.isFinite(refundedCents) ? refundedCents : 0));

    const label = describePayment(note, payment.method);
    const pending = note.includes("UNAPPLIED:PENDING_APPROVAL");

    if (unappliedCents > 0) {
      const door = extractDoorNo(note);
      const apartmentId = door ? apartmentByDoor.get(door) : undefined;
      if (apartmentId) {
        if (pending) {
          pendingApartments.add(apartmentId);
        }
        appliedByApartment.set(apartmentId, (appliedByApartment.get(apartmentId) ?? 0) + unappliedCents);
      }
    }

    for (const [apartmentId, cents] of appliedByApartment) {
      if (cents > 0) {
        pushEvent(apartmentId, { date: payment.paidAt, kind: "PAYMENT", cents, label });
      }
    }
  }

  const differences: DifferenceItem[] = [];
  for (const [apartmentId, events] of eventsByApartment) {
    if (pendingApartments.has(apartmentId)) {
      continue;
    }
    const info = nameByApartment.get(apartmentId);
    if (!info) {
      continue;
    }
    const analysis = analyzeDifference(events, now);
    if (analysis) {
      differences.push({ ...analysis, doorNo: info.doorNo, name: info.name });
    }
  }
  differences.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const pendingApprovals = leftover.notes.filter((note) => note.kind === "ONAY");
  const sumAbs = (kind: "EKSIK" | "FAZLA") =>
    round2(differences.filter((item) => item.kind === kind).reduce((sum, item) => sum + Math.abs(item.diff), 0));

  return {
    generatedAt: now.toISOString(),
    lastDataAt: leftover.lastDataAt,
    totals: {
      eksik: sumAbs("EKSIK"),
      fazla: sumAbs("FAZLA"),
      onay: round2(pendingApprovals.reduce((sum, note) => sum + note.amount, 0)),
    },
    differences,
    pendingApprovals,
  };
}

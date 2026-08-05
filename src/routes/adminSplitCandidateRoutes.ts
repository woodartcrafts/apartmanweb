import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  normalizeDoorNoForCompare,
  parsePaymentNoteParts,
  parseRefundedAmountFromNote,
} from "./adminNoteUtils";
import { detectSplitCandidateDoorNos } from "../utils/splitCandidate";

/** Elle bolunmus tahsilatlar bu etiketi tasir; listede bir daha gorunmezler. */
const MANUAL_SPLIT_NOTE_TAG = "BANK_SPLIT:MANUAL";
/** "Bolunmesin" denen tahsilatlar bu etiketi tasir. */
const SPLIT_DISMISSED_NOTE_TAG = "SPLIT_DISMISSED:1";
const CANDIDATE_SCAN_LIMIT = 5000;

type RefreshChargeStatuses = (
  chargeIds: string[],
  client?: Prisma.TransactionClient
) => Promise<void>;

type PushActionLog = (input: {
  actionType: "EDIT";
  entityType: "PAYMENT";
  entityId: string;
  actorUserId: string | null;
  before: unknown;
  after: unknown;
  undoKind: null;
  undoPayload: null;
  undoable?: boolean;
}) => Promise<unknown>;

class SplitConflictError extends Error {}

function readNoteTag(note: string | null, prefix: string): string | null {
  const part = parsePaymentNoteParts(note).find((x) => x.startsWith(prefix));
  if (!part) {
    return null;
  }
  return part.slice(prefix.length).trim() || null;
}

/**
 * Bolunen parcalar icin yeni not uretir: banka referansi ve aciklamasi korunur,
 * daire etiketi hedef daireye ayarlanir, eski dagitim/siniflandirma etiketleri
 * temizlenir (yeniden dagitiyoruz).
 */
function buildSplitPartNote(params: {
  originalNote: string | null;
  doorNo: string;
  unappliedReason: string | null;
}): string {
  const preserved = parsePaymentNoteParts(params.originalNote).filter(
    (part) =>
      part.startsWith("BANK_REF:") ||
      part.startsWith("BANK_DESC:") ||
      part.startsWith("PAYMENT_UPLOAD:")
  );

  const parts = [
    ...preserved,
    `DOOR:${params.doorNo}`,
    MANUAL_SPLIT_NOTE_TAG,
    ...(params.unappliedReason ? [`UNAPPLIED:${params.unappliedReason}`] : []),
  ];

  return parts.join(" | ");
}

export function createAdminSplitCandidateRoutes(deps: {
  refreshChargeStatusesForIds: RefreshChargeStatuses;
  pushActionLog: PushActionLog;
}): Router {
  const router = Router();
  const { refreshChargeStatusesForIds, pushActionLog } = deps;

  router.get("/split-candidates", async (req, res) => {
    const parsedQuery = z
      .object({ includeDismissed: z.enum(["true", "false"]).optional() })
      .safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsedQuery.error.issues });
    }
    const includeDismissed = parsedQuery.data.includeDismissed === "true";

    // Banka kaynakli ve henuz bolunmemis tahsilatlar.
    const payments = await prisma.payment.findMany({
      where: {
        AND: [
          { note: { contains: "BANK_DESC:" } },
          { note: { not: { contains: "BANK_SPLIT:" } } },
          ...(includeDismissed
            ? []
            : [{ note: { not: { contains: SPLIT_DISMISSED_NOTE_TAG } } }]),
        ],
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        method: true,
        itemLinks: {
          select: {
            id: true,
            amount: true,
            charge: {
              select: {
                id: true,
                apartment: {
                  select: { id: true, doorNo: true, block: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: CANDIDATE_SCAN_LIMIT,
    });

    const apartments = await prisma.apartment.findMany({
      select: {
        id: true,
        doorNo: true,
        ownerFullName: true,
        block: { select: { name: true } },
      },
    });
    const apartmentByDoor = new Map(
      apartments.map((apt) => [normalizeDoorNoForCompare(apt.doorNo), apt])
    );

    const rows = payments
      .map((payment) => {
        const bankDescription = readNoteTag(payment.note, "BANK_DESC:");
        const detected = detectSplitCandidateDoorNos(bankDescription);
        if (detected.length < 2) {
          return null;
        }

        // Sadece sistemde gercekten var olan daireler onerilir.
        const matched = detected
          .map((doorNo) => apartmentByDoor.get(normalizeDoorNoForCompare(doorNo)))
          .filter((apt): apt is (typeof apartments)[number] => Boolean(apt));

        if (matched.length < 2) {
          return null;
        }

        const currentApartments = [
          ...new Map(
            payment.itemLinks
              .map((link) => link.charge.apartment)
              .map((apt) => [apt.id, apt])
          ).values(),
        ];

        const allocatedAmount = Number(
          payment.itemLinks.reduce((sum, link) => sum + Number(link.amount), 0).toFixed(2)
        );

        return {
          paymentId: payment.id,
          paidAt: payment.paidAt,
          amount: Number(payment.totalAmount),
          allocatedAmount,
          method: payment.method,
          dismissed: parsePaymentNoteParts(payment.note).includes(SPLIT_DISMISSED_NOTE_TAG),
          bankDescription,
          bankReference: readNoteTag(payment.note, "BANK_REF:"),
          currentDoorNo: readNoteTag(payment.note, "DOOR:"),
          currentApartments: currentApartments.map((apt) => ({
            apartmentId: apt.id,
            doorNo: apt.doorNo,
            label: `${apt.block.name}/${apt.doorNo}`,
          })),
          detectedDoorNos: detected,
          suggestedApartments: matched.map((apt) => ({
            apartmentId: apt.id,
            doorNo: apt.doorNo,
            label: `${apt.block.name}/${apt.doorNo}${
              apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""
            }`,
          })),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return res.json({
      snapshotAt: new Date(),
      truncated: payments.length >= CANDIDATE_SCAN_LIMIT,
      scannedPaymentCount: payments.length,
      totalRowCount: rows.length,
      rows,
    });
  });

  router.post("/split-candidates/:paymentId/dismiss", async (req, res) => {
    const { paymentId } = req.params;
    const parsed = z.object({ dismissed: z.boolean().optional() }).safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }
    const dismissed = parsed.data.dismissed ?? true;

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, note: true },
    });
    if (!existing) {
      return res.status(404).json({ message: "Tahsilat bulunamadi" });
    }

    const parts = parsePaymentNoteParts(existing.note);
    const isDismissed = parts.includes(SPLIT_DISMISSED_NOTE_TAG);
    if (isDismissed === dismissed) {
      return res.json({ ok: true, paymentId, dismissed, changed: false });
    }

    const nextParts = dismissed
      ? [...parts, SPLIT_DISMISSED_NOTE_TAG]
      : parts.filter((part) => part !== SPLIT_DISMISSED_NOTE_TAG);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { note: nextParts.length > 0 ? nextParts.join(" | ") : null },
    });

    return res.json({ ok: true, paymentId, dismissed, changed: true });
  });

  router.post("/split-candidates/:paymentId/split", async (req, res) => {
    const { paymentId } = req.params;
    const parsed = z
      .object({
        parts: z
          .array(
            z.object({
              doorNo: z.string().trim().min(1).max(50),
              amount: z.number().positive(),
            })
          )
          .min(2)
          .max(20),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const parts = parsed.data.parts.map((part) => ({
      doorNo: part.doorNo.trim(),
      amount: Number(part.amount.toFixed(2)),
    }));

    const duplicateDoor = parts
      .map((part) => normalizeDoorNoForCompare(part.doorNo))
      .find((door, index, all) => all.indexOf(door) !== index);
    if (duplicateDoor) {
      return res.status(400).json({ message: `Ayni daire iki kez girilmis: ${duplicateDoor}` });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        method: true,
        importBatchId: true,
        createdById: true,
        itemLinks: { select: { id: true, chargeId: true, amount: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Tahsilat bulunamadi" });
    }

    // Bolme tahsilati siler ve parcalarini bastan olusturur; "iade edilmis tutar"
    // etiketi bu sirada tasinamaz ve hangi parcaya ait oldugu da belirsizdir.
    // Tasinmazsa iade edilen para tekrar dagitilabilir hale gelir.
    const refundedAmount = parseRefundedAmountFromNote(payment.note);
    if (refundedAmount > 0) {
      return res.status(400).json({
        message: `Bu tahsilattan ${refundedAmount.toFixed(2)} TL daireye iade edilmis; iade edilmis tahsilat bolunemez.`,
        refundedAmount,
      });
    }

    const originalTotal = Number(Number(payment.totalAmount).toFixed(2));
    const partsTotal = Number(parts.reduce((sum, part) => sum + part.amount, 0).toFixed(2));
    // Kurus bazinda birebir esitlik sart: aksi halde banka mutabakati kayar.
    if (Math.round(partsTotal * 100) !== Math.round(originalTotal * 100)) {
      return res.status(400).json({
        message: `Girilen tutarlarin toplami tahsilat tutarina birebir esit olmali (girilen: ${partsTotal.toFixed(2)} TL, tahsilat: ${originalTotal.toFixed(2)} TL)`,
        partsTotal,
        originalTotal,
      });
    }

    const apartments = await prisma.apartment.findMany({
      select: { id: true, doorNo: true, block: { select: { name: true } } },
    });
    const apartmentByDoor = new Map(
      apartments.map((apt) => [normalizeDoorNoForCompare(apt.doorNo), apt])
    );

    const resolvedParts = parts.map((part) => ({
      ...part,
      apartment: apartmentByDoor.get(normalizeDoorNoForCompare(part.doorNo)),
    }));
    const missingDoors = resolvedParts.filter((part) => !part.apartment).map((part) => part.doorNo);
    if (missingDoors.length > 0) {
      return res.status(404).json({ message: `Daire bulunamadi: ${missingDoors.join(", ")}` });
    }

    const affectedChargeIds = new Set<string>(payment.itemLinks.map((link) => link.chargeId));
    const createdSummaries: Array<{
      paymentId: string;
      doorNo: string;
      apartmentLabel: string;
      amount: number;
      allocatedAmount: number;
      unappliedAmount: number;
    }> = [];

    try {
      await prisma.$transaction(
        async (tx) => {
          affectedChargeIds.clear();
          createdSummaries.length = 0;

          // Kalemleri islem icinde okuyoruz: disaridaki okuma ile silme arasinda
          // baska bir islem kalem ekleseydi o tahakkugun durumu yenilenmezdi.
          const currentItems = await tx.paymentItem.findMany({
            where: { paymentId: payment.id },
            select: { chargeId: true },
          });
          for (const link of currentItems) {
            affectedChargeIds.add(link.chargeId);
          }

          // Kaynak tahsilati atomik olarak sil. Ayni anda gelen ikinci istek
          // burada count=0 alir ve islem tekrarlanmaz.
          const deleted = await tx.payment.deleteMany({ where: { id: payment.id } });
          if (deleted.count === 0) {
            throw new SplitConflictError("Bu tahsilat baska bir islemde degistirilmis, sayfayi yenileyin");
          }

          for (const part of resolvedParts) {
            const apartment = part.apartment!;

            const charges = await tx.charge.findMany({
              where: { apartmentId: apartment.id },
              select: {
                id: true,
                amount: true,
                paymentItems: { select: { amount: true } },
              },
              orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { dueDate: "asc" }],
            });

            const openCharges = charges
              .map((charge) => {
                const paid = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);
                return { id: charge.id, remaining: Number((Number(charge.amount) - paid).toFixed(2)) };
              })
              .filter((charge) => charge.remaining > 0.0001);

            let remaining = part.amount;
            const allocations: Array<{ chargeId: string; amount: number }> = [];
            for (const charge of openCharges) {
              if (remaining <= 0.0001) {
                break;
              }
              const applied = Number(Math.min(remaining, charge.remaining).toFixed(2));
              if (applied <= 0) {
                continue;
              }
              allocations.push({ chargeId: charge.id, amount: applied });
              remaining = Number((remaining - applied).toFixed(2));
            }

            const allocatedAmount = Number(
              allocations.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
            );
            const unappliedAmount = Number((part.amount - allocatedAmount).toFixed(2));

            const createdPayment = await tx.payment.create({
              data: {
                importBatchId: payment.importBatchId,
                paidAt: payment.paidAt,
                method: payment.method,
                totalAmount: part.amount,
                createdById: payment.createdById,
                note: buildSplitPartNote({
                  originalNote: payment.note,
                  doorNo: apartment.doorNo,
                  unappliedReason:
                    unappliedAmount > 0.0001
                      ? openCharges.length === 0
                        ? "NO_OPEN_DEBT"
                        : "PARTIAL_MANUAL_SPLIT"
                      : null,
                }),
              },
              select: { id: true },
            });

            for (const allocation of allocations) {
              await tx.paymentItem.create({
                data: {
                  paymentId: createdPayment.id,
                  chargeId: allocation.chargeId,
                  amount: allocation.amount,
                },
              });
              affectedChargeIds.add(allocation.chargeId);
            }

            createdSummaries.push({
              paymentId: createdPayment.id,
              doorNo: apartment.doorNo,
              apartmentLabel: `${apartment.block.name}/${apartment.doorNo}`,
              amount: part.amount,
              allocatedAmount,
              unappliedAmount,
            });
          }

          await refreshChargeStatusesForIds([...affectedChargeIds], tx);
        },
        { timeout: 30000 }
      );
    } catch (error) {
      if (error instanceof SplitConflictError) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }

    await pushActionLog({
      actionType: "EDIT",
      entityType: "PAYMENT",
      entityId: payment.id,
      actorUserId: req.user?.userId ?? null,
      before: {
        paymentId: payment.id,
        totalAmount: originalTotal,
        note: payment.note,
        paymentItems: payment.itemLinks,
      },
      after: {
        splitInto: createdSummaries,
        affectedChargeIds: [...affectedChargeIds],
      },
      undoKind: null,
      undoPayload: null,
      undoable: false,
    }).catch((error) => {
      console.error("[split-candidates] audit log yazilamadi", error);
    });

    return res.json({
      ok: true,
      originalPaymentId: payment.id,
      originalAmount: originalTotal,
      createdPayments: createdSummaries,
      affectedChargeCount: affectedChargeIds.size,
    });
  });

  return router;
}

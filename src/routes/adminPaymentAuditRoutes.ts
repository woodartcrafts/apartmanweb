import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { normalizeDoorNoForCompare } from "./adminNoteUtils";
import { fromCents, toCents } from "../utils/money";
import {
  auditPayments,
  type AuditChargeInput,
  type AuditPaymentInput,
  type AuditReport,
} from "../utils/paymentAudit";

const PAYMENT_SCAN_LIMIT = 5000;
const OVERPAID_SCAN_LIMIT = 500;
export const DEFAULT_AUDIT_WINDOW_DAYS = 45;

/**
 * Salt-okunur denetim raporu uretir (hicbir kayit degismez). Hem ekran (GET /payment-audit)
 * hem gunluk zamanlayici bunu kullanir.
 */
export async function loadPaymentAuditReport(windowDays: number = DEFAULT_AUDIT_WINDOW_DAYS): Promise<AuditReport> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [apartments, payments, paidGrouped] = await Promise.all([
    prisma.apartment.findMany({ select: { doorNo: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: since } },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        note: true,
        itemLinks: { select: { charge: { select: { apartment: { select: { doorNo: true } } } } } },
      },
      orderBy: [{ paidAt: "desc" }],
      take: PAYMENT_SCAN_LIMIT,
    }),
    prisma.paymentItem.groupBy({ by: ["chargeId"], _sum: { amount: true } }),
  ]);

  const doorNoSet = new Set<string>();
  for (const apartment of apartments) {
    doorNoSet.add(apartment.doorNo);
    doorNoSet.add(normalizeDoorNoForCompare(apartment.doorNo));
  }

  const paidCentsByChargeId = new Map(paidGrouped.map((row) => [row.chargeId, toCents(row._sum.amount ?? 0)]));
  const chargeAmounts = await prisma.charge.findMany({
    where: { id: { in: [...paidCentsByChargeId.keys()] } },
    select: { id: true, amount: true },
  });
  const overpaidIds = chargeAmounts
    .filter((charge) => (paidCentsByChargeId.get(charge.id) ?? 0) > toCents(charge.amount))
    .map((charge) => charge.id)
    .slice(0, OVERPAID_SCAN_LIMIT);

  const overpaidCharges =
    overpaidIds.length === 0
      ? []
      : await prisma.charge.findMany({
          where: { id: { in: overpaidIds } },
          select: {
            id: true,
            amount: true,
            periodYear: true,
            periodMonth: true,
            chargeType: { select: { name: true } },
            apartment: { select: { doorNo: true, block: { select: { name: true } } } },
          },
        });

  const charges: AuditChargeInput[] = overpaidCharges.map((charge) => ({
    id: charge.id,
    doorNo: charge.apartment.doorNo,
    label: `${charge.apartment.block.name}/${charge.apartment.doorNo} ${charge.periodMonth}/${charge.periodYear} ${charge.chargeType.name}`,
    amount: fromCents(toCents(charge.amount)),
    paidAmount: fromCents(paidCentsByChargeId.get(charge.id) ?? 0),
  }));

  const paymentInputs: AuditPaymentInput[] = payments.map((payment) => ({
    id: payment.id,
    paidAt: payment.paidAt,
    totalAmount: fromCents(toCents(payment.totalAmount)),
    note: payment.note,
    linkedDoorNos: payment.itemLinks.map((item) => item.charge.apartment.doorNo),
  }));

  return auditPayments({ payments: paymentInputs, charges, doorNoSet, windowDays });
}

export function createAdminPaymentAuditRoutes(): Router {
  const router = Router();

  router.get("/payment-audit", async (req, res) => {
    const parsed = z
      .object({ days: z.coerce.number().int().min(1).max(365).optional() })
      .safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
    }

    const report = await loadPaymentAuditReport(parsed.data.days ?? DEFAULT_AUDIT_WINDOW_DAYS);
    return res.json(report);
  });

  return router;
}

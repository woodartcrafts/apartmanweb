import { PaymentMethod } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

type PaymentMethodRoutesDeps = {
  ensurePaymentMethodDefinitions: () => Promise<unknown>;
};

export function createAdminPaymentMethodRoutes(deps: PaymentMethodRoutesDeps): Router {
  const router = Router();

  router.get("/payment-methods", async (req, res) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(5000).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    });
    const queryParsed = querySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: queryParsed.error.issues });
    }

    const limit = queryParsed.data.limit ?? 1000;
    const offset = queryParsed.data.offset ?? 0;

    await deps.ensurePaymentMethodDefinitions();

    const methods = await prisma.paymentMethodDefinition.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: limit,
      skip: offset,
    });

    return res.json(methods);
  });

  router.post("/payment-methods", async (req, res) => {
    const schema = z.object({
      code: z.nativeEnum(PaymentMethod),
      name: z.string().min(2).max(120),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    try {
      const created = await prisma.paymentMethodDefinition.create({
        data: {
          code: parsed.data.code,
          name: parsed.data.name.trim(),
          isActive: parsed.data.isActive ?? true,
        },
      });

      return res.status(201).json(created);
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Payment method already exists" });
      }

      throw err;
    }
  });

  router.put("/payment-methods/:paymentMethodId", async (req, res) => {
    const { paymentMethodId } = req.params;
    const schema = z.object({
      code: z.nativeEnum(PaymentMethod),
      name: z.string().min(2).max(120),
      isActive: z.boolean(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    try {
      const updated = await prisma.paymentMethodDefinition.update({
        where: { id: paymentMethodId },
        data: {
          code: parsed.data.code,
          name: parsed.data.name.trim(),
          isActive: parsed.data.isActive,
        },
      });

      return res.json(updated);
    } catch (err) {
      if (typeof err === "object" && err && "code" in err) {
        const code = (err as { code?: string }).code;
        if (code === "P2025") {
          return res.status(404).json({ message: "Payment method not found" });
        }
        if (code === "P2002") {
          return res.status(409).json({ message: "Payment method already exists" });
        }
      }

      throw err;
    }
  });

  router.delete("/payment-methods/:paymentMethodId", async (req, res) => {
    const { paymentMethodId } = req.params;

    const existing = await prisma.paymentMethodDefinition.findUnique({ where: { id: paymentMethodId } });
    if (!existing) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    const usedCount = await prisma.payment.count({ where: { method: existing.code } });
    if (usedCount > 0) {
      return res.status(409).json({ message: "Payment method is used by existing payments", usedCount });
    }

    await prisma.paymentMethodDefinition.delete({ where: { id: paymentMethodId } });
    return res.status(204).send();
  });

  return router;
}

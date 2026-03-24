import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const definitionRoutes = Router();

definitionRoutes.get("/charge-types", async (req, res) => {
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

  const types = await prisma.chargeTypeDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json(types);
});

definitionRoutes.post("/charge-types", async (req, res) => {
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    payerTarget: z.enum(["OWNER", "TENANT"]).optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const created = await prisma.chargeTypeDefinition.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
        payerTarget: parsed.data.payerTarget ?? "OWNER",
        isActive: parsed.data.isActive ?? true,
      } as any,
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Charge type code already exists" });
    }

    throw err;
  }
});

definitionRoutes.put("/charge-types/:chargeTypeId", async (req, res) => {
  const { chargeTypeId } = req.params;
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    payerTarget: z.enum(["OWNER", "TENANT"]),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const updated = await prisma.chargeTypeDefinition.update({
      where: { id: chargeTypeId },
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
        payerTarget: parsed.data.payerTarget,
        isActive: parsed.data.isActive,
      } as any,
    });

    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Charge type not found" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Charge type code already exists" });
      }
    }

    throw err;
  }
});

definitionRoutes.delete("/charge-types/:chargeTypeId", async (req, res) => {
  const { chargeTypeId } = req.params;

  const usedCount = await prisma.charge.count({ where: { chargeTypeId } });
  if (usedCount > 0) {
    return res.status(409).json({ message: "Charge type is used by existing charges", usedCount });
  }

  try {
    await prisma.chargeTypeDefinition.delete({ where: { id: chargeTypeId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Charge type not found" });
    }

    throw err;
  }
});

definitionRoutes.get("/expense-items", async (req, res) => {
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

  const items = await prisma.expenseItemDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json(items);
});

definitionRoutes.post("/expense-items", async (req, res) => {
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const created = await prisma.expenseItemDefinition.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Expense item code already exists" });
    }

    throw err;
  }
});

definitionRoutes.put("/expense-items/:expenseItemId", async (req, res) => {
  const { expenseItemId } = req.params;
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const updated = await prisma.expenseItemDefinition.update({
      where: { id: expenseItemId },
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive,
      },
    });

    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Expense item not found" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Expense item code already exists" });
      }
    }

    throw err;
  }
});

definitionRoutes.delete("/expense-items/:expenseItemId", async (req, res) => {
  const { expenseItemId } = req.params;

  try {
    await prisma.expenseItemDefinition.delete({ where: { id: expenseItemId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Expense item not found" });
    }

    throw err;
  }
});

export default definitionRoutes;

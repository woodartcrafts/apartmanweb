import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const descriptionRuleRoutes = Router();

function toAsciiLower(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeKeywordForMatch(value: string): string {
  return toAsciiLower(value)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

descriptionRuleRoutes.get("/description-door-rules", async (req, res) => {
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

  const rules = await prisma.descriptionDoorNoRule.findMany({
    orderBy: [{ isActive: "desc" }, { keyword: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json(rules);
});

descriptionRuleRoutes.post("/description-door-rules", async (req, res) => {
  const schema = z.object({
    keyword: z.string().min(2).max(200),
    doorNo: z.string().min(1).max(20),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const normalizedKeyword = normalizeKeywordForMatch(parsed.data.keyword);
  if (!normalizedKeyword) {
    return res.status(400).json({ message: "Keyword cannot be empty" });
  }

  const requestedDoorNo = parsed.data.doorNo.trim();
  const normalizedDoorNo = String(Number(requestedDoorNo));
  const apartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { doorNo: requestedDoorNo },
        ...(!Number.isNaN(Number(requestedDoorNo)) ? [{ doorNo: normalizedDoorNo }] : []),
      ],
    },
    orderBy: [{ block: { name: "asc" } }],
  });

  if (!apartment) {
    return res.status(400).json({ message: "Door number not found in apartments" });
  }

  try {
    const created = await prisma.descriptionDoorNoRule.create({
      data: {
        keyword: parsed.data.keyword.trim(),
        normalizedKeyword,
        doorNo: apartment.doorNo,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Keyword already exists" });
    }

    throw err;
  }
});

descriptionRuleRoutes.put("/description-door-rules/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const schema = z.object({
    keyword: z.string().min(2).max(200),
    doorNo: z.string().min(1).max(20),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const normalizedKeyword = normalizeKeywordForMatch(parsed.data.keyword);
  if (!normalizedKeyword) {
    return res.status(400).json({ message: "Keyword cannot be empty" });
  }

  const requestedDoorNo = parsed.data.doorNo.trim();
  const normalizedDoorNo = String(Number(requestedDoorNo));
  const apartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { doorNo: requestedDoorNo },
        ...(!Number.isNaN(Number(requestedDoorNo)) ? [{ doorNo: normalizedDoorNo }] : []),
      ],
    },
    orderBy: [{ block: { name: "asc" } }],
  });

  if (!apartment) {
    return res.status(400).json({ message: "Door number not found in apartments" });
  }

  try {
    const updated = await prisma.descriptionDoorNoRule.update({
      where: { id: ruleId },
      data: {
        keyword: parsed.data.keyword.trim(),
        normalizedKeyword,
        doorNo: apartment.doorNo,
        isActive: parsed.data.isActive,
      },
    });

    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Rule not found" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Keyword already exists" });
      }
    }

    throw err;
  }
});

descriptionRuleRoutes.delete("/description-door-rules/:ruleId", async (req, res) => {
  const { ruleId } = req.params;

  try {
    await prisma.descriptionDoorNoRule.delete({ where: { id: ruleId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Rule not found" });
    }

    throw err;
  }
});

descriptionRuleRoutes.get("/description-expense-rules", async (req, res) => {
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

  const rules = await prisma.descriptionExpenseRule.findMany({
    include: {
      expenseItem: {
        select: { id: true, code: true, name: true, isActive: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { keyword: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json(
    rules.map((rule) => ({
      id: rule.id,
      keyword: rule.keyword,
      normalizedKeyword: rule.normalizedKeyword,
      expenseItemId: rule.expenseItemId,
      expenseItemCode: rule.expenseItem.code,
      expenseItemName: rule.expenseItem.name,
      expenseItemIsActive: rule.expenseItem.isActive,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }))
  );
});

descriptionRuleRoutes.post("/description-expense-rules", async (req, res) => {
  const schema = z.object({
    keyword: z.string().min(2).max(200),
    expenseItemId: z.string().min(1),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const normalizedKeyword = normalizeKeywordForMatch(parsed.data.keyword);
  if (!normalizedKeyword) {
    return res.status(400).json({ message: "Keyword cannot be empty" });
  }

  const expenseItem = await prisma.expenseItemDefinition.findUnique({
    where: { id: parsed.data.expenseItemId },
    select: { id: true },
  });
  if (!expenseItem) {
    return res.status(400).json({ message: "Expense item not found" });
  }

  try {
    const created = await prisma.descriptionExpenseRule.create({
      data: {
        keyword: parsed.data.keyword.trim(),
        normalizedKeyword,
        expenseItemId: parsed.data.expenseItemId,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Keyword already exists" });
    }

    throw err;
  }
});

descriptionRuleRoutes.put("/description-expense-rules/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const schema = z.object({
    keyword: z.string().min(2).max(200),
    expenseItemId: z.string().min(1),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const normalizedKeyword = normalizeKeywordForMatch(parsed.data.keyword);
  if (!normalizedKeyword) {
    return res.status(400).json({ message: "Keyword cannot be empty" });
  }

  const expenseItem = await prisma.expenseItemDefinition.findUnique({
    where: { id: parsed.data.expenseItemId },
    select: { id: true },
  });
  if (!expenseItem) {
    return res.status(400).json({ message: "Expense item not found" });
  }

  try {
    const updated = await prisma.descriptionExpenseRule.update({
      where: { id: ruleId },
      data: {
        keyword: parsed.data.keyword.trim(),
        normalizedKeyword,
        expenseItemId: parsed.data.expenseItemId,
        isActive: parsed.data.isActive,
      },
    });

    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Rule not found" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Keyword already exists" });
      }
    }

    throw err;
  }
});

descriptionRuleRoutes.delete("/description-expense-rules/:ruleId", async (req, res) => {
  const { ruleId } = req.params;

  try {
    await prisma.descriptionExpenseRule.delete({ where: { id: ruleId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Rule not found" });
    }

    throw err;
  }
});

export default descriptionRuleRoutes;

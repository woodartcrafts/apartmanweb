import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const blockRoutes = Router();

blockRoutes.get("/blocks", async (req, res) => {
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

  const blocks = await prisma.block.findMany({
    include: {
      _count: {
        select: { apartments: true },
      },
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json(
    blocks.map((block) => ({
      id: block.id,
      name: block.name,
      apartmentCount: block._count.apartments,
    }))
  );
});

blockRoutes.post("/blocks", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return res.status(400).json({ message: "Block name cannot be empty" });
  }

  try {
    const created = await prisma.block.create({ data: { name } });
    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Block name already exists" });
    }

    throw err;
  }
});

blockRoutes.put("/blocks/:blockId", async (req, res) => {
  const { blockId } = req.params;
  const schema = z.object({
    name: z.string().min(1).max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return res.status(400).json({ message: "Block name cannot be empty" });
  }

  try {
    const updated = await prisma.block.update({
      where: { id: blockId },
      data: { name },
    });

    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Block not found" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Block name already exists" });
      }
    }

    throw err;
  }
});

blockRoutes.delete("/blocks/:blockId", async (req, res) => {
  const { blockId } = req.params;

  const existing = await prisma.block.findUnique({ where: { id: blockId } });
  if (!existing) {
    return res.status(404).json({ message: "Block not found" });
  }

  const apartmentCount = await prisma.apartment.count({ where: { blockId } });
  if (apartmentCount > 0) {
    return res.status(409).json({
      message: "Block has apartments and cannot be deleted",
      apartmentCount,
    });
  }

  await prisma.block.delete({ where: { id: blockId } });
  return res.status(204).send();
});

export default blockRoutes;

import { ApartmentType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

type ApartmentDefinitionRouteDeps = {
  ensureApartmentClassDefinitions: () => Promise<unknown>;
  ensureApartmentDutyDefinitions: () => Promise<unknown>;
  ensureApartmentTypeDefinitions: () => Promise<unknown>;
};

function isApartmentTypeCode(value: string): value is ApartmentType {
  return value === "BUYUK" || value === "KUCUK";
}

export function createAdminApartmentDefinitionRoutes(deps: ApartmentDefinitionRouteDeps): Router {
  const apartmentDefinitionRoutes = Router();

  apartmentDefinitionRoutes.get("/apartment-duties", async (_req, res) => {
    await deps.ensureApartmentDutyDefinitions();
    const duties = await prisma.apartmentDutyDefinition.findMany({
      include: {
        _count: {
          select: { apartments: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return res.json(
      duties.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        isActive: item.isActive,
        apartmentCount: item._count.apartments,
      }))
    );
  });

  apartmentDefinitionRoutes.post("/apartment-duties", async (req, res) => {
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
      const created = await prisma.apartmentDutyDefinition.create({
        data: {
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          isActive: parsed.data.isActive ?? true,
        },
      });

      return res.status(201).json(created);
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Gorev kodu zaten var" });
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.put("/apartment-duties/:apartmentDutyId", async (req, res) => {
    const { apartmentDutyId } = req.params;
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
      const updated = await prisma.apartmentDutyDefinition.update({
        where: { id: apartmentDutyId },
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
          return res.status(404).json({ message: "Gorev bulunamadi" });
        }
        if (code === "P2002") {
          return res.status(409).json({ message: "Gorev kodu zaten var" });
        }
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.delete("/apartment-duties/:apartmentDutyId", async (req, res) => {
    const { apartmentDutyId } = req.params;

    const existing = await prisma.apartmentDutyDefinition.findUnique({ where: { id: apartmentDutyId } });
    if (!existing) {
      return res.status(404).json({ message: "Gorev bulunamadi" });
    }

    const apartmentCount = await prisma.apartment.count({ where: { apartmentDutyId } });
    if (apartmentCount > 0) {
      return res.status(409).json({
        message: "Goreve bagli daireler oldugu icin silinemez",
        apartmentCount,
      });
    }

    await prisma.apartmentDutyDefinition.delete({ where: { id: apartmentDutyId } });
    return res.status(204).send();
  });

  apartmentDefinitionRoutes.get("/apartment-classes", async (_req, res) => {
    await deps.ensureApartmentClassDefinitions();
    const classes = await prisma.apartmentClassDefinition.findMany({
      include: {
        _count: {
          select: { apartments: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return res.json(
      classes.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        isActive: item.isActive,
        apartmentCount: item._count.apartments,
      }))
    );
  });

  apartmentDefinitionRoutes.post("/apartment-classes", async (req, res) => {
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
      const created = await prisma.apartmentClassDefinition.create({
        data: {
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          isActive: parsed.data.isActive ?? true,
        },
      });

      return res.status(201).json(created);
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Daire sinifi kodu zaten var" });
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.put("/apartment-classes/:apartmentClassId", async (req, res) => {
    const { apartmentClassId } = req.params;
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
      const updated = await prisma.apartmentClassDefinition.update({
        where: { id: apartmentClassId },
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
          return res.status(404).json({ message: "Daire sinifi bulunamadi" });
        }
        if (code === "P2002") {
          return res.status(409).json({ message: "Daire sinifi kodu zaten var" });
        }
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.delete("/apartment-classes/:apartmentClassId", async (req, res) => {
    const { apartmentClassId } = req.params;

    const existing = await prisma.apartmentClassDefinition.findUnique({ where: { id: apartmentClassId } });
    if (!existing) {
      return res.status(404).json({ message: "Daire sinifi bulunamadi" });
    }

    const apartmentCount = await prisma.apartment.count({ where: { apartmentClassId } });
    if (apartmentCount > 0) {
      return res.status(409).json({
        message: "Sinifa bagli daireler oldugu icin silinemez",
        apartmentCount,
      });
    }

    await prisma.apartmentClassDefinition.delete({ where: { id: apartmentClassId } });
    return res.status(204).send();
  });

  apartmentDefinitionRoutes.get("/apartment-types", async (_req, res) => {
    await deps.ensureApartmentTypeDefinitions();

    const [types, groupedCounts] = await Promise.all([
      prisma.apartmentTypeDefinition.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.apartment.groupBy({
        by: ["type"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const counts = new Map<ApartmentType, number>(groupedCounts.map((row) => [row.type, row._count._all]));

    return res.json(
      types.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        isActive: item.isActive,
        apartmentCount: isApartmentTypeCode(item.code) ? counts.get(item.code) ?? 0 : 0,
      }))
    );
  });

  apartmentDefinitionRoutes.post("/apartment-types", async (req, res) => {
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
      const created = await prisma.apartmentTypeDefinition.create({
        data: {
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          isActive: parsed.data.isActive ?? true,
        },
      });

      return res.status(201).json(created);
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Daire tipi kodu zaten var" });
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.put("/apartment-types/:apartmentTypeId", async (req, res) => {
    const { apartmentTypeId } = req.params;
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
      const updated = await prisma.apartmentTypeDefinition.update({
        where: { id: apartmentTypeId },
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
          return res.status(404).json({ message: "Daire tipi bulunamadi" });
        }
        if (code === "P2002") {
          return res.status(409).json({ message: "Daire tipi kodu zaten var" });
        }
      }

      throw err;
    }
  });

  apartmentDefinitionRoutes.delete("/apartment-types/:apartmentTypeId", async (req, res) => {
    const { apartmentTypeId } = req.params;

    const existing = await prisma.apartmentTypeDefinition.findUnique({ where: { id: apartmentTypeId } });
    if (!existing) {
      return res.status(404).json({ message: "Daire tipi bulunamadi" });
    }

    if (isApartmentTypeCode(existing.code)) {
      const apartmentCount = await prisma.apartment.count({ where: { type: existing.code } });
      if (apartmentCount > 0) {
        return res.status(409).json({
          message: "Tipe bagli daireler oldugu icin silinemez",
          apartmentCount,
        });
      }
    }

    await prisma.apartmentTypeDefinition.delete({ where: { id: apartmentTypeId } });
    return res.status(204).send();
  });

  return apartmentDefinitionRoutes;
}

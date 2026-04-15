import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export function createAdminBankRoutes(): Router {
  const router = Router();
router.get("/banks", async (_req, res) => {
  const banks = await prisma.bankDefinition.findMany({
    include: {
      branches: {
        orderBy: [{ name: "asc" }],
      },
      _count: {
        select: {
          branches: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return res.json(
    banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      isActive: bank.isActive,
      branchCount: bank._count.branches,
      branches: bank.branches.map((branch) => ({
        id: branch.id,
        bankId: branch.bankId,
        bankName: bank.name,
        name: branch.name,
        branchCode: branch.branchCode,
        accountName: branch.accountName,
        accountNumber: branch.accountNumber,
        iban: branch.iban,
        phone: branch.phone,
        email: branch.email,
        address: branch.address,
        representativeName: branch.representativeName,
        representativePhone: branch.representativePhone,
        representativeEmail: branch.representativeEmail,
        notes: branch.notes,
        isActive: branch.isActive,
      })),
    }))
  );
});

function optionalBankText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    });
}

router.post("/banks", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const created = await prisma.bankDefinition.create({
      data: {
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Banka adi zaten var" });
    }

    throw err;
  }
});

router.put("/banks/:bankId", async (req, res) => {
  const { bankId } = req.params;
  const schema = z.object({
    name: z.string().min(2).max(120),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  try {
    const updated = await prisma.bankDefinition.update({
      where: { id: bankId },
      data: {
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Banka bulunamadi" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Banka adi zaten var" });
      }
    }
    throw err;
  }
});

router.delete("/banks/:bankId", async (req, res) => {
  const { bankId } = req.params;
  const existing = await prisma.bankDefinition.findUnique({ where: { id: bankId } });
  if (!existing) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  const branchCount = await prisma.bankBranchDefinition.count({ where: { bankId } });
  if (branchCount > 0) {
    return res.status(409).json({ message: "Bankaya bagli subeler oldugu icin silinemez", branchCount });
  }

  await prisma.bankDefinition.delete({ where: { id: bankId } });
  return res.status(204).send();
});

router.post("/banks/branches", async (req, res) => {
  const schema = z.object({
    bankId: z.string().min(1),
    name: z.string().min(2).max(120),
    branchCode: optionalBankText(32),
    accountName: optionalBankText(160),
    accountNumber: optionalBankText(64),
    iban: optionalBankText(64),
    phone: optionalBankText(64),
    email: optionalBankText(255),
    address: optionalBankText(500),
    representativeName: optionalBankText(160),
    representativePhone: optionalBankText(64),
    representativeEmail: optionalBankText(255),
    notes: optionalBankText(1000),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  try {
    const created = await prisma.bankBranchDefinition.create({
      data: {
        bankId: parsed.data.bankId,
        name: parsed.data.name.trim(),
        branchCode: parsed.data.branchCode,
        accountName: parsed.data.accountName,
        accountNumber: parsed.data.accountNumber,
        iban: parsed.data.iban,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        representativeName: parsed.data.representativeName,
        representativePhone: parsed.data.representativePhone,
        representativeEmail: parsed.data.representativeEmail,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return res.status(409).json({ message: "Bu bankada ayni sube adi zaten var" });
    }
    throw err;
  }
});

router.put("/banks/branches/:branchId", async (req, res) => {
  const { branchId } = req.params;
  const schema = z.object({
    bankId: z.string().min(1),
    name: z.string().min(2).max(120),
    branchCode: optionalBankText(32),
    accountName: optionalBankText(160),
    accountNumber: optionalBankText(64),
    iban: optionalBankText(64),
    phone: optionalBankText(64),
    email: optionalBankText(255),
    address: optionalBankText(500),
    representativeName: optionalBankText(160),
    representativePhone: optionalBankText(64),
    representativeEmail: optionalBankText(255),
    notes: optionalBankText(1000),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  try {
    const updated = await prisma.bankBranchDefinition.update({
      where: { id: branchId },
      data: {
        bankId: parsed.data.bankId,
        name: parsed.data.name.trim(),
        branchCode: parsed.data.branchCode,
        accountName: parsed.data.accountName,
        accountNumber: parsed.data.accountNumber,
        iban: parsed.data.iban,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        representativeName: parsed.data.representativeName,
        representativePhone: parsed.data.representativePhone,
        representativeEmail: parsed.data.representativeEmail,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return res.status(404).json({ message: "Sube bulunamadi" });
      }
      if (code === "P2002") {
        return res.status(409).json({ message: "Bu bankada ayni sube adi zaten var" });
      }
    }
    throw err;
  }
});

router.delete("/banks/branches/:branchId", async (req, res) => {
  const { branchId } = req.params;
  const existing = await prisma.bankBranchDefinition.findUnique({ where: { id: branchId } });
  if (!existing) {
    return res.status(404).json({ message: "Sube bulunamadi" });
  }

  await prisma.bankBranchDefinition.delete({ where: { id: branchId } });
  return res.status(204).send();
});

function calculateTermDepositSummary(input: {
  principalAmount: number;
  annualInterestRate: number;
  withholdingTaxRate: number;
  startDate: Date;
  endDate: Date;
}): {
  dayCount: number;
  grossInterest: number;
  withholdingAmount: number;
  netInterest: number;
  netMaturityAmount: number;
} {
  const millisInDay = 1000 * 60 * 60 * 24;
  const dayDiff = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / millisInDay);
  const dayCount = Math.max(1, dayDiff);
  const grossInterest = input.principalAmount * (input.annualInterestRate / 100) * (dayCount / 365);
  const withholdingAmount = grossInterest * (input.withholdingTaxRate / 100);
  const netInterest = grossInterest - withholdingAmount;
  const netMaturityAmount = input.principalAmount + netInterest;

  return {
    dayCount,
    grossInterest: Number(grossInterest.toFixed(2)),
    withholdingAmount: Number(withholdingAmount.toFixed(2)),
    netInterest: Number(netInterest.toFixed(2)),
    netMaturityAmount: Number(netMaturityAmount.toFixed(2)),
  };
}

router.get("/banks/term-deposits", async (_req, res) => {
  const rows = await prisma.bankTermDeposit.findMany({
    include: {
      bank: {
        select: { id: true, name: true },
      },
      branch: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
  });

  const payload = rows.map((row) => {
    const principalAmount = Number(row.principalAmount);
    const annualInterestRate = Number(row.annualInterestRate);
    const withholdingTaxRate = Number(row.withholdingTaxRate);
    const summary = calculateTermDepositSummary({
      principalAmount,
      annualInterestRate,
      withholdingTaxRate,
      startDate: row.startDate,
      endDate: row.endDate,
    });

    return {
      id: row.id,
      bankId: row.bankId,
      bankName: row.bank.name,
      branchId: row.branchId,
      branchName: row.branch?.name ?? null,
      principalAmount,
      annualInterestRate,
      withholdingTaxRate,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      notes: row.notes,
      isActive: row.isActive,
      dayCount: summary.dayCount,
      grossInterest: summary.grossInterest,
      withholdingAmount: summary.withholdingAmount,
      netInterest: summary.netInterest,
      netMaturityAmount: summary.netMaturityAmount,
    };
  });

  return res.json(payload);
});

router.post("/banks/term-deposits", async (req, res) => {
  const schema = z.object({
    bankId: z.string().min(1),
    branchId: z
      .string()
      .optional()
      .transform((value) => {
        if (typeof value !== "string") {
          return undefined;
        }
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }),
    principalAmount: z.coerce.number().positive(),
    annualInterestRate: z.coerce.number().min(0).max(500),
    withholdingTaxRate: z.coerce.number().min(0).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    notes: optionalBankText(1000),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ message: "Bitis tarihi baslangic tarihinden once olamaz" });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  if (parsed.data.branchId) {
    const branch = await prisma.bankBranchDefinition.findUnique({
      where: { id: parsed.data.branchId },
      select: { id: true, bankId: true },
    });
    if (!branch || branch.bankId !== parsed.data.bankId) {
      return res.status(400).json({ message: "Secilen sube bankaya ait degil" });
    }
  }

  const created = await prisma.bankTermDeposit.create({
    data: {
      bankId: parsed.data.bankId,
      branchId: parsed.data.branchId,
      principalAmount: parsed.data.principalAmount,
      annualInterestRate: parsed.data.annualInterestRate,
      withholdingTaxRate: parsed.data.withholdingTaxRate,
      startDate,
      endDate,
      notes: parsed.data.notes,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return res.status(201).json(created);
});

router.put("/banks/term-deposits/:depositId", async (req, res) => {
  const { depositId } = req.params;
  const schema = z.object({
    bankId: z.string().min(1),
    branchId: z
      .string()
      .optional()
      .transform((value) => {
        if (typeof value !== "string") {
          return undefined;
        }
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }),
    principalAmount: z.coerce.number().positive(),
    annualInterestRate: z.coerce.number().min(0).max(500),
    withholdingTaxRate: z.coerce.number().min(0).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    notes: optionalBankText(1000),
    isActive: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ message: "Bitis tarihi baslangic tarihinden once olamaz" });
  }

  const bank = await prisma.bankDefinition.findUnique({ where: { id: parsed.data.bankId }, select: { id: true } });
  if (!bank) {
    return res.status(404).json({ message: "Banka bulunamadi" });
  }

  if (parsed.data.branchId) {
    const branch = await prisma.bankBranchDefinition.findUnique({
      where: { id: parsed.data.branchId },
      select: { id: true, bankId: true },
    });
    if (!branch || branch.bankId !== parsed.data.bankId) {
      return res.status(400).json({ message: "Secilen sube bankaya ait degil" });
    }
  }

  try {
    const updated = await prisma.bankTermDeposit.update({
      where: { id: depositId },
      data: {
        bankId: parsed.data.bankId,
        branchId: parsed.data.branchId,
        principalAmount: parsed.data.principalAmount,
        annualInterestRate: parsed.data.annualInterestRate,
        withholdingTaxRate: parsed.data.withholdingTaxRate,
        startDate,
        endDate,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });
    return res.json(updated);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Vadeli mevduat kaydi bulunamadi" });
    }
    throw err;
  }
});

router.delete("/banks/term-deposits/:depositId", async (req, res) => {
  const { depositId } = req.params;
  try {
    await prisma.bankTermDeposit.delete({ where: { id: depositId } });
    return res.status(204).send();
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2025") {
      return res.status(404).json({ message: "Vadeli mevduat kaydi bulunamadi" });
    }
    throw err;
  }
});
  return router;
}

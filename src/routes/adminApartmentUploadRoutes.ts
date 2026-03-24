import { ApartmentType, OccupancyType } from "@prisma/client";
import { Router } from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db";

type ApartmentUploadRoutesDeps = {
  ensureApartmentClassDefinitions: () => Promise<unknown>;
  ensureApartmentDutyDefinitions: () => Promise<unknown>;
};

const LEGACY_XLS_UNSUPPORTED_MESSAGE =
  "Bu dosya eski Excel (.xls) formatinda. Lutfen dosyayi .xlsx olarak kaydedip tekrar yukleyin.";

type ApartmentUploadRow = {
  blockName: string;
  doorNo: string;
  type?: ApartmentType;
  apartmentClassCode?: string;
  apartmentDutyCode?: string;
  hasAidat?: boolean;
  hasDogalgaz?: boolean;
  hasOtherDues?: boolean;
  hasIncome?: boolean;
  hasExpenses?: boolean;
  ownerFullName?: string;
  occupancyType?: OccupancyType;
  email1?: string;
  email2?: string;
  email3?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  landlordFullName?: string;
  landlordPhone?: string;
  landlordEmail?: string;
};

const apartmentUploadTemplateHeaders = [
  "blockName",
  "doorNo",
  "type",
  "apartmentClassCode",
  "apartmentDutyCode",
  "hasAidat",
  "hasDogalgaz",
  "hasOtherDues",
  "hasIncome",
  "hasExpenses",
  "ownerFullName",
  "occupancyType",
  "email1",
  "email2",
  "email3",
  "phone1",
  "phone2",
  "phone3",
  "landlordFullName",
  "landlordPhone",
  "landlordEmail",
] as const;

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

function normalizeHeader(value: string): string {
  return toAsciiLower(value).replace(/[^a-z0-9]+/g, "");
}

function parseApartmentType(raw: unknown): ApartmentType | undefined {
  if (raw == null) {
    return undefined;
  }

  const text = toAsciiLower(String(raw)).trim();
  if (!text) {
    return undefined;
  }

  if (text.includes("kucuk") || text === "k") {
    return ApartmentType.KUCUK;
  }
  if (text.includes("buyuk") || text === "b") {
    return ApartmentType.BUYUK;
  }
  if (text === "kucuk daire" || text === "small") {
    return ApartmentType.KUCUK;
  }
  if (text === "buyuk daire" || text === "large") {
    return ApartmentType.BUYUK;
  }

  return undefined;
}

function parseOccupancyType(raw: unknown): OccupancyType | undefined {
  if (raw == null) {
    return undefined;
  }

  const text = toAsciiLower(String(raw)).trim();
  if (!text) {
    return undefined;
  }

  if (text.includes("kiraci") || text.includes("tenant") || text === "k") {
    return OccupancyType.TENANT;
  }
  if (text.includes("owner") || text.includes("malik") || text.includes("ev sahibi") || text === "m") {
    return OccupancyType.OWNER;
  }

  return undefined;
}

function sanitizeOptionalEmail(raw: unknown): string | undefined {
  const value = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
  if (!value) {
    return undefined;
  }
  return z.string().email().safeParse(value).success ? value : undefined;
}

function sanitizeOptionalText(raw: unknown): string | undefined {
  const value = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
  return value || undefined;
}

function parseOptionalBoolean(raw: unknown): boolean | undefined {
  if (raw == null) {
    return undefined;
  }

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "number") {
    if (raw === 1) {
      return true;
    }
    if (raw === 0) {
      return false;
    }
    return undefined;
  }

  const text = toAsciiLower(String(raw)).trim();
  if (!text) {
    return undefined;
  }

  if (["1", "true", "evet", "var", "yes", "y", "x"].includes(text)) {
    return true;
  }

  if (["0", "false", "hayir", "yok", "no", "n"].includes(text)) {
    return false;
  }

  return undefined;
}

function parseDefinitionCode(raw: unknown): string | undefined {
  const value = sanitizeOptionalText(raw);
  if (!value) {
    return undefined;
  }

  return toAsciiLower(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function buildDefinitionLookup(code: string, name: string): string[] {
  const codeKey = parseDefinitionCode(code);
  const nameKey = parseDefinitionCode(name);
  return [codeKey, nameKey].filter((x): x is string => Boolean(x));
}

function normalizeApartmentUploadRow(row: Record<string, unknown>): ApartmentUploadRow | null {
  const mapped = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeHeader(k), v]));

  const blockNameRaw =
    mapped.blockname ?? mapped.block ?? mapped.blok ?? mapped.blokadi ?? mapped.blokad ?? mapped.blokadiad;
  const doorNoRaw = mapped.daireno ?? mapped.daire ?? mapped.doorno ?? mapped.kapino ?? mapped.no;

  const blockName = sanitizeOptionalText(blockNameRaw) ?? "B Blok";
  const doorNo = sanitizeOptionalText(doorNoRaw) ?? "";
  if (!doorNo) {
    return null;
  }

  return {
    blockName,
    doorNo,
    type: parseApartmentType(mapped.dairetipi ?? mapped.type),
    apartmentClassCode: parseDefinitionCode(
      mapped.apartmentclasscode ?? mapped.apartmentsinifkodu ?? mapped.dairesinifi ?? mapped.classcode
    ),
    apartmentDutyCode: parseDefinitionCode(
      mapped.apartmentdutycode ?? mapped.apartmentduty ?? mapped.dairegorevkodu ?? mapped.gorev
    ),
    hasAidat: parseOptionalBoolean(mapped.hasaidat ?? mapped.aidatvar ?? mapped.aidat),
    hasDogalgaz: parseOptionalBoolean(mapped.hasdogalgaz ?? mapped.dogalgazvar ?? mapped.dogalgaz),
    hasOtherDues: parseOptionalBoolean(
      mapped.hasotherdues ?? mapped.digerborcvar ?? mapped.digerborc ?? mapped.digeraidatvar
    ),
    hasIncome: parseOptionalBoolean(mapped.hasincome ?? mapped.gelirvar ?? mapped.gelir),
    hasExpenses: parseOptionalBoolean(mapped.hasexpenses ?? mapped.gidervar ?? mapped.gider),
    ownerFullName: sanitizeOptionalText(mapped.ownerfullname ?? mapped.malikadsoyad ?? mapped.adsoyad ?? mapped.malik),
    occupancyType: parseOccupancyType(mapped.occupancytype ?? mapped.oturumdurumu ?? mapped.kiracimalikdurumu),
    email1: sanitizeOptionalEmail(mapped.email1 ?? mapped.eposta1),
    email2: sanitizeOptionalEmail(mapped.email2 ?? mapped.eposta2),
    email3: sanitizeOptionalEmail(mapped.email3 ?? mapped.eposta3),
    phone1: sanitizeOptionalText(mapped.phone1 ?? mapped.telefon1),
    phone2: sanitizeOptionalText(mapped.phone2 ?? mapped.telefon2),
    phone3: sanitizeOptionalText(mapped.phone3 ?? mapped.telefon3),
    landlordFullName: sanitizeOptionalText(
      mapped.landlordfullname ?? mapped.evsahibiadsoyad ?? mapped.dairesahibiadsoyad
    ),
    landlordPhone: sanitizeOptionalText(mapped.landlordphone ?? mapped.evsahibitelefon ?? mapped.dairesahibitelefon),
    landlordEmail: sanitizeOptionalEmail(mapped.landlordemail ?? mapped.evsahibieposta ?? mapped.dairesahibieposta),
  };
}

function getExcelCellValue(value: ExcelJS.CellValue | undefined): unknown {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date || typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? "")).join(" ");
  }

  if (typeof value === "object") {
    if ("result" in value) {
      return getExcelCellValue(value.result);
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
  }

  return String(value);
}

async function parseExcelRowsAsObjects(fileBuffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const colCount = Math.max(1, worksheet.columnCount);
  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: colCount }, (_, idx) => {
    const raw = getExcelCellValue(headerRow.getCell(idx + 1).value);
    const text = String(raw ?? "").trim();
    return text || `__EMPTY_${idx + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let rowNo = 2; rowNo <= worksheet.rowCount; rowNo += 1) {
    const row = worksheet.getRow(rowNo);
    const record: Record<string, unknown> = {};
    let hasAnyValue = false;

    for (let col = 1; col <= colCount; col += 1) {
      const cellValue = getExcelCellValue(row.getCell(col).value);
      record[headers[col - 1]] = cellValue;
      if (String(cellValue ?? "").trim() !== "") {
        hasAnyValue = true;
      }
    }

    if (hasAnyValue) {
      rows.push(record);
    }
  }

  return rows;
}

async function parseApartmentUploadRows(file: Express.Multer.File): Promise<ApartmentUploadRow[]> {
  const lowerName = file.originalname.toLowerCase();
  if (!(lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls"))) {
    return [];
  }

  const rows = await parseExcelRowsAsObjects(file.buffer);

  return rows
    .map((row) => normalizeApartmentUploadRow(row))
    .filter((row): row is ApartmentUploadRow => row !== null);
}

export function createAdminApartmentUploadRoutes(deps: ApartmentUploadRoutesDeps): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  router.get("/apartments/upload-template", async (_req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Apartments");
    worksheet.addRow(apartmentUploadTemplateHeaders as unknown as string[]);

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="daire-upload-sablonu.xlsx"');
    return res.send(buffer);
  });

  router.post("/apartments/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    if (req.file.originalname.toLowerCase().endsWith(".xls")) {
      return res.status(400).json({ message: LEGACY_XLS_UNSUPPORTED_MESSAGE });
    }

    const rows = await parseApartmentUploadRows(req.file);
    if (rows.length === 0) {
      return res.status(400).json({ message: "No valid apartment rows found in Excel" });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    await deps.ensureApartmentClassDefinitions();
    await deps.ensureApartmentDutyDefinitions();
    const apartmentClasses = await prisma.apartmentClassDefinition.findMany({
      select: { id: true, code: true, name: true },
    });
    const apartmentClassMap = new Map<string, string>();
    for (const item of apartmentClasses) {
      for (const key of buildDefinitionLookup(item.code, item.name)) {
        apartmentClassMap.set(key, item.id);
      }
    }

    const apartmentDuties = await prisma.apartmentDutyDefinition.findMany({
      select: { id: true, code: true, name: true },
    });
    const apartmentDutyMap = new Map<string, string>();
    for (const item of apartmentDuties) {
      for (const key of buildDefinitionLookup(item.code, item.name)) {
        apartmentDutyMap.set(key, item.id);
      }
    }

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const rowNo = idx + 2;

      try {
        const block = await prisma.block.upsert({
          where: { name: row.blockName },
          update: {},
          create: { name: row.blockName },
        });

        const existing = await prisma.apartment.findFirst({
          where: {
            blockId: block.id,
            doorNo: row.doorNo,
          },
        });

        const fallbackClassCode = parseDefinitionCode(row.type ?? ApartmentType.BUYUK);
        const nextApartmentClassId = row.apartmentClassCode
          ? apartmentClassMap.get(row.apartmentClassCode)
          : fallbackClassCode
            ? apartmentClassMap.get(fallbackClassCode)
            : undefined;
        const nextApartmentDutyId = row.apartmentDutyCode ? apartmentDutyMap.get(row.apartmentDutyCode) : undefined;

        if (row.apartmentClassCode && !nextApartmentClassId) {
          throw new Error(`Tanimsiz apartmentClassCode: ${row.apartmentClassCode}`);
        }
        if (row.apartmentDutyCode && !nextApartmentDutyId) {
          throw new Error(`Tanimsiz apartmentDutyCode: ${row.apartmentDutyCode}`);
        }

        if (existing) {
          await prisma.apartment.update({
            where: { id: existing.id },
            data: {
              type: row.type ?? existing.type,
              apartmentClassId: nextApartmentClassId ?? existing.apartmentClassId,
              apartmentDutyId: nextApartmentDutyId ?? existing.apartmentDutyId,
              hasAidat: row.hasAidat ?? existing.hasAidat,
              hasDogalgaz: row.hasDogalgaz ?? existing.hasDogalgaz,
              hasOtherDues: row.hasOtherDues ?? existing.hasOtherDues,
              hasIncome: row.hasIncome ?? existing.hasIncome,
              hasExpenses: row.hasExpenses ?? existing.hasExpenses,
              ownerFullName: row.ownerFullName ?? existing.ownerFullName,
              occupancyType: row.occupancyType ?? existing.occupancyType,
              email1: row.email1 ?? existing.email1,
              email2: row.email2 ?? existing.email2,
              email3: row.email3 ?? existing.email3,
              phone1: row.phone1 ?? existing.phone1,
              phone2: row.phone2 ?? existing.phone2,
              phone3: row.phone3 ?? existing.phone3,
              landlordFullName: row.landlordFullName ?? existing.landlordFullName,
              landlordPhone: row.landlordPhone ?? existing.landlordPhone,
              landlordEmail: row.landlordEmail ?? existing.landlordEmail,
            },
          });
          updatedCount += 1;
        } else {
          await prisma.apartment.create({
            data: {
              apartmentClassId: nextApartmentClassId ?? null,
              apartmentDutyId: nextApartmentDutyId ?? null,
              blockId: block.id,
              doorNo: row.doorNo,
              type: row.type ?? ApartmentType.BUYUK,
              hasAidat: row.hasAidat ?? true,
              hasDogalgaz: row.hasDogalgaz ?? true,
              hasOtherDues: row.hasOtherDues ?? true,
              hasIncome: row.hasIncome ?? true,
              hasExpenses: row.hasExpenses ?? true,
              ownerFullName: row.ownerFullName ?? null,
              occupancyType: row.occupancyType ?? OccupancyType.OWNER,
              email1: row.email1 ?? null,
              email2: row.email2 ?? null,
              email3: row.email3 ?? null,
              phone1: row.phone1 ?? null,
              phone2: row.phone2 ?? null,
              phone3: row.phone3 ?? null,
              landlordFullName: row.landlordFullName ?? null,
              landlordPhone: row.landlordPhone ?? null,
              landlordEmail: row.landlordEmail ?? null,
            },
          });
          createdCount += 1;
        }
      } catch (err) {
        skippedCount += 1;
        if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
          errors.push(`Satir ${rowNo}: Ayni blok + daire no zaten var (${row.blockName} / ${row.doorNo})`);
        } else if (err instanceof Error) {
          errors.push(`Satir ${rowNo}: ${err.message}`);
        } else {
          errors.push(`Satir ${rowNo}: Beklenmeyen hata`);
        }
      }
    }

    return res.json({
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors: errors.slice(0, 100),
    });
  });

  return router;
}

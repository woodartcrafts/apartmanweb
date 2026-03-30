import bcrypt from "bcryptjs";
import { ApartmentChangeAction, ApartmentType, OccupancyType, PasswordChangeReason, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

type ApartmentRoutesDeps = {
  ensureApartmentClassDefinitions: () => Promise<unknown>;
  ensureApartmentDutyDefinitions: () => Promise<unknown>;
};

type ApartmentSnapshotInput = {
  id: string;
  block: { name: string };
  doorNo: string;
  m2: number | null;
  type: ApartmentType;
  apartmentClassId: string | null;
  apartmentDutyId: string | null;
  hasAidat: boolean;
  hasDogalgaz: boolean;
  hasOtherDues: boolean;
  hasIncome: boolean;
  hasExpenses: boolean;
  ownerFullName: string | null;
  occupancyType: OccupancyType;
  moveInDate: Date | null;
  email1: string | null;
  email2: string | null;
  email3: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  landlordFullName: string | null;
  landlordPhone: string | null;
  landlordEmail: string | null;
  apartmentClass?: { id: string; code: string; name: string } | null;
  apartmentDuty?: { id: string; code: string; name: string } | null;
};

type ApartmentSnapshot = {
  blockName: string;
  doorNo: string;
  m2: number | null;
  type: ApartmentType;
  apartmentClassId: string | null;
  apartmentClassCode: string | null;
  apartmentClassName: string | null;
  apartmentDutyId: string | null;
  apartmentDutyCode: string | null;
  apartmentDutyName: string | null;
  hasAidat: boolean;
  hasDogalgaz: boolean;
  hasOtherDues: boolean;
  hasIncome: boolean;
  hasExpenses: boolean;
  ownerFullName: string | null;
  occupancyType: OccupancyType;
  moveInDate: string | null;
  email1: string | null;
  email2: string | null;
  email3: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  landlordFullName: string | null;
  landlordPhone: string | null;
  landlordEmail: string | null;
};

function createApartmentSnapshot(apartment: ApartmentSnapshotInput): ApartmentSnapshot {
  return {
    blockName: apartment.block.name,
    doorNo: apartment.doorNo,
    m2: apartment.m2,
    type: apartment.type,
    apartmentClassId: apartment.apartmentClassId,
    apartmentClassCode: apartment.apartmentClass?.code ?? null,
    apartmentClassName: apartment.apartmentClass?.name ?? null,
    apartmentDutyId: apartment.apartmentDutyId,
    apartmentDutyCode: apartment.apartmentDuty?.code ?? null,
    apartmentDutyName: apartment.apartmentDuty?.name ?? null,
    hasAidat: apartment.hasAidat,
    hasDogalgaz: apartment.hasDogalgaz,
    hasOtherDues: apartment.hasOtherDues,
    hasIncome: apartment.hasIncome,
    hasExpenses: apartment.hasExpenses,
    ownerFullName: apartment.ownerFullName,
    occupancyType: apartment.occupancyType,
    moveInDate: apartment.moveInDate ? apartment.moveInDate.toISOString() : null,
    email1: apartment.email1,
    email2: apartment.email2,
    email3: apartment.email3,
    phone1: apartment.phone1,
    phone2: apartment.phone2,
    phone3: apartment.phone3,
    landlordFullName: apartment.landlordFullName,
    landlordPhone: apartment.landlordPhone,
    landlordEmail: apartment.landlordEmail,
  };
}

function getChangedApartmentFields(before: ApartmentSnapshot | null, after: ApartmentSnapshot): string[] {
  if (!before) {
    return Object.keys(after);
  }

  const keys = Object.keys(after) as Array<keyof ApartmentSnapshot>;
  return keys.filter((key) => {
    const left = before[key];
    const right = after[key];
    return JSON.stringify(left) !== JSON.stringify(right);
  });
}

async function insertApartmentChangeLog(input: {
  apartmentId: string;
  changedByUserId?: string | null;
  action: ApartmentChangeAction;
  before: ApartmentSnapshot | null;
  after: ApartmentSnapshot;
  changedFields: string[];
  note?: string;
}): Promise<void> {
  if (input.changedFields.length === 0) {
    return;
  }

  await prisma.apartmentChangeLog.create({
    data: {
      apartmentId: input.apartmentId,
      changedByUserId: input.changedByUserId ?? null,
      action: input.action,
      before: input.before ?? {},
      after: input.after,
      changedFields: input.changedFields,
      note: input.note,
    },
  });
}

function normalizeApartmentText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildDoorNoCandidates(doorNoRaw: string): string[] {
  const direct = doorNoRaw.trim();
  const candidates = new Set<string>([direct]);
  const numeric = Number(direct);
  if (!Number.isNaN(numeric)) {
    candidates.add(String(numeric));
  }
  return [...candidates];
}

async function findDoorNoConflict(doorNoRaw: string, excludeApartmentId?: string) {
  const doorCandidates = buildDoorNoCandidates(doorNoRaw);
  const where = {
    OR: doorCandidates.map((value) => ({ doorNo: value })),
    ...(excludeApartmentId ? { id: { not: excludeApartmentId } } : {}),
  };

  return prisma.apartment.findFirst({
    where,
    include: { block: true },
    orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
  });
}

async function findApartmentDuplicateWarnings(input: {
  apartmentId?: string;
  ownerFullName: string | null;
  occupancyType: OccupancyType;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  email1: string | null;
  email2: string | null;
  email3: string | null;
  landlordFullName: string | null;
  landlordPhone: string | null;
  landlordEmail: string | null;
}): Promise<string[]> {
  const contacts = [
    input.phone1,
    input.phone2,
    input.phone3,
    input.email1,
    input.email2,
    input.email3,
    input.landlordPhone,
    input.landlordEmail,
  ].filter(Boolean) as string[];

  const orFilters = [
    ...(input.ownerFullName ? [{ ownerFullName: input.ownerFullName }] : []),
    ...(input.landlordFullName ? [{ landlordFullName: input.landlordFullName }] : []),
    ...contacts.flatMap((c) => [
      { phone1: c },
      { phone2: c },
      { phone3: c },
      { email1: c },
      { email2: c },
      { email3: c },
      { landlordPhone: c },
      { landlordEmail: c },
    ]),
  ];

  if (orFilters.length === 0) {
    return [];
  }

  const similar = await prisma.apartment.findMany({
    where: {
      ...(input.apartmentId ? { id: { not: input.apartmentId } } : {}),
      OR: orFilters,
    },
    include: { block: true },
    take: 3,
    orderBy: [{ updatedAt: "desc" }],
  });

  if (similar.length === 0) {
    return [];
  }

  return similar.map((apt) => {
    const reasons: string[] = [];
    if (input.ownerFullName && apt.ownerFullName === input.ownerFullName) {
      reasons.push("ayni oturan/malik");
    }
    if (input.landlordFullName && apt.landlordFullName === input.landlordFullName) {
      reasons.push("ayni daire sahibi");
    }

    const aptContacts = [
      apt.phone1,
      apt.phone2,
      apt.phone3,
      apt.email1,
      apt.email2,
      apt.email3,
      apt.landlordPhone,
      apt.landlordEmail,
    ].filter(Boolean) as string[];

    const hasSameContact = contacts.some((c) => aptContacts.includes(c));
    if (hasSameContact) {
      reasons.push("ayni iletisim");
    }

    if (apt.occupancyType === input.occupancyType) {
      reasons.push("ayni ev durumu");
    }

    const reasonText = reasons.length > 0 ? ` (${reasons.join(", ")})` : "";
    return `Benzer kayit bulundu: ${apt.block.name}/${apt.doorNo}${reasonText}`;
  });
}

const apartmentCreateSchema = z.object({
  blockName: z.string().min(1),
  doorNo: z.string().min(1),
  m2: z.coerce.number().min(0).optional().nullable(),
  type: z.nativeEnum(ApartmentType).optional(),
  apartmentClassId: z.string().optional().nullable(),
  apartmentDutyId: z.string().optional().nullable(),
  hasAidat: z.boolean().optional(),
  hasDogalgaz: z.boolean().optional(),
  hasOtherDues: z.boolean().optional(),
  hasIncome: z.boolean().optional(),
  hasExpenses: z.boolean().optional(),
  ownerFullName: z.string().optional(),
  occupancyType: z.nativeEnum(OccupancyType).optional(),
  moveInDate: z.string().optional().or(z.literal("")),
  email1: z.string().email().optional().or(z.literal("")),
  email2: z.string().email().optional().or(z.literal("")),
  email3: z.string().email().optional().or(z.literal("")),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  landlordFullName: z.string().optional(),
  landlordPhone: z.string().optional(),
  landlordEmail: z.string().email().optional().or(z.literal("")),
});

const apartmentUpdateSchema = z.object({
  blockName: z.string().min(1),
  doorNo: z.string().min(1),
  m2: z.coerce.number().min(0).optional().nullable(),
  type: z.nativeEnum(ApartmentType),
  apartmentClassId: z.string().optional().nullable(),
  apartmentDutyId: z.string().optional().nullable(),
  hasAidat: z.boolean().optional(),
  hasDogalgaz: z.boolean().optional(),
  hasOtherDues: z.boolean().optional(),
  hasIncome: z.boolean().optional(),
  hasExpenses: z.boolean().optional(),
  ownerFullName: z.string().optional(),
  occupancyType: z.nativeEnum(OccupancyType),
  moveInDate: z.string().optional().or(z.literal("")),
  email1: z.string().email().optional().or(z.literal("")),
  email2: z.string().email().optional().or(z.literal("")),
  email3: z.string().email().optional().or(z.literal("")),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  landlordFullName: z.string().optional(),
  landlordPhone: z.string().optional(),
  landlordEmail: z.string().email().optional().or(z.literal("")),
});

const apartmentBulkClassUpdateSchema = z.object({
  apartmentClassId: z.string().optional(),
  targetType: z.nativeEnum(ApartmentType).optional(),
  blockName: z.string().optional(),
  type: z.nativeEnum(ApartmentType).optional(),
  occupancyType: z.nativeEnum(OccupancyType).optional(),
});

const apartmentResidentPasswordSetSchema = z.object({
  userId: z.string().min(1).optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one digit"),
});

export function createAdminApartmentRoutes(deps: ApartmentRoutesDeps): Router {
  const router = Router();

  router.get("/apartments/:apartmentId/change-logs", async (req, res) => {
    const { apartmentId } = req.params;
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(1000).optional(),
    });
    const queryParsed = querySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: queryParsed.error.issues });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true },
    });
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const limit = queryParsed.data.limit ?? 300;
    const rows = await prisma.apartmentChangeLog.findMany({
      where: { apartmentId },
      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ changedAt: "desc" }],
      take: limit,
    });

    return res.json(
      rows.map((row) => ({
        id: row.id,
        apartmentId: row.apartmentId,
        changedAt: row.changedAt,
        changedByUserId: row.changedByUserId,
        changedByName: row.changedBy?.fullName ?? null,
        changedByEmail: row.changedBy?.email ?? null,
        action: row.action,
        note: row.note,
        changedFields: row.changedFields,
        before: row.before,
        after: row.after,
      }))
    );
  });

  router.post("/apartments/bulk-update-class", async (req, res) => {
    const parsed = apartmentBulkClassUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const targetClassId = parsed.data.apartmentClassId?.trim() || "";
    const targetType = parsed.data.targetType;

    if (!targetClassId && !targetType) {
      return res.status(400).json({ message: "En az bir hedef secilmelidir (sinif veya tip)" });
    }

    let classExists: { id: string; code: string; name: string } | null = null;
    if (targetClassId) {
      classExists = await prisma.apartmentClassDefinition.findUnique({
        where: { id: targetClassId },
        select: { id: true, code: true, name: true },
      });
      if (!classExists) {
        return res.status(400).json({ message: "Daire sinifi bulunamadi" });
      }
    }

    const normalizedBlockName = parsed.data.blockName?.trim() || "";
    const where = {
      ...(normalizedBlockName ? { block: { name: normalizedBlockName } } : {}),
      ...(parsed.data.type ? { type: parsed.data.type } : {}),
      ...(parsed.data.occupancyType ? { occupancyType: parsed.data.occupancyType } : {}),
    };

    const alreadySameWhere = {
      ...where,
      ...(targetClassId ? { apartmentClassId: targetClassId } : {}),
      ...(targetType ? { type: targetType } : {}),
    };

    const needsUpdateOr: Array<Record<string, unknown>> = [];
    if (targetClassId) {
      needsUpdateOr.push({ apartmentClassId: { not: targetClassId } });
    }
    if (targetType) {
      needsUpdateOr.push({ type: { not: targetType } });
    }

    const toChangeApartments = await prisma.apartment.findMany({
      where: {
        ...where,
        OR: needsUpdateOr,
      },
      include: {
        block: true,
        apartmentClass: true,
        apartmentDuty: true,
      },
    });

    const [matchedCount, alreadySameCount, updated] = await prisma.$transaction([
      prisma.apartment.count({ where }),
      prisma.apartment.count({ where: alreadySameWhere }),
      prisma.apartment.updateMany({
        where: {
          ...where,
          OR: needsUpdateOr,
        },
        data: {
          ...(targetClassId ? { apartmentClassId: targetClassId } : {}),
          ...(targetType ? { type: targetType } : {}),
        },
      }),
    ]);

    if (toChangeApartments.length > 0) {
      const afterRows = await prisma.apartment.findMany({
        where: { id: { in: toChangeApartments.map((x) => x.id) } },
        include: {
          block: true,
          apartmentClass: true,
          apartmentDuty: true,
        },
      });
      const afterById = new Map(afterRows.map((x) => [x.id, x]));

      await Promise.all(
        toChangeApartments.map(async (beforeRow) => {
          const afterRow = afterById.get(beforeRow.id);
          if (!afterRow) {
            return;
          }
          const beforeSnap = createApartmentSnapshot(beforeRow);
          const afterSnap = createApartmentSnapshot(afterRow);
          const changedFields = getChangedApartmentFields(beforeSnap, afterSnap);
          await insertApartmentChangeLog({
            apartmentId: beforeRow.id,
            changedByUserId: req.user?.userId,
            action: ApartmentChangeAction.BULK_UPDATE_CLASS,
            before: beforeSnap,
            after: afterSnap,
            changedFields,
            note: "Toplu sinif/tip guncellemesi",
          });
        })
      );
    }

    return res.json({
      apartmentClassId: targetClassId || null,
      apartmentClassCode: classExists?.code ?? null,
      apartmentClassName: classExists?.name ?? null,
      apartmentType: targetType ?? null,
      matchedCount,
      updatedCount: updated.count,
      alreadySameCount,
    });
  });

  router.get("/apartments", async (req, res) => {
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

    await deps.ensureApartmentClassDefinitions();
    await deps.ensureApartmentDutyDefinitions();
    const apartments = await prisma.apartment.findMany({
      include: {
        block: true,
        apartmentClass: true,
        apartmentDuty: true,
        users: {
          where: { role: UserRole.RESIDENT },
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            passwordHistoryAsSubject: {
              orderBy: [{ changedAt: "desc" }],
              take: 1,
              include: {
                changedBy: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
      take: limit,
      skip: offset,
    });

    return res.json(
      apartments.map((apartment) => ({
        id: apartment.id,
        blockName: apartment.block.name,
        doorNo: apartment.doorNo,
        m2: apartment.m2,
        type: apartment.type,
        apartmentClassId: apartment.apartmentClassId,
        apartmentClassCode: apartment.apartmentClass?.code ?? null,
        apartmentClassName: apartment.apartmentClass?.name ?? null,
        apartmentDutyId: apartment.apartmentDutyId,
        apartmentDutyCode: apartment.apartmentDuty?.code ?? null,
        apartmentDutyName: apartment.apartmentDuty?.name ?? null,
        hasAidat: apartment.hasAidat,
        hasDogalgaz: apartment.hasDogalgaz,
        hasOtherDues: apartment.hasOtherDues,
        hasIncome: apartment.hasIncome,
        hasExpenses: apartment.hasExpenses,
        ownerFullName: apartment.ownerFullName,
        occupancyType: apartment.occupancyType,
        moveInDate: apartment.moveInDate,
        email1: apartment.email1,
        email2: apartment.email2,
        email3: apartment.email3,
        phone1: apartment.phone1,
        phone2: apartment.phone2,
        phone3: apartment.phone3,
        landlordFullName: apartment.landlordFullName,
        landlordPhone: apartment.landlordPhone,
        landlordEmail: apartment.landlordEmail,
        residentUsers: apartment.users.map((user) => {
          const latestPasswordChange = user.passwordHistoryAsSubject[0];
          return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            lastPasswordChangedAt: latestPasswordChange?.changedAt ?? null,
            lastPasswordChangeReason: latestPasswordChange?.reason ?? null,
            lastPasswordChangedByName: latestPasswordChange?.changedBy?.fullName ?? null,
            lastPasswordChangedByEmail: latestPasswordChange?.changedBy?.email ?? null,
          };
        }),
      }))
    );
  });

  router.get("/apartments/:apartmentId/resident-password-history", async (req, res) => {
    const { apartmentId } = req.params;
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const rows = await prisma.userPasswordHistory.findMany({
      where: {
        user: {
          apartmentId,
          role: UserRole.RESIDENT,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ changedAt: "desc" }],
      take: 500,
    });

    return res.json(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userFullName: row.user.fullName,
        userEmail: row.user.email,
        reason: row.reason,
        changedAt: row.changedAt,
        changedByUserId: row.changedByUserId,
        changedByName: row.changedBy?.fullName ?? null,
        changedByEmail: row.changedBy?.email ?? null,
      }))
    );
  });

  router.post("/apartments/:apartmentId/resident-password", async (req, res) => {
    const { apartmentId } = req.params;
    const parsed = apartmentResidentPasswordSetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true },
    });
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const targetUser = parsed.data.userId
      ? await prisma.user.findFirst({
          where: {
            id: parsed.data.userId,
            apartmentId,
            role: UserRole.RESIDENT,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        })
      : await prisma.user.findFirst({
          where: {
            apartmentId,
            role: UserRole.RESIDENT,
          },
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        });

    if (!targetUser) {
      return res.status(404).json({ message: "Bu daireye bagli resident kullanici bulunamadi" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const actorUserId = req.user?.userId ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          passwordPlaintext: null,
        },
      });

      await tx.userPasswordHistory.create({
        data: {
          userId: targetUser.id,
          changedByUserId: actorUserId,
          passwordHash,
          reason: PasswordChangeReason.ADMIN_SET,
        },
      });
    });

    return res.json({
      ok: true,
      userId: targetUser.id,
      userFullName: targetUser.fullName,
      userEmail: targetUser.email,
      message: "Resident sifresi guncellendi",
    });
  });

  router.post("/apartments", async (req, res) => {
    const parsed = apartmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const {
      blockName,
      doorNo,
      m2,
      type,
      apartmentClassId,
      apartmentDutyId,
      hasAidat,
      hasDogalgaz,
      hasOtherDues,
      hasIncome,
      hasExpenses,
      ownerFullName,
      occupancyType,
      moveInDate,
      email1,
      email2,
      email3,
      phone1,
      phone2,
      phone3,
      landlordFullName,
      landlordPhone,
      landlordEmail,
    } = parsed.data;

    const normalizedDoorNo = doorNo.trim();
    const normalizedBlockName = blockName.trim();
    const normalizedOwnerFullName = normalizeApartmentText(ownerFullName);
    const normalizedPhone1 = normalizeApartmentText(phone1);
    const normalizedPhone2 = normalizeApartmentText(phone2);
    const normalizedPhone3 = normalizeApartmentText(phone3);
    const normalizedEmail1 = normalizeApartmentText(email1);
    const normalizedEmail2 = normalizeApartmentText(email2);
    const normalizedEmail3 = normalizeApartmentText(email3);
    const normalizedLandlordFullName = normalizeApartmentText(landlordFullName);
    const normalizedLandlordPhone = normalizeApartmentText(landlordPhone);
    const normalizedLandlordEmail = normalizeApartmentText(landlordEmail);
    const normalizedOccupancyType = occupancyType ?? OccupancyType.OWNER;
    const normalizedMoveInDate = moveInDate?.trim() ? new Date(`${moveInDate.trim()}T00:00:00.000Z`) : null;
    const normalizedApartmentClassId = apartmentClassId?.trim() ? apartmentClassId.trim() : null;
    const normalizedApartmentDutyId = apartmentDutyId?.trim() ? apartmentDutyId.trim() : null;

    if (normalizedApartmentClassId) {
      const classExists = await prisma.apartmentClassDefinition.findUnique({
        where: { id: normalizedApartmentClassId },
        select: { id: true },
      });

      if (!classExists) {
        return res.status(400).json({ message: "Daire sinifi bulunamadi" });
      }
    }

    if (normalizedApartmentDutyId) {
      const dutyExists = await prisma.apartmentDutyDefinition.findUnique({
        where: { id: normalizedApartmentDutyId },
        select: { id: true },
      });

      if (!dutyExists) {
        return res.status(400).json({ message: "Daire gorevi bulunamadi" });
      }
    }

    const doorNoConflict = await findDoorNoConflict(normalizedDoorNo);
    if (doorNoConflict) {
      return res.status(409).json({
        message: `Daire no zaten mevcut: ${doorNoConflict.block.name}/${doorNoConflict.doorNo}. Ayni daire no ile kayit yapilamaz.`,
      });
    }

    const warnings = await findApartmentDuplicateWarnings({
      ownerFullName: normalizedOwnerFullName,
      occupancyType: normalizedOccupancyType,
      phone1: normalizedPhone1,
      phone2: normalizedPhone2,
      phone3: normalizedPhone3,
      email1: normalizedEmail1,
      email2: normalizedEmail2,
      email3: normalizedEmail3,
      landlordFullName: normalizedLandlordFullName,
      landlordPhone: normalizedLandlordPhone,
      landlordEmail: normalizedLandlordEmail,
    });

    const block = await prisma.block.upsert({
      where: { name: normalizedBlockName },
      update: {},
      create: { name: normalizedBlockName },
    });

    const apartment = await prisma.apartment.create({
      data: {
        blockId: block.id,
        doorNo: normalizedDoorNo,
        m2: m2 ?? null,
        type,
        apartmentClassId: normalizedApartmentClassId,
        apartmentDutyId: normalizedApartmentDutyId,
        hasAidat: hasAidat ?? true,
        hasDogalgaz: hasDogalgaz ?? true,
        hasOtherDues: hasOtherDues ?? true,
        hasIncome: hasIncome ?? true,
        hasExpenses: hasExpenses ?? true,
        ownerFullName: normalizedOwnerFullName,
        occupancyType: normalizedOccupancyType,
        moveInDate: normalizedMoveInDate,
        email1: normalizedEmail1,
        email2: normalizedEmail2,
        email3: normalizedEmail3,
        phone1: normalizedPhone1,
        phone2: normalizedPhone2,
        phone3: normalizedPhone3,
        landlordFullName: normalizedLandlordFullName,
        landlordPhone: normalizedLandlordPhone,
        landlordEmail: normalizedLandlordEmail,
      },
      include: {
        block: true,
        apartmentClass: true,
        apartmentDuty: true,
      },
    });

    const createdSnapshot = createApartmentSnapshot(apartment);
    await insertApartmentChangeLog({
      apartmentId: apartment.id,
      changedByUserId: req.user?.userId,
      action: ApartmentChangeAction.CREATE,
      before: null,
      after: createdSnapshot,
      changedFields: getChangedApartmentFields(null, createdSnapshot),
      note: "Daire olusturuldu",
    });

    return res.status(201).json({
      ...apartment,
      warningMessages: warnings,
    });
  });

  router.put("/apartments/:apartmentId", async (req, res) => {
    const { apartmentId } = req.params;
    const parsed = apartmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const existing = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        block: true,
        apartmentClass: true,
        apartmentDuty: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    try {
      const normalizedBlockName = parsed.data.blockName.trim();
      const normalizedDoorNo = parsed.data.doorNo.trim();
      const normalizedOwnerFullName = normalizeApartmentText(parsed.data.ownerFullName);
      const normalizedPhone1 = normalizeApartmentText(parsed.data.phone1);
      const normalizedPhone2 = normalizeApartmentText(parsed.data.phone2);
      const normalizedPhone3 = normalizeApartmentText(parsed.data.phone3);
      const normalizedEmail1 = normalizeApartmentText(parsed.data.email1);
      const normalizedEmail2 = normalizeApartmentText(parsed.data.email2);
      const normalizedEmail3 = normalizeApartmentText(parsed.data.email3);
      const normalizedLandlordFullName = normalizeApartmentText(parsed.data.landlordFullName);
      const normalizedLandlordPhone = normalizeApartmentText(parsed.data.landlordPhone);
      const normalizedLandlordEmail = normalizeApartmentText(parsed.data.landlordEmail);
      const normalizedMoveInDate = parsed.data.moveInDate?.trim() ? new Date(`${parsed.data.moveInDate.trim()}T00:00:00.000Z`) : null;
      const normalizedApartmentClassId = parsed.data.apartmentClassId?.trim() ? parsed.data.apartmentClassId.trim() : null;
      const normalizedApartmentDutyId = parsed.data.apartmentDutyId?.trim() ? parsed.data.apartmentDutyId.trim() : null;

      if (normalizedApartmentClassId) {
        const classExists = await prisma.apartmentClassDefinition.findUnique({
          where: { id: normalizedApartmentClassId },
          select: { id: true },
        });

        if (!classExists) {
          return res.status(400).json({ message: "Daire sinifi bulunamadi" });
        }
      }

      if (normalizedApartmentDutyId) {
        const dutyExists = await prisma.apartmentDutyDefinition.findUnique({
          where: { id: normalizedApartmentDutyId },
          select: { id: true },
        });

        if (!dutyExists) {
          return res.status(400).json({ message: "Daire gorevi bulunamadi" });
        }
      }

      const doorNoConflict = await findDoorNoConflict(normalizedDoorNo, apartmentId);
      if (doorNoConflict) {
        return res.status(409).json({
          message: `Daire no zaten mevcut: ${doorNoConflict.block.name}/${doorNoConflict.doorNo}. Ayni daire no ile kayit yapilamaz.`,
        });
      }

      const warnings = await findApartmentDuplicateWarnings({
        apartmentId,
        ownerFullName: normalizedOwnerFullName,
        occupancyType: parsed.data.occupancyType,
        phone1: normalizedPhone1,
        phone2: normalizedPhone2,
        phone3: normalizedPhone3,
        email1: normalizedEmail1,
        email2: normalizedEmail2,
        email3: normalizedEmail3,
        landlordFullName: normalizedLandlordFullName,
        landlordPhone: normalizedLandlordPhone,
        landlordEmail: normalizedLandlordEmail,
      });

      const block = await prisma.block.upsert({
        where: { name: normalizedBlockName },
        update: {},
        create: { name: normalizedBlockName },
      });

      const updated = await prisma.apartment.update({
        where: { id: apartmentId },
        data: {
          blockId: block.id,
          doorNo: normalizedDoorNo,
          m2: parsed.data.m2 ?? null,
          type: parsed.data.type,
          apartmentClassId: normalizedApartmentClassId,
          apartmentDutyId: normalizedApartmentDutyId,
          hasAidat: parsed.data.hasAidat ?? existing.hasAidat,
          hasDogalgaz: parsed.data.hasDogalgaz ?? existing.hasDogalgaz,
          hasOtherDues: parsed.data.hasOtherDues ?? existing.hasOtherDues,
          hasIncome: parsed.data.hasIncome ?? existing.hasIncome,
          hasExpenses: parsed.data.hasExpenses ?? existing.hasExpenses,
          ownerFullName: normalizedOwnerFullName,
          occupancyType: parsed.data.occupancyType,
          moveInDate: normalizedMoveInDate,
          email1: normalizedEmail1,
          email2: normalizedEmail2,
          email3: normalizedEmail3,
          phone1: normalizedPhone1,
          phone2: normalizedPhone2,
          phone3: normalizedPhone3,
          landlordFullName: normalizedLandlordFullName,
          landlordPhone: normalizedLandlordPhone,
          landlordEmail: normalizedLandlordEmail,
        },
        include: {
          block: true,
          apartmentClass: true,
          apartmentDuty: true,
        },
      });

      const beforeSnapshot = createApartmentSnapshot(existing);
      const afterSnapshot = createApartmentSnapshot(updated);
      const changedFields = getChangedApartmentFields(beforeSnapshot, afterSnapshot);
      await insertApartmentChangeLog({
        apartmentId,
        changedByUserId: req.user?.userId,
        action: ApartmentChangeAction.UPDATE,
        before: beforeSnapshot,
        after: afterSnapshot,
        changedFields,
      });

      return res.json({
        ...updated,
        warningMessages: warnings,
      });
    } catch (err) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Apartment with same block and doorNo already exists" });
      }

      throw err;
    }
  });

  router.delete("/apartments/:apartmentId", async (req, res) => {
    const { apartmentId } = req.params;

    const existing = await prisma.apartment.findUnique({ where: { id: apartmentId } });
    if (!existing) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const [chargeCount, residentCount] = await Promise.all([
      prisma.charge.count({ where: { apartmentId } }),
      prisma.user.count({ where: { apartmentId } }),
    ]);

    if (chargeCount > 0 || residentCount > 0) {
      return res.status(409).json({
        message: "Apartment has related records and cannot be deleted",
        chargeCount,
        residentCount,
      });
    }

    await prisma.apartment.delete({ where: { id: apartmentId } });
    return res.status(204).send();
  });

  return router;
}

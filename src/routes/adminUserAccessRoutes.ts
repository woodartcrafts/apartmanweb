import { PasswordChangeReason, Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  ADMIN_PAGE_DEFINITIONS,
  normalizeAdminPermissionMap,
  toPrismaJson,
} from "../utils/adminPermissions";

const router = Router();

const permissionMapSchema = z.record(
  z.object({
    visible: z.boolean(),
    read: z.boolean(),
    write: z.boolean(),
    delete: z.boolean(),
  })
);

const adminUserCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+90|0)?5\d{9}$/, "Telefon +90... veya 05... formatinda olmali")
    .optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one digit"),
  permissions: permissionMapSchema.optional(),
});

const adminPasswordSchema = z.object({
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one digit"),
});

const adminPermissionsSchema = z.object({
  permissions: permissionMapSchema,
});

router.get("/user-access/pages", (_req, res) => {
  return res.json(ADMIN_PAGE_DEFINITIONS);
});

router.get("/user-access/users", async (_req, res) => {
  const querySchema = z.object({
    role: z.enum(["ADMIN", "RESIDENT", "ALL"]).optional(),
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  });

  const parsed = querySchema.safeParse(_req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const role = parsed.data.role ?? "ALL";
  const q = (parsed.data.q ?? "").trim();
  const limit = parsed.data.limit ?? 50;
  const offset = parsed.data.offset ?? 0;

  const where: Prisma.UserWhereInput = {
    ...(role !== "ALL" ? { role: role as UserRole } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.user.count({ where });

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      adminPagePermissions: true,
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    take: limit,
    skip: offset,
  });

  return res.json({
    rows: users.map((item) => ({
      ...item,
      permissions:
        item.role === UserRole.ADMIN
          ? normalizeAdminPermissionMap(item.adminPagePermissions)
          : null,
    })),
    total,
    limit,
    offset,
  });
});

router.post("/user-access/users", async (req, res) => {
  const parsed = adminUserCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const payload = parsed.data;
  const actorUserId = req.user?.userId ?? null;
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.phone?.trim() || null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
        normalizedPhone
          ? {
              phone: normalizedPhone,
            }
          : undefined,
      ].filter(Boolean) as Prisma.UserWhereInput[],
    },
    select: { id: true },
  });

  if (existing) {
    return res.status(409).json({ message: "Bu e-posta veya telefon ile baska bir kullanici var" });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const permissionMap = normalizeAdminPermissionMap(payload.permissions);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: payload.fullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: UserRole.ADMIN,
        passwordHash,
        passwordPlaintext: null,
        adminPagePermissions: toPrismaJson(permissionMap),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.userPasswordHistory.create({
      data: {
        userId: user.id,
        changedByUserId: actorUserId,
        passwordHash,
        passwordPlaintext: null,
        reason: PasswordChangeReason.INITIAL_SEED,
      },
    });

    return user;
  });

  return res.status(201).json({
    ...created,
    permissions: permissionMap,
  });
});

router.put("/user-access/users/:userId/password", async (req, res) => {
  const { userId } = req.params;
  const parsed = adminPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role !== UserRole.ADMIN) {
    return res.status(404).json({ message: "Admin kullanici bulunamadi" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const actorUserId = req.user?.userId ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordPlaintext: null,
      },
    });

    await tx.userPasswordHistory.create({
      data: {
        userId,
        changedByUserId: actorUserId,
        passwordHash,
        passwordPlaintext: null,
        reason: PasswordChangeReason.ADMIN_SET,
      },
    });
  });

  return res.json({ ok: true });
});

router.put("/user-access/users/:userId/permissions", async (req, res) => {
  const { userId } = req.params;
  const parsed = adminPermissionsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role !== UserRole.ADMIN) {
    return res.status(404).json({ message: "Admin kullanici bulunamadi" });
  }

  const permissionMap = normalizeAdminPermissionMap(parsed.data.permissions);
  await prisma.user.update({
    where: { id: userId },
    data: {
      adminPagePermissions: toPrismaJson(permissionMap),
    },
  });

  return res.json({ ok: true, permissions: permissionMap });
});

router.delete("/user-access/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const actorUserId = req.user?.userId ?? null;

  if (!actorUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (actorUserId === userId) {
    return res.status(400).json({ message: "Kendi kullanicinizi silemezsiniz" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role !== UserRole.ADMIN) {
    return res.status(404).json({ message: "Admin kullanici bulunamadi" });
  }

  const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  if (adminCount <= 1) {
    return res.status(400).json({ message: "Sistemde en az bir admin kalmali" });
  }

  await prisma.user.delete({ where: { id: userId } });
  return res.json({ ok: true });
});

export default router;
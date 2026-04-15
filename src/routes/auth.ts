import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db";
import { normalizeAdminPermissionMap } from "../utils/adminPermissions";
import { requireAuth } from "../middlewares/auth";

const router = Router();
const AUTH_COOKIE_NAME = "auth_token";
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const loginRateLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.maxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin." },
});

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite: "lax" | "none" = isProduction ? "none" : "lax";
  return {
    httpOnly: true,
    sameSite,
    secure: isProduction,
  };
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (trimmed.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+90${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits}`;
  }

  if (digits.length > 4 && digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  return null;
}

router.post("/login", loginRateLimiter, async (req, res) => {
  const schema = z
    .object({
      identifier: z.string().trim().min(3).max(64).optional(),
      email: z.string().trim().email().optional(),
      password: z
        .string()
        .min(8)
        .max(128)
        .regex(/[A-Za-z]/, "Password must include at least one letter")
        .regex(/[0-9]/, "Password must include at least one digit"),
    })
    .refine((data) => Boolean(data.identifier || data.email), {
      message: "Identifier or email is required",
      path: ["identifier"],
    });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const password = parsed.data.password;
  const rawIdentifier = (parsed.data.identifier ?? parsed.data.email ?? "").trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();

  type UserWithApartment = Prisma.UserGetPayload<{ include: { apartment: { select: { doorNo: true } } } }>;
  let user: UserWithApartment | null = null;

  if (normalizedIdentifier.includes("@")) {
    user = await prisma.user.findFirst({
      where: {
        email: {
          equals: rawIdentifier,
          mode: "insensitive",
        },
      },
      include: {
        apartment: {
          select: {
            doorNo: true,
          },
        },
      },
    });
  } else {
    const normalizedPhone = normalizePhone(normalizedIdentifier);
    if (!normalizedPhone) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      include: {
        apartment: {
          select: {
            doorNo: true,
          },
        },
      },
    });
  }

  if (!user) {
    console.warn(`[auth] Basarisiz giris: kullanici bulunamadi ip=${req.ip ?? "-"} at=${new Date().toISOString()}`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    console.warn(`[auth] Basarisiz giris: yanlis sifre ip=${req.ip ?? "-"} at=${new Date().toISOString()}`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      apartmentId: user.apartmentId,
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getAuthCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      apartmentId: user.apartmentId,
      apartmentDoorNo: user.apartment?.doorNo ?? null,
      adminPagePermissions:
        user.role === "ADMIN" && user.adminPagePermissions
          ? normalizeAdminPermissionMap(user.adminPagePermissions)
          : null,
    },
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
  });

  return res.json({ ok: true });
});

// Session dogrulama — sayfa yenilemede taze kullanici verisi ve izinleri doner
router.get("/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  type UserWithApartment = Prisma.UserGetPayload<{ include: { apartment: { select: { doorNo: true } } } }>;
  const user: UserWithApartment | null = await prisma.user.findUnique({
    where: { id: userId },
    include: { apartment: { select: { doorNo: true } } },
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      apartmentId: user.apartmentId,
      apartmentDoorNo: user.apartment?.doorNo ?? null,
      adminPagePermissions:
        user.role === "ADMIN" && user.adminPagePermissions
          ? normalizeAdminPermissionMap(user.adminPagePermissions)
          : null,
    },
  });
});

export default router;

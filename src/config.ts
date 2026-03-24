import dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return ["http://localhost:5173"];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function readJwtSecret(): string {
  const explicit = process.env.JWT_SECRET;
  if (explicit) {
    return explicit;
  }

  if (process.env.NODE_ENV !== "production") {
    // Keep local development stable while avoiding a static shared fallback secret.
    const ephemeralSecret = randomBytes(32).toString("hex");
    console.warn("[config] JWT_SECRET missing; using one-time ephemeral development secret.");
    return ephemeralSecret;
  }

  throw new Error("Missing env variable: JWT_SECRET");
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: readJwtSecret(),
  corsAllowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  authRateLimit: {
    windowMs: toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxAttempts: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 5),
  },
};

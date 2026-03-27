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

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
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
  gmailBankSync: {
    enabled: toBoolean(process.env.GMAIL_BANK_SYNC_ENABLED, false),
    cronToken: process.env.GMAIL_BANK_SYNC_CRON_TOKEN,
    gmailUser: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD,
    oauthClientId: process.env.GMAIL_CLIENT_ID,
    oauthClientSecret: process.env.GMAIL_CLIENT_SECRET,
    oauthRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
    senderFilter: process.env.GMAIL_BANK_SENDER ?? process.env.ISBANK_EMAIL_FROM,
    query: process.env.GMAIL_BANK_QUERY,
    importOnlyIncoming: toBoolean(process.env.GMAIL_BANK_IMPORT_ONLY_INCOMING, true),
    lookbackDays: toPositiveInt(process.env.GMAIL_BANK_LOOKBACK_DAYS, 2),
    maxMessages: toPositiveInt(process.env.GMAIL_BANK_MAX_MESSAGES, 10),
    scheduleHour: toPositiveInt(process.env.GMAIL_BANK_SYNC_SCHEDULE_HOUR, 12),
    scheduleMinute: toPositiveInt(process.env.GMAIL_BANK_SYNC_SCHEDULE_MINUTE, 0),
    scheduleTimeZone: process.env.GMAIL_BANK_SYNC_TIMEZONE ?? "Europe/Istanbul",
  },
  authRateLimit: {
    windowMs: toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxAttempts: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 5),
  },
};

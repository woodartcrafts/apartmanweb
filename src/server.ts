import app from "./app";
import { config } from "./config";
import { prisma } from "./db";
import { runScheduledGmailBankSync } from "./routes/admin";

const server = app.listen(config.port, () => {
  // This log is useful during Railway container boot.
  console.log(`apartmanweb-api listening on :${config.port}`);
});

if (config.gmailBankSync.enabled) {
  const timeZone = config.gmailBankSync.scheduleTimeZone;
  const targetHour = Math.max(0, Math.min(23, config.gmailBankSync.scheduleHour));
  const targetMinute = Math.max(0, Math.min(59, config.gmailBankSync.scheduleMinute));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let lastRunDateKey: string | null = null;

  const tick = (): void => {
    const parts = formatter.formatToParts(new Date());
    const map = new Map(parts.map((part) => [part.type, part.value]));
    const dateKey = `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
    const hour = Number(map.get("hour") ?? "-1");
    const minute = Number(map.get("minute") ?? "-1");

    if (hour === targetHour && minute === targetMinute && lastRunDateKey !== dateKey) {
      lastRunDateKey = dateKey;
      void runScheduledGmailBankSync();
    }
  };

  setInterval(tick, 60_000);
  tick();
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down gracefully`);

  server.close(async (closeErr) => {
    if (closeErr) {
      console.error("[server] HTTP server close error", closeErr);
    }

    try {
      await prisma.$disconnect();
    } catch (dbErr) {
      console.error("[server] Prisma disconnect error", dbErr);
    } finally {
      process.exit(closeErr ? 1 : 0);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

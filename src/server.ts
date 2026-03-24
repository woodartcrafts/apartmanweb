import app from "./app";
import { config } from "./config";
import { prisma } from "./db";

const server = app.listen(config.port, () => {
  // This log is useful during Railway container boot.
  console.log(`apartmanweb-api listening on :${config.port}`);
});

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

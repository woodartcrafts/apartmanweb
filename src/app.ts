import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { config } from "./config";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import residentRoutes from "./routes/resident";
import { runGmailBankSync } from "./routes/admin";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.corsAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(express.static(path.resolve(process.cwd(), "public"), { index: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/internal/gmail-bank-sync", async (req, res) => {
  if (!config.gmailBankSync.enabled) {
    return res.status(404).json({ message: "Gmail bank sync kapali" });
  }

  const expectedToken = config.gmailBankSync.cronToken?.trim();
  if (!expectedToken) {
    return res.status(500).json({ message: "GMAIL_BANK_SYNC_CRON_TOKEN tanimli degil" });
  }

  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length).trim()
    : "";
  const headerToken = typeof req.headers["x-cron-token"] === "string" ? req.headers["x-cron-token"].trim() : "";
  const providedToken = bearer || headerToken;

  if (!providedToken || providedToken !== expectedToken) {
    return res.status(401).json({ message: "Yetkisiz cron cagrisi" });
  }

  try {
    const result = await runGmailBankSync();
    return res.json({
      message: "Internal Gmail sync tamamlandi",
      ...result,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Beklenmeyen hata";
    console.error("[internal-gmail-sync-failed]", err);
    return res.status(500).json({ message: `Internal Gmail sync basarisiz: ${detail}` });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/resident", residentRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isCorsError = err instanceof Error && err.message.includes("CORS");
  if (isCorsError) {
    res.status(403).json({ message: "Origin is not allowed" });
    return;
  }

  console.error("[unhandled-error]", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;

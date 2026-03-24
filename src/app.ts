import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import residentRoutes from "./routes/resident";

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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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

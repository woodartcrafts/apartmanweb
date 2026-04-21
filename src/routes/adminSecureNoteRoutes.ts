import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const raw = process.env.SECURE_NOTE_KEY;
  if (!raw || raw.length < 32) {
    throw new Error("SECURE_NOTE_KEY env var must be at least 32 characters");
  }
  return Buffer.from(raw.slice(0, 32), "utf8");
}

function encryptText(plaintext: string): { content: string; iv: string; authTag: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    content: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptText(content: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(content, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

const createSchema = z.object({
  label: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  sortOrder: z.number().int().optional(),
});

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  sortOrder: z.number().int().optional(),
});

export function createAdminSecureNoteRoutes(): Router {
  const router = Router();

  router.use(requireAuth, requireRole([UserRole.ADMIN]));

  // GET /api/admin/secure-notes
  router.get("/secure-notes", async (_req, res) => {
    const notes = await prisma.secureNote.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, label: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
    res.json({ notes });
  });

  // GET /api/admin/secure-notes/:id/reveal
  router.get("/secure-notes/:id/reveal", async (req, res) => {
    const note = await prisma.secureNote.findUnique({ where: { id: req.params.id } });
    if (!note) return res.status(404).json({ error: "Not bulunamadi" });
    try {
      const plaintext = decryptText(note.content, note.iv, note.authTag);
      return res.json({ id: note.id, label: note.label, content: plaintext });
    } catch {
      return res.status(500).json({ error: "Sifre cozme basarisiz" });
    }
  });

  // POST /api/admin/secure-notes
  router.post("/secure-notes", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Gecersiz veri", details: parsed.error.flatten() });
    const { label, content, sortOrder } = parsed.data;
    const encrypted = encryptText(content);
    const note = await prisma.secureNote.create({
      data: { label, ...encrypted, sortOrder: sortOrder ?? 0 },
      select: { id: true, label: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
    return res.status(201).json({ note });
  });

  // PATCH /api/admin/secure-notes/:id
  router.patch("/secure-notes/:id", async (req, res) => {
    const existing = await prisma.secureNote.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not bulunamadi" });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Gecersiz veri", details: parsed.error.flatten() });

    const { label, content, sortOrder } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (content !== undefined) {
      const encrypted = encryptText(content);
      Object.assign(updateData, encrypted);
    }

    const note = await prisma.secureNote.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, label: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
    return res.json({ note });
  });

  // DELETE /api/admin/secure-notes/:id
  router.delete("/secure-notes/:id", async (req, res) => {
    const existing = await prisma.secureNote.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not bulunamadi" });
    await prisma.secureNote.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  });

  return router;
}

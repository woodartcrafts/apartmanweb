import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export function createAdminResidentContentRoutes(): Router {
  const router = Router();
router.get("/resident-content/announcements", async (_req, res) => {
  const rows = await prisma.residentAnnouncement.findMany({
    orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      isActive: row.isActive,
      publishAt: row.publishAt,
      expiresAt: row.expiresAt,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  );
});

router.post("/resident-content/announcements", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    content: z.string().trim().min(5).max(5000),
    isActive: z.boolean().optional(),
    publishAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const created = await prisma.residentAnnouncement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isActive: parsed.data.isActive ?? true,
      publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : new Date(),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdById: req.user?.userId,
    },
  });

  return res.status(201).json(created);
});

router.put("/resident-content/announcements/:id", async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    title: z.string().trim().min(3).max(200).optional(),
    content: z.string().trim().min(5).max(5000).optional(),
    isActive: z.boolean().optional(),
    publishAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.residentAnnouncement.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Duyuru bulunamadi" });
  }

  const updated = await prisma.residentAnnouncement.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.publishAt !== undefined ? { publishAt: new Date(parsed.data.publishAt) } : {}),
      ...(parsed.data.expiresAt !== undefined
        ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
        : {}),
    },
  });

  return res.json(updated);
});

router.delete("/resident-content/announcements/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.residentAnnouncement.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Duyuru bulunamadi" });
  }

  await prisma.residentAnnouncement.delete({ where: { id } });
  return res.status(204).end();
});

router.get("/resident-content/polls", async (_req, res) => {
  const polls = await prisma.residentPoll.findMany({
    include: {
      options: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const allOptionIds = polls.flatMap((poll) => poll.options.map((opt) => opt.id));
  const groupedCounts =
    allOptionIds.length > 0
      ? await prisma.residentPollVote.groupBy({
          by: ["optionId"],
          where: { optionId: { in: allOptionIds } },
          _count: { _all: true },
        })
      : [];

  const voteCountByOption = new Map(groupedCounts.map((x) => [x.optionId, x._count._all]));

  return res.json(
    polls.map((poll) => {
      const options = poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        sortOrder: opt.sortOrder,
        isActive: opt.isActive,
        voteCount: voteCountByOption.get(opt.id) ?? 0,
      }));

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        isActive: poll.isActive,
        allowMultiple: poll.allowMultiple,
        startsAt: poll.startsAt,
        endsAt: poll.endsAt,
        createdById: poll.createdById,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        totalVotes: options.reduce((sum, x) => sum + x.voteCount, 0),
        options,
      };
    })
  );
});

router.post("/resident-content/polls", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
    allowMultiple: z.boolean().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(20),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const uniqueOptions = [...new Set(parsed.data.options.map((x) => x.trim()).filter(Boolean))];
  if (uniqueOptions.length < 2) {
    return res.status(400).json({ message: "Anket icin en az 2 farkli secenek gereklidir" });
  }

  const created = await prisma.residentPoll.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      allowMultiple: parsed.data.allowMultiple ?? false,
      isActive: parsed.data.isActive ?? true,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      createdById: req.user?.userId,
      options: {
        create: uniqueOptions.map((text, idx) => ({
          text,
          sortOrder: idx,
          isActive: true,
        })),
      },
    },
    include: {
      options: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return res.status(201).json(created);
});

router.put("/resident-content/polls/:id", async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    allowMultiple: z.boolean().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const existing = await prisma.residentPoll.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Anket bulunamadi" });
  }

  const updated = await prisma.residentPoll.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.allowMultiple !== undefined ? { allowMultiple: parsed.data.allowMultiple } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.startsAt !== undefined ? { startsAt: new Date(parsed.data.startsAt) } : {}),
      ...(parsed.data.endsAt !== undefined
        ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }
        : {}),
    },
  });

  return res.json(updated);
});

router.delete("/resident-content/polls/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.residentPoll.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Anket bulunamadi" });
  }

  await prisma.residentPoll.delete({ where: { id } });
  return res.status(204).end();
});

  return router;
}

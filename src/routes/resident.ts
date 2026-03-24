import { PasswordChangeReason, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getApartmentStatements } from "../utils/statement";

const router = Router();

router.use(requireAuth, requireRole([UserRole.RESIDENT, UserRole.ADMIN]));

router.get("/me/statement", async (req, res) => {
  const apartmentId = req.user?.apartmentId;

  // Admin can still inspect by providing apartmentId query param.
  const targetApartmentId = req.user?.role === UserRole.ADMIN
    ? (req.query.apartmentId as string | undefined) ?? apartmentId
    : apartmentId;

  if (!targetApartmentId) {
    return res.status(400).json({ message: "Apartment not linked" });
  }

  const { statement, accountingStatement } = await getApartmentStatements(targetApartmentId);

  return res.json({ apartmentId: targetApartmentId, statement, accountingStatement });
});

router.get("/me/expenses-report", async (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.issues });
  }

  const { from, to } = parsed.data;
  const limit = parsed.data.limit ?? 200;

  const rangeFilter =
    from || to
      ? {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        }
      : undefined;

  const [totals, groupedByItem, expenses] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        spentAt: rangeFilter,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["expenseItemId"],
      where: {
        spentAt: rangeFilter,
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 10,
    }),
    prisma.expense.findMany({
      where: {
        spentAt: rangeFilter,
      },
      include: {
        expenseItem: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  ]);

  const itemIds = [...new Set(groupedByItem.map((x) => x.expenseItemId))];
  const items = itemIds.length
    ? await prisma.expenseItemDefinition.findMany({
        where: {
          id: {
            in: itemIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];
  const itemMap = new Map(items.map((x) => [x.id, x.name]));

  return res.json({
    from: from ?? null,
    to: to ?? null,
    totalAmount: Number(totals._sum.amount ?? 0),
    totalCount: totals._count._all,
    topItems: groupedByItem.map((row) => ({
      expenseItemId: row.expenseItemId,
      expenseItemName: itemMap.get(row.expenseItemId) ?? "Bilinmeyen Kalem",
      totalAmount: Number(row._sum.amount ?? 0),
      expenseCount: row._count._all,
    })),
    rows: expenses.map((expense) => ({
      id: expense.id,
      expenseItemId: expense.expenseItemId,
      expenseItemName: expense.expenseItem.name,
      spentAt: expense.spentAt,
      amount: Number(expense.amount),
      paymentMethod: expense.paymentMethod,
      description: expense.description,
      reference: expense.reference,
      createdAt: expense.createdAt,
    })),
  });
});

router.get("/me/engagement", async (req, res) => {
  const now = new Date();
  const currentUserId = req.user?.userId;

  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [announcements, polls] = await Promise.all([
    prisma.residentAnnouncement.findMany({
      where: {
        isActive: true,
        publishAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.residentPoll.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  const pollIds = polls.map((x) => x.id);
  const optionIds = polls.flatMap((x) => x.options.map((opt) => opt.id));

  const [voteCounts, myVotes] = await Promise.all([
    optionIds.length > 0
      ? prisma.residentPollVote.groupBy({
          by: ["optionId"],
          where: { optionId: { in: optionIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    pollIds.length > 0
      ? prisma.residentPollVote.findMany({
          where: {
            pollId: { in: pollIds },
            userId: currentUserId,
          },
          select: {
            pollId: true,
            optionId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const voteCountMap = new Map(voteCounts.map((x) => [x.optionId, x._count._all]));
  const myVotesByPollId = myVotes.reduce<Record<string, string[]>>((acc, vote) => {
    acc[vote.pollId] = acc[vote.pollId] ?? [];
    acc[vote.pollId].push(vote.optionId);
    return acc;
  }, {});

  return res.json({
    snapshotAt: now,
    announcements: announcements.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      publishAt: item.publishAt,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
    })),
    polls: polls.map((poll) => {
      const myOptionIds = myVotesByPollId[poll.id] ?? [];
      const options = poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        sortOrder: opt.sortOrder,
        voteCount: voteCountMap.get(opt.id) ?? 0,
      }));

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        allowMultiple: poll.allowMultiple,
        startsAt: poll.startsAt,
        endsAt: poll.endsAt,
        createdAt: poll.createdAt,
        myOptionIds,
        totalVotes: options.reduce((sum, x) => sum + x.voteCount, 0),
        options,
      };
    }),
  });
});

router.post("/me/polls/:pollId/vote", async (req, res) => {
  const { pollId } = req.params;
  const schema = z.object({
    optionIds: z.array(z.string().min(1)).min(1).max(20),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const currentUserId = req.user?.userId;
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = new Date();
  const poll = await prisma.residentPoll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!poll) {
    return res.status(404).json({ message: "Anket bulunamadi" });
  }

  if (!poll.isActive || poll.startsAt > now || (poll.endsAt && poll.endsAt < now)) {
    return res.status(409).json({ message: "Anket su an oy kullanima acik degil" });
  }

  const optionSet = new Set(poll.options.map((x) => x.id));
  const uniqueOptionIds = [...new Set(parsed.data.optionIds)];

  if (!poll.allowMultiple && uniqueOptionIds.length > 1) {
    return res.status(400).json({ message: "Bu ankette yalnizca tek secim yapabilirsiniz" });
  }

  if (uniqueOptionIds.some((id) => !optionSet.has(id))) {
    return res.status(400).json({ message: "Secilen seceneklerden en az biri bu ankete ait degil" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.residentPollVote.deleteMany({
      where: {
        pollId,
        userId: currentUserId,
      },
    });

    await tx.residentPollVote.createMany({
      data: uniqueOptionIds.map((optionId) => ({
        pollId,
        optionId,
        userId: currentUserId,
      })),
    });
  });

  return res.json({
    pollId,
    votedOptionIds: uniqueOptionIds,
    message: "Oyunuz kaydedildi",
  });
});

router.post("/me/password", async (req, res) => {
  const schema = z
    .object({
      currentPassword: z.string().min(8).max(128),
      newPassword: z
        .string()
        .min(8)
        .max(128)
        .regex(/[A-Za-z]/, "Password must include at least one letter")
        .regex(/[0-9]/, "Password must include at least one digit"),
      confirmPassword: z.string().min(8).max(128),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Yeni sifre ve tekrar sifresi ayni olmali",
      path: ["confirmPassword"],
    });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
  }

  const currentUserId = req.user?.userId;
  if (!currentUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return res.status(404).json({ message: "Kullanici bulunamadi" });
  }

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return res.status(401).json({ message: "Mevcut sifre hatali" });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({ message: "Yeni sifre mevcut sifreden farkli olmali" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: currentUserId },
      data: {
        passwordHash,
        passwordPlaintext: parsed.data.newPassword,
      },
    });

    await tx.userPasswordHistory.create({
      data: {
        userId: currentUserId,
        changedByUserId: currentUserId,
        passwordHash,
        passwordPlaintext: parsed.data.newPassword,
        reason: PasswordChangeReason.SELF_CHANGE,
      },
    });
  });

  return res.json({ ok: true, message: "Sifreniz guncellendi" });
});

export default router;

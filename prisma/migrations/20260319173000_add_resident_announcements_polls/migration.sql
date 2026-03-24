-- CreateTable
CREATE TABLE "ResidentAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidentAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentPoll" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidentPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidentPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentPollVote" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResidentPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentAnnouncement_isActive_publishAt_idx" ON "ResidentAnnouncement"("isActive", "publishAt");
CREATE INDEX "ResidentAnnouncement_expiresAt_idx" ON "ResidentAnnouncement"("expiresAt");

CREATE INDEX "ResidentPoll_isActive_startsAt_idx" ON "ResidentPoll"("isActive", "startsAt");
CREATE INDEX "ResidentPoll_endsAt_idx" ON "ResidentPoll"("endsAt");

CREATE INDEX "ResidentPollOption_pollId_sortOrder_idx" ON "ResidentPollOption"("pollId", "sortOrder");

CREATE UNIQUE INDEX "ResidentPollVote_pollId_userId_optionId_key" ON "ResidentPollVote"("pollId", "userId", "optionId");
CREATE INDEX "ResidentPollVote_pollId_userId_idx" ON "ResidentPollVote"("pollId", "userId");
CREATE INDEX "ResidentPollVote_optionId_idx" ON "ResidentPollVote"("optionId");

-- AddForeignKey
ALTER TABLE "ResidentPollOption"
ADD CONSTRAINT "ResidentPollOption_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "ResidentPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResidentPollVote"
ADD CONSTRAINT "ResidentPollVote_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "ResidentPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResidentPollVote"
ADD CONSTRAINT "ResidentPollVote_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "ResidentPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PasswordChangeReason" AS ENUM ('INITIAL_SEED', 'ADMIN_SET', 'SELF_CHANGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordPlaintext" TEXT;

-- CreateTable
CREATE TABLE "UserPasswordHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordPlaintext" TEXT,
    "reason" "PasswordChangeReason" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPasswordHistory_userId_changedAt_idx" ON "UserPasswordHistory"("userId", "changedAt");

-- CreateIndex
CREATE INDEX "UserPasswordHistory_changedByUserId_changedAt_idx" ON "UserPasswordHistory"("changedByUserId", "changedAt");

-- CreateIndex
CREATE INDEX "UserPasswordHistory_changedAt_idx" ON "UserPasswordHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "UserPasswordHistory" ADD CONSTRAINT "UserPasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPasswordHistory" ADD CONSTRAINT "UserPasswordHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('EDIT', 'DELETE', 'UNDO');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('PAYMENT', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AuditUndoKind" AS ENUM ('PAYMENT_EDIT', 'PAYMENT_DELETE', 'EXPENSE_EDIT', 'EXPENSE_DELETE');

-- CreateTable
CREATE TABLE "AuditActionLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoUntil" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "actionType" "AuditActionType" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "undoKind" "AuditUndoKind",
    "undoPayload" JSONB,

    CONSTRAINT "AuditActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditActionLog_createdAt_idx" ON "AuditActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditActionLog_undoUntil_idx" ON "AuditActionLog"("undoUntil");

-- CreateIndex
CREATE INDEX "AuditActionLog_actorUserId_idx" ON "AuditActionLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditActionLog_entityType_entityId_idx" ON "AuditActionLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AuditActionLog" ADD CONSTRAINT "AuditActionLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SecureNote" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecureNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecureNote_sortOrder_idx" ON "SecureNote"("sortOrder");

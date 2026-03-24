-- CreateEnum
CREATE TYPE "ImportBatchType" AS ENUM ('PAYMENT_UPLOAD', 'BANK_STATEMENT_UPLOAD');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "kind" "ImportBatchType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "createdExpenseCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedAt_idx" ON "ImportBatch"("uploadedAt");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedById_idx" ON "ImportBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "ImportBatch_kind_idx" ON "ImportBatch"("kind");

-- CreateIndex
CREATE INDEX "Expense_importBatchId_idx" ON "Expense"("importBatchId");

-- CreateIndex
CREATE INDEX "Payment_importBatchId_idx" ON "Payment"("importBatchId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

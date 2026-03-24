-- CreateTable
CREATE TABLE "DescriptionExpenseRule" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "expenseItemId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescriptionExpenseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionExpenseRule_normalizedKeyword_key" ON "DescriptionExpenseRule"("normalizedKeyword");

-- CreateIndex
CREATE INDEX "DescriptionExpenseRule_isActive_idx" ON "DescriptionExpenseRule"("isActive");

-- CreateIndex
CREATE INDEX "DescriptionExpenseRule_expenseItemId_idx" ON "DescriptionExpenseRule"("expenseItemId");

-- AddForeignKey
ALTER TABLE "DescriptionExpenseRule" ADD CONSTRAINT "DescriptionExpenseRule_expenseItemId_fkey" FOREIGN KEY ("expenseItemId") REFERENCES "ExpenseItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

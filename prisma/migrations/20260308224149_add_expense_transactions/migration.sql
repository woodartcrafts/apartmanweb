-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "expenseItemId" TEXT NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "description" TEXT,
    "reference" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Expense_expenseItemId_idx" ON "Expense"("expenseItemId");

-- CreateIndex
CREATE INDEX "Expense_paymentMethod_idx" ON "Expense"("paymentMethod");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseItemId_fkey" FOREIGN KEY ("expenseItemId") REFERENCES "ExpenseItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

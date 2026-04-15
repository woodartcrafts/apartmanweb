-- AddIndex: Charge.dueDate
CREATE INDEX IF NOT EXISTS "Charge_dueDate_idx" ON "Charge"("dueDate");

-- AddIndex: Expense.createdById
CREATE INDEX IF NOT EXISTS "Expense_createdById_idx" ON "Expense"("createdById");

-- AddIndex: Payment.createdById
CREATE INDEX IF NOT EXISTS "Payment_createdById_idx" ON "Payment"("createdById");

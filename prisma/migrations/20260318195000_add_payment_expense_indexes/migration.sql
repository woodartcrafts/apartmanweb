CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX IF NOT EXISTS "Payment_method_idx" ON "Payment"("method");
CREATE INDEX IF NOT EXISTS "Expense_reference_idx" ON "Expense"("reference");

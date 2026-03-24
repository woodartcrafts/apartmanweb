-- CreateTable
CREATE TABLE "BankTermDeposit" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "branchId" TEXT,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "annualInterestRate" DECIMAL(7,4) NOT NULL,
    "withholdingTaxRate" DECIMAL(7,4) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTermDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankTermDeposit_bankId_idx" ON "BankTermDeposit"("bankId");

-- CreateIndex
CREATE INDEX "BankTermDeposit_branchId_idx" ON "BankTermDeposit"("branchId");

-- CreateIndex
CREATE INDEX "BankTermDeposit_endDate_idx" ON "BankTermDeposit"("endDate");

-- AddForeignKey
ALTER TABLE "BankTermDeposit" ADD CONSTRAINT "BankTermDeposit_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "BankDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTermDeposit" ADD CONSTRAINT "BankTermDeposit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BankBranchDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

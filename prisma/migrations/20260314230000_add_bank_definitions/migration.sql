CREATE TABLE "BankDefinition" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankBranchDefinition" (
  "id" TEXT NOT NULL,
  "bankId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankBranchDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankDefinition_name_key" ON "BankDefinition"("name");
CREATE UNIQUE INDEX "BankBranchDefinition_bankId_name_key" ON "BankBranchDefinition"("bankId", "name");
CREATE INDEX "BankBranchDefinition_bankId_idx" ON "BankBranchDefinition"("bankId");

ALTER TABLE "BankBranchDefinition"
ADD CONSTRAINT "BankBranchDefinition_bankId_fkey"
FOREIGN KEY ("bankId") REFERENCES "BankDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

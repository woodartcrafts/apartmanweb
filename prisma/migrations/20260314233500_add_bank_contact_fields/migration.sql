ALTER TABLE "BankDefinition"
ADD COLUMN "accountHolderName" TEXT,
ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "iban" TEXT,
ADD COLUMN "swiftCode" TEXT,
ADD COLUMN "taxOffice" TEXT,
ADD COLUMN "taxNumber" TEXT,
ADD COLUMN "customerCode" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "representativeName" TEXT,
ADD COLUMN "representativePhone" TEXT,
ADD COLUMN "representativeEmail" TEXT,
ADD COLUMN "notes" TEXT;

ALTER TABLE "BankBranchDefinition"
ADD COLUMN "branchCode" TEXT,
ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "iban" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "representativeName" TEXT,
ADD COLUMN "representativePhone" TEXT,
ADD COLUMN "representativeEmail" TEXT,
ADD COLUMN "notes" TEXT;

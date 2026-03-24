-- Create table for apartment duty definitions
CREATE TABLE "ApartmentDutyDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApartmentDutyDefinition_pkey" PRIMARY KEY ("id")
);

-- Add optional relation from apartment to duty
ALTER TABLE "Apartment"
ADD COLUMN "apartmentDutyId" TEXT;

-- Indexes
CREATE UNIQUE INDEX "ApartmentDutyDefinition_code_key" ON "ApartmentDutyDefinition"("code");
CREATE INDEX "Apartment_apartmentDutyId_idx" ON "Apartment"("apartmentDutyId");

-- Foreign key
ALTER TABLE "Apartment"
ADD CONSTRAINT "Apartment_apartmentDutyId_fkey"
FOREIGN KEY ("apartmentDutyId") REFERENCES "ApartmentDutyDefinition"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

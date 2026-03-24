CREATE TABLE "ApartmentClassDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApartmentClassDefinition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Apartment"
ADD COLUMN "apartmentClassId" TEXT;

CREATE UNIQUE INDEX "ApartmentClassDefinition_code_key" ON "ApartmentClassDefinition"("code");
CREATE INDEX "Apartment_apartmentClassId_idx" ON "Apartment"("apartmentClassId");

ALTER TABLE "Apartment"
ADD CONSTRAINT "Apartment_apartmentClassId_fkey"
FOREIGN KEY ("apartmentClassId") REFERENCES "ApartmentClassDefinition"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ApartmentClassDefinition" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES
  ('aptcls_buyuk', 'BUYUK', 'Buyuk Daire', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aptcls_kucuk', 'KUCUK', 'Kucuk Daire', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

UPDATE "Apartment" a
SET "apartmentClassId" = ac."id"
FROM "ApartmentClassDefinition" ac
WHERE ac."code" = a."type"::text
  AND a."apartmentClassId" IS NULL;

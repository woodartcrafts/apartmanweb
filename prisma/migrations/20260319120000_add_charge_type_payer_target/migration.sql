DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChargePayerTarget') THEN
    CREATE TYPE "ChargePayerTarget" AS ENUM ('OWNER', 'TENANT');
  END IF;
END $$;

ALTER TABLE "ChargeTypeDefinition"
ADD COLUMN IF NOT EXISTS "payerTarget" "ChargePayerTarget";

UPDATE "ChargeTypeDefinition"
SET "payerTarget" = 'OWNER'
WHERE "payerTarget" IS NULL;

ALTER TABLE "ChargeTypeDefinition"
ALTER COLUMN "payerTarget" SET DEFAULT 'OWNER',
ALTER COLUMN "payerTarget" SET NOT NULL;

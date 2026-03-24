/*
  Warnings:

  - You are about to drop the column `type` on the `Charge` table. All the data in the column will be lost.
  - Added the required column `chargeTypeId` to the `Charge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Charge" DROP COLUMN "type",
ADD COLUMN     "chargeTypeId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ChargeType";

-- CreateTable
CREATE TABLE "ChargeTypeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChargeTypeDefinition_code_key" ON "ChargeTypeDefinition"("code");

-- CreateIndex
CREATE INDEX "Charge_chargeTypeId_idx" ON "Charge"("chargeTypeId");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "ChargeTypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

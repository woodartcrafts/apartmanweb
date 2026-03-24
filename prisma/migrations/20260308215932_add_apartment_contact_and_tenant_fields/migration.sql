-- CreateEnum
CREATE TYPE "OccupancyType" AS ENUM ('OWNER', 'TENANT');

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN     "email1" TEXT,
ADD COLUMN     "email2" TEXT,
ADD COLUMN     "email3" TEXT,
ADD COLUMN     "landlordEmail" TEXT,
ADD COLUMN     "landlordFullName" TEXT,
ADD COLUMN     "landlordPhone" TEXT,
ADD COLUMN     "occupancyType" "OccupancyType" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "phone1" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "phone3" TEXT;

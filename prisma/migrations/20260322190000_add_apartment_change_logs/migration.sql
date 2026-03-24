-- CreateEnum
CREATE TYPE "ApartmentChangeAction" AS ENUM ('CREATE', 'UPDATE', 'BULK_UPDATE_CLASS');

-- CreateTable
CREATE TABLE "ApartmentChangeLog" (
    "id" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "action" "ApartmentChangeAction" NOT NULL DEFAULT 'UPDATE',
    "changedFields" TEXT[],
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "note" TEXT,

    CONSTRAINT "ApartmentChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApartmentChangeLog_apartmentId_changedAt_idx" ON "ApartmentChangeLog"("apartmentId", "changedAt");

-- CreateIndex
CREATE INDEX "ApartmentChangeLog_changedByUserId_idx" ON "ApartmentChangeLog"("changedByUserId");

-- AddForeignKey
ALTER TABLE "ApartmentChangeLog" ADD CONSTRAINT "ApartmentChangeLog_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentChangeLog" ADD CONSTRAINT "ApartmentChangeLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

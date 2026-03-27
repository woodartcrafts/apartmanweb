-- CreateTable
CREATE TABLE "BuildingProfile" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    "buildingName" TEXT,
    "parcelInfo" TEXT,
    "address" TEXT,
    "totalIndependentSections" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingProfile_singletonKey_key" ON "BuildingProfile"("singletonKey");

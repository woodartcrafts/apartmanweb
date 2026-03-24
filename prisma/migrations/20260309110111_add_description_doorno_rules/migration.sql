-- CreateTable
CREATE TABLE "DescriptionDoorNoRule" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "doorNo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescriptionDoorNoRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionDoorNoRule_normalizedKeyword_key" ON "DescriptionDoorNoRule"("normalizedKeyword");

-- CreateIndex
CREATE INDEX "DescriptionDoorNoRule_isActive_idx" ON "DescriptionDoorNoRule"("isActive");

-- CreateIndex
CREATE INDEX "DescriptionDoorNoRule_doorNo_idx" ON "DescriptionDoorNoRule"("doorNo");

-- CreateTable
CREATE TABLE "DailyDigestLog" (
    "dayKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDigestLog_pkey" PRIMARY KEY ("dayKey")
);

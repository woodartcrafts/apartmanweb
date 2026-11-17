-- Gunluk ozet artik e-postayla degil uygulama icinde saklanir: "gonderildi" kaydi tablosu yerine rapor tablosu.
DROP TABLE "DailyDigestLog";

-- CreateTable
CREATE TABLE "DailyAuditReport" (
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attentionCount" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB NOT NULL,

    CONSTRAINT "DailyAuditReport_pkey" PRIMARY KEY ("dayKey")
);

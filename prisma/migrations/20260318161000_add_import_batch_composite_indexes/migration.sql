CREATE INDEX IF NOT EXISTS "ImportBatch_kind_uploadedAt_idx" ON "ImportBatch"("kind", "uploadedAt");
CREATE INDEX IF NOT EXISTS "ImportBatch_uploadedById_uploadedAt_idx" ON "ImportBatch"("uploadedById", "uploadedAt");

-- Add per-admin page permissions as JSON blob.
ALTER TABLE "User"
ADD COLUMN "adminPagePermissions" JSONB;

-- Add restrictions and shadow flag to on-call layer
ALTER TABLE "OnCallLayer" ADD COLUMN IF NOT EXISTS "restrictionsJson" JSONB;
ALTER TABLE "OnCallLayer" ADD COLUMN IF NOT EXISTS "isShadow" BOOLEAN NOT NULL DEFAULT false;

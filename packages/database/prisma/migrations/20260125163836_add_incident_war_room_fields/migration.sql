-- Add incident management fields to AlertGroup
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "conferenceUrl" TEXT;
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "warRoomChannelId" TEXT;
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "warRoomChannelName" TEXT;

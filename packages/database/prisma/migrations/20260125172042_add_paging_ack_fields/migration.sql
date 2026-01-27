-- CreateEnum
CREATE TYPE "PagingChannel" AS ENUM ('SLACK', 'EMAIL', 'SMS', 'VOICE');

-- CreateEnum
CREATE TYPE "PagingAttemptStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "OnCallRotation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallRotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallLayer" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "handoffIntervalHours" INTEGER NOT NULL DEFAULT 168,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "restrictionsJson" JSONB,
    "isShadow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallParticipant" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnCallParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallOverride" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnCallOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagingPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagingStep" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "channels" "PagingChannel"[],
    "delaySeconds" INTEGER NOT NULL DEFAULT 0,
    "repeatCount" INTEGER NOT NULL DEFAULT 0,
    "repeatIntervalSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagingAttempt" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "alertGroupId" TEXT NOT NULL,
    "channel" "PagingChannel" NOT NULL,
    "status" "PagingAttemptStatus" NOT NULL,
    "targetUserId" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "ackToken" TEXT,
    "ackedAt" TIMESTAMP(3),
    "ackSource" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PagingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnCallRotation_workspaceId_idx" ON "OnCallRotation"("workspaceId");
CREATE INDEX "OnCallRotation_workspaceId_updatedAt_idx" ON "OnCallRotation"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "OnCallLayer_rotationId_idx" ON "OnCallLayer"("rotationId");
CREATE INDEX "OnCallLayer_rotationId_order_idx" ON "OnCallLayer"("rotationId", "order");

-- CreateIndex
CREATE INDEX "OnCallParticipant_layerId_idx" ON "OnCallParticipant"("layerId");
CREATE INDEX "OnCallParticipant_userId_idx" ON "OnCallParticipant"("userId");
CREATE INDEX "OnCallParticipant_layerId_position_idx" ON "OnCallParticipant"("layerId", "position");

-- CreateIndex
CREATE INDEX "OnCallOverride_rotationId_idx" ON "OnCallOverride"("rotationId");
CREATE INDEX "OnCallOverride_userId_idx" ON "OnCallOverride"("userId");
CREATE INDEX "OnCallOverride_rotationId_startsAt_idx" ON "OnCallOverride"("rotationId", "startsAt");

-- CreateIndex
CREATE INDEX "PagingPolicy_workspaceId_idx" ON "PagingPolicy"("workspaceId");
CREATE INDEX "PagingPolicy_rotationId_idx" ON "PagingPolicy"("rotationId");

-- CreateIndex
CREATE INDEX "PagingStep_policyId_idx" ON "PagingStep"("policyId");
CREATE INDEX "PagingStep_policyId_order_idx" ON "PagingStep"("policyId", "order");

-- CreateIndex
CREATE INDEX "PagingAttempt_policyId_idx" ON "PagingAttempt"("policyId");
CREATE INDEX "PagingAttempt_alertGroupId_idx" ON "PagingAttempt"("alertGroupId");
CREATE INDEX "PagingAttempt_targetUserId_idx" ON "PagingAttempt"("targetUserId");
CREATE INDEX "PagingAttempt_policyId_alertGroupId_idx" ON "PagingAttempt"("policyId", "alertGroupId");

-- AddForeignKey
ALTER TABLE "OnCallRotation" ADD CONSTRAINT "OnCallRotation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OnCallRotation" ADD CONSTRAINT "OnCallRotation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallLayer" ADD CONSTRAINT "OnCallLayer_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "OnCallRotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallParticipant" ADD CONSTRAINT "OnCallParticipant_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "OnCallLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OnCallParticipant" ADD CONSTRAINT "OnCallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "OnCallRotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagingPolicy" ADD CONSTRAINT "PagingPolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PagingPolicy" ADD CONSTRAINT "PagingPolicy_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "OnCallRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagingStep" ADD CONSTRAINT "PagingStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PagingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagingAttempt" ADD CONSTRAINT "PagingAttempt_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PagingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PagingAttempt" ADD CONSTRAINT "PagingAttempt_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PagingAttempt" ADD CONSTRAINT "PagingAttempt_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

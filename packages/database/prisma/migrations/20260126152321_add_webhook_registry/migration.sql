-- CreateEnum
CREATE TYPE "PostMortemStatus" AS ENUM ('DRAFT', 'REVIEWING', 'PUBLISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IncidentTimelineEventType" ADD VALUE 'POST_MORTEM_CREATED';
ALTER TYPE "IncidentTimelineEventType" ADD VALUE 'POST_MORTEM_PUBLISHED';
ALTER TYPE "IncidentTimelineEventType" ADD VALUE 'ACTION_ITEM_CREATED';
ALTER TYPE "IncidentTimelineEventType" ADD VALUE 'COMMENT_ADDED';
ALTER TYPE "IncidentTimelineEventType" ADD VALUE 'ROLE_ASSIGNED';

-- CreateTable
CREATE TABLE "WebhookRegistry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "integrationType" "IntegrationType" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fieldMappings" JSONB,
    "severityMap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMortem" (
    "id" TEXT NOT NULL,
    "alertGroupId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "PostMortemStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "impact" TEXT,
    "rootCause" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMortem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "postMortemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "alertGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookRegistry_webhookUrl_key" ON "WebhookRegistry"("webhookUrl");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookRegistry_webhookToken_key" ON "WebhookRegistry"("webhookToken");

-- CreateIndex
CREATE INDEX "WebhookRegistry_workspaceId_idx" ON "WebhookRegistry"("workspaceId");

-- CreateIndex
CREATE INDEX "WebhookRegistry_webhookToken_idx" ON "WebhookRegistry"("webhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "PostMortem_alertGroupId_key" ON "PostMortem"("alertGroupId");

-- CreateIndex
CREATE INDEX "PostMortem_workspaceId_idx" ON "PostMortem"("workspaceId");

-- CreateIndex
CREATE INDEX "PostMortem_status_idx" ON "PostMortem"("status");

-- CreateIndex
CREATE INDEX "Comment_alertGroupId_idx" ON "Comment"("alertGroupId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- AddForeignKey
ALTER TABLE "WebhookRegistry" ADD CONSTRAINT "WebhookRegistry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMortem" ADD CONSTRAINT "PostMortem_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMortem" ADD CONSTRAINT "PostMortem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_postMortemId_fkey" FOREIGN KEY ("postMortemId") REFERENCES "PostMortem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

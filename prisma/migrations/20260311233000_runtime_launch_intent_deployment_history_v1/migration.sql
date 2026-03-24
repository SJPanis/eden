- CreateEnum
CREATE TYPE "ProjectRuntimeLaunchIntentType" AS ENUM ('INTERNAL_PREVIEW', 'EDEN_HOSTED', 'LINKED_EXTERNAL');

-- CreateEnum
CREATE TYPE "ProjectRuntimeLaunchMode" AS ENUM ('CONTROL_PLANE_ONLY', 'EDEN_MANAGED_PROMOTION', 'EXTERNAL_HANDOFF');

-- CreateEnum
CREATE TYPE "ProjectRuntimeDeploymentEventType" AS ENUM ('LAUNCH_INTENT_UPDATED', 'MANUAL_NOTE', 'PREVIEW_CHECKPOINT', 'HOSTED_CHECKPOINT', 'EXTERNAL_LINK_CHECKPOINT');

-- CreateEnum
CREATE TYPE "ProjectRuntimeDeploymentEventStatus" AS ENUM ('RECORDED', 'PLANNED', 'READY', 'BLOCKED', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectRuntimeLaunchIntent" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "intentType" "ProjectRuntimeLaunchIntentType" NOT NULL DEFAULT 'INTERNAL_PREVIEW',
    "intendedTarget" "ProjectRuntimeTarget" NOT NULL DEFAULT 'EDEN_INTERNAL',
    "launchMode" "ProjectRuntimeLaunchMode" NOT NULL DEFAULT 'CONTROL_PLANE_ONLY',
    "destinationLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeLaunchIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRuntimeDeploymentRecord" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "eventType" "ProjectRuntimeDeploymentEventType" NOT NULL,
    "eventStatus" "ProjectRuntimeDeploymentEventStatus" NOT NULL DEFAULT 'RECORDED',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRuntimeDeploymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntimeLaunchIntent_runtimeId_key" ON "ProjectRuntimeLaunchIntent"("runtimeId");

-- CreateIndex
CREATE INDEX "ProjectRuntimeLaunchIntent_intentType_createdAt_idx" ON "ProjectRuntimeLaunchIntent"("intentType", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeLaunchIntent_intendedTarget_createdAt_idx" ON "ProjectRuntimeLaunchIntent"("intendedTarget", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDeploymentRecord_runtimeId_createdAt_idx" ON "ProjectRuntimeDeploymentRecord"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDeploymentRecord_actorUserId_createdAt_idx" ON "ProjectRuntimeDeploymentRecord"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDeploymentRecord_eventType_createdAt_idx" ON "ProjectRuntimeDeploymentRecord"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDeploymentRecord_eventStatus_createdAt_idx" ON "ProjectRuntimeDeploymentRecord"("eventStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeLaunchIntent" ADD CONSTRAINT "ProjectRuntimeLaunchIntent_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDeploymentRecord" ADD CONSTRAINT "ProjectRuntimeDeploymentRecord_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDeploymentRecord" ADD CONSTRAINT "ProjectRuntimeDeploymentRecord_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

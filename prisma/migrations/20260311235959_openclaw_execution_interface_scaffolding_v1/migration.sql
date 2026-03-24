-- CreateEnum
CREATE TYPE "ProjectRuntimeDispatchStatus" AS ENUM ('QUEUED', 'READY', 'BLOCKED', 'DISPATCHED', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeDispatchMode" AS ENUM ('CONTROL_PLANE_PREFLIGHT', 'OWNER_REVIEW_GATE', 'ASYNC_WORKER_HANDOFF');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionRole" AS ENUM ('OWNER_SUPERVISOR', 'RUNTIME_LEAD', 'TOOL_WORKER', 'BROWSER_WORKER', 'QA_REVIEWER');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionSessionType" AS ENUM ('SANDBOX_TASK', 'TOOL_EXECUTION', 'BROWSER_EXECUTION', 'PROVIDER_EXECUTION');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionSessionStatus" AS ENUM ('PREPARED', 'BLOCKED', 'REVIEW_REQUIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionAdapterKind" AS ENUM ('PROVIDER', 'TOOL', 'BROWSER');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionAdapterMode" AS ENUM ('PREFLIGHT_ONLY', 'SCAFFOLD_ONLY', 'FUTURE_LIVE');

-- CreateTable
CREATE TABLE "ProjectRuntimeExecutionSession" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "sessionLabel" TEXT NOT NULL,
    "sessionType" "ProjectRuntimeExecutionSessionType" NOT NULL,
    "executionRole" "ProjectRuntimeExecutionRole" NOT NULL,
    "adapterKind" "ProjectRuntimeExecutionAdapterKind" NOT NULL,
    "adapterMode" "ProjectRuntimeExecutionAdapterMode" NOT NULL DEFAULT 'PREFLIGHT_ONLY',
    "providerKey" "EdenAiProvider",
    "status" "ProjectRuntimeExecutionSessionStatus" NOT NULL DEFAULT 'PREPARED',
    "allowedCapabilities" TEXT[],
    "ownerOnly" BOOLEAN NOT NULL DEFAULT false,
    "internalOnly" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeExecutionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRuntimeDispatchRecord" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "taskId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "sessionId" TEXT,
    "providerKey" "EdenAiProvider",
    "modelLabel" TEXT,
    "dispatchStatus" "ProjectRuntimeDispatchStatus" NOT NULL DEFAULT 'QUEUED',
    "dispatchMode" "ProjectRuntimeDispatchMode" NOT NULL DEFAULT 'CONTROL_PLANE_PREFLIGHT',
    "executionRole" "ProjectRuntimeExecutionRole" NOT NULL,
    "adapterKind" "ProjectRuntimeExecutionAdapterKind" NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "adapterMode" "ProjectRuntimeExecutionAdapterMode" NOT NULL DEFAULT 'PREFLIGHT_ONLY',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "dispatchReason" TEXT,
    "blockingReason" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "resultPayload" JSONB,
    "preparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeDispatchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRuntimeExecutionSession_runtimeId_createdAt_idx" ON "ProjectRuntimeExecutionSession"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeExecutionSession_status_createdAt_idx" ON "ProjectRuntimeExecutionSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeExecutionSession_executionRole_createdAt_idx" ON "ProjectRuntimeExecutionSession"("executionRole", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDispatchRecord_runtimeId_createdAt_idx" ON "ProjectRuntimeDispatchRecord"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDispatchRecord_taskId_createdAt_idx" ON "ProjectRuntimeDispatchRecord"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDispatchRecord_dispatchStatus_createdAt_idx" ON "ProjectRuntimeDispatchRecord"("dispatchStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDispatchRecord_adapterKind_createdAt_idx" ON "ProjectRuntimeDispatchRecord"("adapterKind", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeExecutionSession" ADD CONSTRAINT "ProjectRuntimeExecutionSession_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeExecutionSession" ADD CONSTRAINT "ProjectRuntimeExecutionSession_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDispatchRecord" ADD CONSTRAINT "ProjectRuntimeDispatchRecord_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDispatchRecord" ADD CONSTRAINT "ProjectRuntimeDispatchRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectRuntimeTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDispatchRecord" ADD CONSTRAINT "ProjectRuntimeDispatchRecord_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDispatchRecord" ADD CONSTRAINT "ProjectRuntimeDispatchRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProjectRuntimeExecutionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;


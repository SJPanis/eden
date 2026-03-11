-- CreateEnum
CREATE TYPE "ProjectRuntimeTaskType" AS ENUM ('IMPLEMENTATION_PLAN', 'ANALYSIS', 'QA_REVIEW');

-- CreateEnum
CREATE TYPE "ProjectRuntimeTaskStatus" AS ENUM ('PLANNING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectRuntimeTask" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "taskType" "ProjectRuntimeTaskType" NOT NULL DEFAULT 'IMPLEMENTATION_PLAN',
    "status" "ProjectRuntimeTaskStatus" NOT NULL DEFAULT 'PLANNING',
    "executionMode" TEXT NOT NULL DEFAULT 'synchronous_sandbox_v1',
    "plannerSummary" TEXT,
    "plannerPayload" JSONB,
    "workerSummary" TEXT,
    "workerPayload" JSONB,
    "outputSummary" TEXT,
    "outputLines" TEXT[],
    "failureDetail" TEXT,
    "plannerCompletedAt" TIMESTAMP(3),
    "workerCompletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRuntimeTask_runtimeId_createdAt_idx" ON "ProjectRuntimeTask"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeTask_status_createdAt_idx" ON "ProjectRuntimeTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeTask_taskType_createdAt_idx" ON "ProjectRuntimeTask"("taskType", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeTask" ADD CONSTRAINT "ProjectRuntimeTask_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeTask" ADD CONSTRAINT "ProjectRuntimeTask_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

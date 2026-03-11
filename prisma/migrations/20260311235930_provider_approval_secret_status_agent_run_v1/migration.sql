-- CreateEnum
CREATE TYPE "ProjectRuntimeProviderApprovalStatus" AS ENUM ('REVIEW_REQUIRED', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeAgentActionType" AS ENUM ('PROVIDER_PREFLIGHT', 'SANDBOX_TEST', 'QA_VALIDATION', 'IMPLEMENTATION_REVIEW');

-- CreateEnum
CREATE TYPE "ProjectRuntimeAgentRunStatus" AS ENUM ('PREFLIGHT_BLOCKED', 'PREPARED', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeTaskResultType" AS ENUM ('SANDBOX_PLAN', 'PROVIDER_PREFLIGHT', 'QA_RESULT', 'EXECUTION_REVIEW');

-- CreateEnum
CREATE TYPE "ProjectRuntimeTaskResultStatus" AS ENUM ('PASS', 'FAIL', 'REVIEW_NEEDED', 'INFO');

-- AlterEnum
ALTER TYPE "ProjectRuntimeSecretStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "ProjectRuntimeSecretBoundary" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "statusDetail" TEXT;

-- AlterTable
ALTER TABLE "ProjectRuntimeTask" ADD COLUMN     "modelLabel" TEXT,
ADD COLUMN     "providerKey" "EdenAiProvider",
ADD COLUMN     "requestedActionType" "ProjectRuntimeAgentActionType",
ADD COLUMN     "resultPayload" JSONB,
ADD COLUMN     "resultStatus" "ProjectRuntimeTaskResultStatus",
ADD COLUMN     "resultSummary" TEXT,
ADD COLUMN     "resultType" "ProjectRuntimeTaskResultType";

-- CreateTable
CREATE TABLE "ProjectRuntimeProviderApproval" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "providerKey" "EdenAiProvider" NOT NULL,
    "approvalStatus" "ProjectRuntimeProviderApprovalStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "modelScope" TEXT[],
    "capabilityScope" TEXT[],
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeProviderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRuntimeAgentRun" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "taskId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "providerKey" "EdenAiProvider",
    "modelLabel" TEXT,
    "executionTargetLabel" TEXT,
    "requestedActionType" "ProjectRuntimeAgentActionType" NOT NULL,
    "runStatus" "ProjectRuntimeAgentRunStatus" NOT NULL DEFAULT 'PREPARED',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "resultPayload" JSONB,
    "errorDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectRuntimeAgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRuntimeProviderApproval_runtimeId_createdAt_idx" ON "ProjectRuntimeProviderApproval"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeProviderApproval_providerKey_createdAt_idx" ON "ProjectRuntimeProviderApproval"("providerKey", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeProviderApproval_approvalStatus_createdAt_idx" ON "ProjectRuntimeProviderApproval"("approvalStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntimeProviderApproval_runtimeId_providerKey_key" ON "ProjectRuntimeProviderApproval"("runtimeId", "providerKey");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAgentRun_runtimeId_createdAt_idx" ON "ProjectRuntimeAgentRun"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAgentRun_taskId_createdAt_idx" ON "ProjectRuntimeAgentRun"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAgentRun_runStatus_createdAt_idx" ON "ProjectRuntimeAgentRun"("runStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAgentRun_providerKey_createdAt_idx" ON "ProjectRuntimeAgentRun"("providerKey", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeProviderApproval" ADD CONSTRAINT "ProjectRuntimeProviderApproval_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeProviderApproval" ADD CONSTRAINT "ProjectRuntimeProviderApproval_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeAgentRun" ADD CONSTRAINT "ProjectRuntimeAgentRun_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeAgentRun" ADD CONSTRAINT "ProjectRuntimeAgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectRuntimeTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeAgentRun" ADD CONSTRAINT "ProjectRuntimeAgentRun_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

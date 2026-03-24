- CreateEnum
CREATE TYPE "EdenAiProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "ProjectRuntimeConfigScope" AS ENUM ('OWNER_INTERNAL', 'BUSINESS_RUNTIME', 'PUBLIC_RUNTIME');

-- CreateEnum
CREATE TYPE "ProjectRuntimeExecutionMode" AS ENUM ('CONTROL_PLANE_ONLY', 'SANDBOX_TASK_RUNNER_V1', 'FUTURE_RUNTIME_AGENT', 'EXTERNAL_RUNTIME_HANDOFF');

-- CreateEnum
CREATE TYPE "ProjectRuntimeProviderPolicyMode" AS ENUM ('EDEN_APPROVED_ONLY', 'RUNTIME_ALLOWLIST', 'OWNER_APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeSecretType" AS ENUM ('PROVIDER_API_KEY', 'WEBHOOK_SECRET', 'DATABASE_URL', 'SERVICE_TOKEN', 'ENVIRONMENT_GROUP');

-- CreateEnum
CREATE TYPE "ProjectRuntimeSecretScope" AS ENUM ('RUNTIME_ONLY', 'BUSINESS_SHARED', 'OWNER_INTERNAL');

-- CreateEnum
CREATE TYPE "ProjectRuntimeSecretVisibilityPolicy" AS ENUM ('STATUS_ONLY', 'OWNER_METADATA_ONLY', 'RUNTIME_BOUNDARY_ONLY');

-- CreateEnum
CREATE TYPE "ProjectRuntimeSecretStatus" AS ENUM ('CONFIGURED', 'MISSING', 'RESERVED');

-- CreateTable
CREATE TABLE "ProjectRuntimeConfigPolicy" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "configScope" "ProjectRuntimeConfigScope" NOT NULL DEFAULT 'BUSINESS_RUNTIME',
    "executionMode" "ProjectRuntimeExecutionMode" NOT NULL DEFAULT 'CONTROL_PLANE_ONLY',
    "providerPolicyMode" "ProjectRuntimeProviderPolicyMode" NOT NULL DEFAULT 'EDEN_APPROVED_ONLY',
    "allowedProviders" "EdenAiProvider"[],
    "defaultProvider" "EdenAiProvider",
    "maxTaskBudgetLeaves" INTEGER,
    "monthlyBudgetLeaves" INTEGER,
    "modelPolicySummary" TEXT,
    "secretPolicyReference" TEXT,
    "notes" TEXT,
    "ownerOnlyEnforced" BOOLEAN NOT NULL DEFAULT false,
    "internalOnlyEnforced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeConfigPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRuntimeSecretBoundary" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "secretType" "ProjectRuntimeSecretType" NOT NULL,
    "secretScope" "ProjectRuntimeSecretScope" NOT NULL,
    "visibilityPolicy" "ProjectRuntimeSecretVisibilityPolicy" NOT NULL,
    "status" "ProjectRuntimeSecretStatus" NOT NULL DEFAULT 'MISSING',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "providerKey" "EdenAiProvider",
    "boundaryReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeSecretBoundary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntimeConfigPolicy_runtimeId_key" ON "ProjectRuntimeConfigPolicy"("runtimeId");

-- CreateIndex
CREATE INDEX "ProjectRuntimeConfigPolicy_configScope_createdAt_idx" ON "ProjectRuntimeConfigPolicy"("configScope", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeConfigPolicy_executionMode_createdAt_idx" ON "ProjectRuntimeConfigPolicy"("executionMode", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeConfigPolicy_providerPolicyMode_createdAt_idx" ON "ProjectRuntimeConfigPolicy"("providerPolicyMode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntimeSecretBoundary_runtimeId_label_key" ON "ProjectRuntimeSecretBoundary"("runtimeId", "label");

-- CreateIndex
CREATE INDEX "ProjectRuntimeSecretBoundary_runtimeId_createdAt_idx" ON "ProjectRuntimeSecretBoundary"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeSecretBoundary_secretType_createdAt_idx" ON "ProjectRuntimeSecretBoundary"("secretType", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeSecretBoundary_status_createdAt_idx" ON "ProjectRuntimeSecretBoundary"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeConfigPolicy" ADD CONSTRAINT "ProjectRuntimeConfigPolicy_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeSecretBoundary" ADD CONSTRAINT "ProjectRuntimeSecretBoundary_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

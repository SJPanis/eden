-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EdenRole" AS ENUM ('CONSUMER', 'BUSINESS', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'REVIEW', 'FROZEN');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BusinessVisibility" AS ENUM ('PRIVATE_PREVIEW', 'INTERNAL_TESTING', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('DRAFT', 'TESTING', 'READY', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CreditsTopUpPaymentStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentEventLogStatus" AS ENUM ('INFO', 'SUCCESS', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutSettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProjectBlueprintStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "EdenRole" NOT NULL DEFAULT 'CONSUMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "edenBalanceCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthProviderAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "description" TEXT NOT NULL,
    "summary" TEXT,
    "tagline" TEXT,
    "targetAudience" TEXT,
    "monetizationModel" TEXT,
    "visibility" "BusinessVisibility" NOT NULL DEFAULT 'PRIVATE_PREVIEW',
    "teamLabel" TEXT,
    "creditBalanceCredits" INTEGER NOT NULL DEFAULT 0,
    "publishReadinessPercent" INTEGER NOT NULL DEFAULT 0,
    "nextMilestone" TEXT,
    "featuredServiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBlueprint" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "ProjectBlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "hostingBalanceLeaves" INTEGER NOT NULL DEFAULT 0,
    "hostingBalanceUpdatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAgent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "parentAgentId" TEXT,
    "branchLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAgentRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "executionKey" TEXT,
    "prompt" TEXT NOT NULL,
    "outputTitle" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "outputLines" TEXT[],
    "costLeaves" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'MEMBER',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "description" TEXT NOT NULL,
    "summary" TEXT,
    "status" "PipelineStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingModel" TEXT,
    "pricePerUse" INTEGER,
    "pricingType" TEXT,
    "pricingUnit" TEXT,
    "automationSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceUsage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT,
    "executionKey" TEXT,
    "usageType" TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL,
    "grossCredits" INTEGER,
    "platformFeeCredits" INTEGER,
    "builderEarningsCredits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditsTopUpPayment" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT NOT NULL,
    "providerPaymentIntentId" TEXT,
    "userId" TEXT,
    "creditsAmount" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "CreditsTopUpPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "CreditsTopUpPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEventLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT,
    "creditsTopUpPaymentId" TEXT,
    "providerSessionId" TEXT,
    "metadata" JSONB,
    "status" "PaymentEventLogStatus" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutSettlement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amountCredits" INTEGER NOT NULL,
    "status" "PayoutSettlementStatus" NOT NULL DEFAULT 'SETTLED',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "PayoutSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLeavesUsage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "amountCredits" INTEGER NOT NULL,
    "usageType" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalLeavesUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLeavesGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "amountCredits" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerLeavesGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" "PipelineStatus" NOT NULL DEFAULT 'DRAFT',
    "buildStarted" BOOLEAN NOT NULL DEFAULT false,
    "lastActionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEvent" (
    "id" TEXT NOT NULL,
    "pipelineRecordId" TEXT,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "projectId" TEXT,
    "previousStatus" "PipelineStatus" NOT NULL,
    "newStatus" "PipelineStatus" NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "AuthProviderAccount_userId_idx" ON "AuthProviderAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProviderAccount_provider_providerSubject_key" ON "AuthProviderAccount"("provider", "providerSubject");

-- CreateIndex
CREATE INDEX "Business_ownerUserId_idx" ON "Business"("ownerUserId");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE INDEX "Business_category_idx" ON "Business"("category");

-- CreateIndex
CREATE INDEX "ProjectBlueprint_businessId_createdAt_idx" ON "ProjectBlueprint"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectBlueprint_creatorUserId_createdAt_idx" ON "ProjectBlueprint"("creatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectBlueprint_status_createdAt_idx" ON "ProjectBlueprint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectAgent_projectId_createdAt_idx" ON "ProjectAgent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectAgent_parentAgentId_createdAt_idx" ON "ProjectAgent"("parentAgentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAgentRun_executionKey_key" ON "ProjectAgentRun"("executionKey");

-- CreateIndex
CREATE INDEX "ProjectAgentRun_projectId_createdAt_idx" ON "ProjectAgentRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectAgentRun_agentId_createdAt_idx" ON "ProjectAgentRun"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectAgentRun_userId_createdAt_idx" ON "ProjectAgentRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "Service"("businessId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceUsage_executionKey_key" ON "ServiceUsage"("executionKey");

-- CreateIndex
CREATE INDEX "ServiceUsage_serviceId_createdAt_idx" ON "ServiceUsage"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceUsage_userId_createdAt_idx" ON "ServiceUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceUsage_usageType_idx" ON "ServiceUsage"("usageType");

-- CreateIndex
CREATE UNIQUE INDEX "CreditsTopUpPayment_providerSessionId_key" ON "CreditsTopUpPayment"("providerSessionId");

-- CreateIndex
CREATE INDEX "CreditsTopUpPayment_provider_createdAt_idx" ON "CreditsTopUpPayment"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "CreditsTopUpPayment_status_createdAt_idx" ON "CreditsTopUpPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreditsTopUpPayment_userId_createdAt_idx" ON "CreditsTopUpPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_provider_createdAt_idx" ON "PaymentEventLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_eventType_createdAt_idx" ON "PaymentEventLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_providerEventId_idx" ON "PaymentEventLog"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentEventLog_providerSessionId_createdAt_idx" ON "PaymentEventLog"("providerSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_creditsTopUpPaymentId_createdAt_idx" ON "PaymentEventLog"("creditsTopUpPaymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_status_createdAt_idx" ON "PaymentEventLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutSettlement_businessId_createdAt_idx" ON "PayoutSettlement"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutSettlement_status_createdAt_idx" ON "PayoutSettlement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InternalLeavesUsage_businessId_createdAt_idx" ON "InternalLeavesUsage"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalLeavesUsage_userId_createdAt_idx" ON "InternalLeavesUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalLeavesUsage_usageType_createdAt_idx" ON "InternalLeavesUsage"("usageType", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerLeavesGrant_userId_createdAt_idx" ON "OwnerLeavesGrant"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerLeavesGrant_grantedByUserId_createdAt_idx" ON "OwnerLeavesGrant"("grantedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PipelineRecord_status_idx" ON "PipelineRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRecord_businessId_serviceId_key" ON "PipelineRecord"("businessId", "serviceId");

-- CreateIndex
CREATE INDEX "PipelineEvent_businessId_occurredAt_idx" ON "PipelineEvent"("businessId", "occurredAt");

-- CreateIndex
CREATE INDEX "PipelineEvent_serviceId_occurredAt_idx" ON "PipelineEvent"("serviceId", "occurredAt");

-- CreateIndex
CREATE INDEX "PipelineEvent_newStatus_idx" ON "PipelineEvent"("newStatus");

-- AddForeignKey
ALTER TABLE "AuthProviderAccount" ADD CONSTRAINT "AuthProviderAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_featuredServiceId_fkey" FOREIGN KEY ("featuredServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBlueprint" ADD CONSTRAINT "ProjectBlueprint_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBlueprint" ADD CONSTRAINT "ProjectBlueprint_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAgent" ADD CONSTRAINT "ProjectAgent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAgent" ADD CONSTRAINT "ProjectAgent_parentAgentId_fkey" FOREIGN KEY ("parentAgentId") REFERENCES "ProjectAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAgentRun" ADD CONSTRAINT "ProjectAgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAgentRun" ADD CONSTRAINT "ProjectAgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ProjectAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAgentRun" ADD CONSTRAINT "ProjectAgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditsTopUpPayment" ADD CONSTRAINT "CreditsTopUpPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEventLog" ADD CONSTRAINT "PaymentEventLog_creditsTopUpPaymentId_fkey" FOREIGN KEY ("creditsTopUpPaymentId") REFERENCES "CreditsTopUpPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutSettlement" ADD CONSTRAINT "PayoutSettlement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLeavesUsage" ADD CONSTRAINT "InternalLeavesUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLeavesUsage" ADD CONSTRAINT "InternalLeavesUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLeavesGrant" ADD CONSTRAINT "OwnerLeavesGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLeavesGrant" ADD CONSTRAINT "OwnerLeavesGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRecord" ADD CONSTRAINT "PipelineRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRecord" ADD CONSTRAINT "PipelineRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_pipelineRecordId_fkey" FOREIGN KEY ("pipelineRecordId") REFERENCES "PipelineRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

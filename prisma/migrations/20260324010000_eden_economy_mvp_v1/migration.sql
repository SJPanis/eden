-- Migration: eden_economy_mvp_v1
-- Adds EdenWallet, EdenTransaction, ContributionRecord, ContributionPeriod,
-- ContributionAllocation and supporting enums.
-- Additive only — no existing tables are modified.

-- CreateEnum
CREATE TYPE "EdenTransactionType" AS ENUM (
  'LEAFS_TOPUP',
  'LEAFS_DEDUCTION',
  'LEAFS_GRANT',
  'SERVICE_PURCHASE',
  'BUILDER_PAYOUT',
  'CONTRIBUTION_BONUS',
  'PLATFORM_FEE',
  'PROVIDER_RESERVE',
  'CONTRIBUTION_POOL',
  'MANUAL_ADJUSTMENT'
);

-- CreateEnum
CREATE TYPE "EdenTransactionStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED'
);

-- CreateEnum
CREATE TYPE "EdenContributionType" AS ENUM (
  'CODE_IMPROVEMENT',
  'DESIGN_IMPROVEMENT',
  'BUG_FIX',
  'DOCS_IMPROVEMENT',
  'BUSINESS_TEMPLATE',
  'RUNTIME_IMPROVEMENT',
  'FEEDBACK_ADOPTED',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "EdenContributionStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "EdenContributionPeriodStatus" AS ENUM (
  'OPEN',
  'CLOSED',
  'DISTRIBUTED'
);

-- CreateTable: EdenWallet
CREATE TABLE "EdenWallet" (
    "id"                  TEXT NOT NULL,
    "userId"              TEXT NOT NULL,
    "leafsBalance"        INTEGER NOT NULL DEFAULT 0,
    "lockedLeafs"         INTEGER NOT NULL DEFAULT 0,
    "totalPurchasedLeafs" INTEGER NOT NULL DEFAULT 0,
    "totalGrantedLeafs"   INTEGER NOT NULL DEFAULT 0,
    "totalSpentLeafs"     INTEGER NOT NULL DEFAULT 0,
    "contributionScore"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdenWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EdenTransaction
CREATE TABLE "EdenTransaction" (
    "id"                    TEXT NOT NULL,
    "walletId"              TEXT NOT NULL,
    "actorUserId"           TEXT NOT NULL,
    "businessId"            TEXT,
    "runtimeId"             TEXT,
    "transactionType"       "EdenTransactionType" NOT NULL,
    "status"                "EdenTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "cashAmountCents"       INTEGER,
    "leafsAmount"           INTEGER,
    "builderEarningsLeafs"  INTEGER,
    "platformFeeLeafs"      INTEGER,
    "providerReserveLeafs"  INTEGER,
    "contributionPoolLeafs" INTEGER,
    "description"           TEXT NOT NULL,
    "metadata"              JSONB,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContributionRecord
CREATE TABLE "ContributionRecord" (
    "id"                       TEXT NOT NULL,
    "contributorUserId"        TEXT NOT NULL,
    "reviewedByUserId"         TEXT,
    "runtimeId"                TEXT,
    "businessId"               TEXT,
    "contributionType"         "EdenContributionType" NOT NULL,
    "title"                    TEXT NOT NULL,
    "summary"                  TEXT NOT NULL,
    "artifactRef"              TEXT,
    "evidenceRef"              TEXT,
    "status"                   "EdenContributionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "approvedAt"               TIMESTAMP(3),
    "contributionScoreAwarded" INTEGER,
    "leavesBonusAwarded"       INTEGER,
    "notes"                    TEXT,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContributionPeriod
CREATE TABLE "ContributionPeriod" (
    "id"            TEXT NOT NULL,
    "label"         TEXT NOT NULL,
    "startDate"     TIMESTAMP(3) NOT NULL,
    "endDate"       TIMESTAMP(3) NOT NULL,
    "poolLeafs"     INTEGER NOT NULL DEFAULT 0,
    "poolCashCents" INTEGER NOT NULL DEFAULT 0,
    "status"        "EdenContributionPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContributionAllocation
CREATE TABLE "ContributionAllocation" (
    "id"                 TEXT NOT NULL,
    "periodId"           TEXT NOT NULL,
    "contributionId"     TEXT NOT NULL,
    "contributorUserId"  TEXT NOT NULL,
    "scoreWeight"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentOfPool"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leafsGranted"       INTEGER NOT NULL DEFAULT 0,
    "cashAllocatedCents" INTEGER NOT NULL DEFAULT 0,
    "status"             "EdenTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionAllocation_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "EdenWallet_userId_key" ON "EdenWallet"("userId");

-- Indexes: EdenWallet
CREATE INDEX "EdenWallet_userId_idx" ON "EdenWallet"("userId");

-- Indexes: EdenTransaction
CREATE INDEX "EdenTransaction_walletId_createdAt_idx" ON "EdenTransaction"("walletId", "createdAt");
CREATE INDEX "EdenTransaction_actorUserId_createdAt_idx" ON "EdenTransaction"("actorUserId", "createdAt");
CREATE INDEX "EdenTransaction_transactionType_createdAt_idx" ON "EdenTransaction"("transactionType", "createdAt");
CREATE INDEX "EdenTransaction_status_createdAt_idx" ON "EdenTransaction"("status", "createdAt");
CREATE INDEX "EdenTransaction_businessId_createdAt_idx" ON "EdenTransaction"("businessId", "createdAt");

-- Indexes: ContributionRecord
CREATE INDEX "ContributionRecord_contributorUserId_createdAt_idx" ON "ContributionRecord"("contributorUserId", "createdAt");
CREATE INDEX "ContributionRecord_status_createdAt_idx" ON "ContributionRecord"("status", "createdAt");
CREATE INDEX "ContributionRecord_contributionType_createdAt_idx" ON "ContributionRecord"("contributionType", "createdAt");

-- Indexes: ContributionPeriod
CREATE INDEX "ContributionPeriod_status_startDate_idx" ON "ContributionPeriod"("status", "startDate");

-- Indexes: ContributionAllocation
CREATE INDEX "ContributionAllocation_periodId_contributorUserId_idx" ON "ContributionAllocation"("periodId", "contributorUserId");
CREATE INDEX "ContributionAllocation_contributorUserId_createdAt_idx" ON "ContributionAllocation"("contributorUserId", "createdAt");
CREATE INDEX "ContributionAllocation_status_idx" ON "ContributionAllocation"("status");

-- Foreign keys: EdenWallet
ALTER TABLE "EdenWallet" ADD CONSTRAINT "EdenWallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: EdenTransaction
ALTER TABLE "EdenTransaction" ADD CONSTRAINT "EdenTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "EdenWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EdenTransaction" ADD CONSTRAINT "EdenTransaction_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EdenTransaction" ADD CONSTRAINT "EdenTransaction_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EdenTransaction" ADD CONSTRAINT "EdenTransaction_runtimeId_fkey"
  FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: ContributionRecord
ALTER TABLE "ContributionRecord" ADD CONSTRAINT "ContributionRecord_contributorUserId_fkey"
  FOREIGN KEY ("contributorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionRecord" ADD CONSTRAINT "ContributionRecord_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContributionRecord" ADD CONSTRAINT "ContributionRecord_runtimeId_fkey"
  FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContributionRecord" ADD CONSTRAINT "ContributionRecord_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: ContributionAllocation
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "ContributionPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_contributionId_fkey"
  FOREIGN KEY ("contributionId") REFERENCES "ContributionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "ContributionAllocation_contributorUserId_fkey"
  FOREIGN KEY ("contributorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

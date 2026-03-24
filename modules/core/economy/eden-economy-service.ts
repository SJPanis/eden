import "server-only";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type { Prisma } from "@prisma/client";

// ─── Fee split constants ───────────────────────────────────────────────────
// Percentages must sum to 100. Adjust via owner policy later.
export const EDEN_FEE_SPLIT = {
  builderPercent: 70,
  platformPercent: 15,
  providerReservePercent: 10,
  contributionPoolPercent: 5,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────

export type EdenWalletRecord = {
  id: string;
  userId: string;
  leafsBalance: number;
  lockedLeafs: number;
  totalPurchasedLeafs: number;
  totalGrantedLeafs: number;
  totalSpentLeafs: number;
  contributionScore: number;
};

export type EdenTransactionRecord = {
  id: string;
  transactionType: string;
  transactionTypeLabel: string;
  status: string;
  statusLabel: string;
  leafsAmount: number | null;
  cashAmountCents: number | null;
  description: string;
  createdAtLabel: string;
  feeSplit?: {
    builderEarningsLeafs: number | null;
    platformFeeLeafs: number | null;
    providerReserveLeafs: number | null;
    contributionPoolLeafs: number | null;
  } | null;
};

export type EdenContributionRecord = {
  id: string;
  contributionType: string;
  contributionTypeLabel: string;
  title: string;
  summary: string;
  status: string;
  statusLabel: string;
  contributionScoreAwarded: number | null;
  leavesBonusAwarded: number | null;
  createdAtLabel: string;
  approvedAtLabel: string | null;
};

// ─── Wallet ───────────────────────────────────────────────────────────────

/**
 * Get or create the wallet for a given user.
 * Safe to call repeatedly — idempotent.
 */
export async function getOrCreateWallet(userId: string): Promise<EdenWalletRecord> {
  const prisma = getPrismaClient();

  const wallet = await prisma.edenWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return mapWallet(wallet);
}

export async function loadWalletForUser(userId: string): Promise<EdenWalletRecord | null> {
  const prisma = getPrismaClient();
  const wallet = await prisma.edenWallet.findUnique({ where: { userId } });
  return wallet ? mapWallet(wallet) : null;
}

// ─── Transactions ─────────────────────────────────────────────────────────

/**
 * Record a Leaf's top-up. Increments wallet balance and totalPurchasedLeafs.
 */
export async function recordLeafsTopup(input: {
  userId: string;
  leafsAmount: number;
  cashAmountCents: number;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ walletRecord: EdenWalletRecord; transactionId: string }> {
  const prisma = getPrismaClient();

  const wallet = await prisma.edenWallet.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId },
    update: {},
  });

  const [tx, updatedWallet] = await prisma.$transaction([
    prisma.edenTransaction.create({
      data: {
        walletId: wallet.id,
        actorUserId: input.userId,
        transactionType: "LEAFS_TOPUP",
        status: "COMPLETED",
        cashAmountCents: input.cashAmountCents,
        leafsAmount: input.leafsAmount,
        description: input.description,
        metadata: input.metadata ?? undefined,
      },
    }),
    prisma.edenWallet.update({
      where: { id: wallet.id },
      data: {
        leafsBalance: { increment: input.leafsAmount },
        totalPurchasedLeafs: { increment: input.leafsAmount },
      },
    }),
  ]);

  return { walletRecord: mapWallet(updatedWallet), transactionId: tx.id };
}

/**
 * Deduct Leaf's for a service or runtime action.
 * Returns false if the wallet does not have sufficient balance.
 */
export async function deductLeafs(input: {
  userId: string;
  leafsAmount: number;
  description: string;
  businessId?: string;
  runtimeId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ ok: true; walletRecord: EdenWalletRecord; transactionId: string } | { ok: false; error: string }> {
  const prisma = getPrismaClient();

  const wallet = await prisma.edenWallet.findUnique({ where: { userId: input.userId } });

  if (!wallet) {
    return { ok: false, error: "No wallet found. The user must top up Leaf's first." };
  }

  const available = wallet.leafsBalance - wallet.lockedLeafs;
  if (available < input.leafsAmount) {
    return {
      ok: false,
      error: `Insufficient Leaf's balance. Required: ${input.leafsAmount}, available: ${available}.`,
    };
  }

  const [tx, updatedWallet] = await prisma.$transaction([
    prisma.edenTransaction.create({
      data: {
        walletId: wallet.id,
        actorUserId: input.userId,
        transactionType: "LEAFS_DEDUCTION",
        status: "COMPLETED",
        leafsAmount: input.leafsAmount,
        businessId: input.businessId ?? null,
        runtimeId: input.runtimeId ?? null,
        description: input.description,
        metadata: input.metadata ?? undefined,
      },
    }),
    prisma.edenWallet.update({
      where: { id: wallet.id },
      data: {
        leafsBalance: { decrement: input.leafsAmount },
        totalSpentLeafs: { increment: input.leafsAmount },
      },
    }),
  ]);

  return { ok: true, walletRecord: mapWallet(updatedWallet), transactionId: tx.id };
}

/**
 * Record a service purchase with the 4-bucket fee split.
 * builder 70% / platform 15% / provider reserve 10% / contribution pool 5%
 */
export async function recordServicePurchase(input: {
  buyerUserId: string;
  leafsAmount: number;
  businessId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ ok: true; transactionId: string; split: ReturnType<typeof computeFeeSplit> } | { ok: false; error: string }> {
  const deductResult = await deductLeafs({
    userId: input.buyerUserId,
    leafsAmount: input.leafsAmount,
    description: input.description,
    businessId: input.businessId,
    metadata: input.metadata,
  });

  if (!deductResult.ok) return deductResult;

  const split = computeFeeSplit(input.leafsAmount);
  const prisma = getPrismaClient();

  const wallet = await prisma.edenWallet.findUnique({ where: { userId: input.buyerUserId } });
  if (!wallet) return { ok: false, error: "Wallet not found after deduction." };

  const tx = await prisma.edenTransaction.create({
    data: {
      walletId: wallet.id,
      actorUserId: input.buyerUserId,
      transactionType: "SERVICE_PURCHASE",
      status: "COMPLETED",
      leafsAmount: input.leafsAmount,
      builderEarningsLeafs: split.builderLeafs,
      platformFeeLeafs: split.platformLeafs,
      providerReserveLeafs: split.providerReserveLeafs,
      contributionPoolLeafs: split.contributionPoolLeafs,
      businessId: input.businessId,
      description: input.description,
      metadata: input.metadata ?? undefined,
    },
  });

  return { ok: true, transactionId: tx.id, split };
}

/**
 * Grant Leaf's to a user (owner action).
 */
export async function grantLeafs(input: {
  recipientUserId: string;
  grantorUserId: string;
  leafsAmount: number;
  description: string;
}): Promise<{ walletRecord: EdenWalletRecord; transactionId: string }> {
  const prisma = getPrismaClient();

  const wallet = await prisma.edenWallet.upsert({
    where: { userId: input.recipientUserId },
    create: { userId: input.recipientUserId },
    update: {},
  });

  const [tx, updatedWallet] = await prisma.$transaction([
    prisma.edenTransaction.create({
      data: {
        walletId: wallet.id,
        actorUserId: input.grantorUserId,
        transactionType: "LEAFS_GRANT",
        status: "COMPLETED",
        leafsAmount: input.leafsAmount,
        description: input.description,
      },
    }),
    prisma.edenWallet.update({
      where: { id: wallet.id },
      data: {
        leafsBalance: { increment: input.leafsAmount },
        totalGrantedLeafs: { increment: input.leafsAmount },
      },
    }),
  ]);

  return { walletRecord: mapWallet(updatedWallet), transactionId: tx.id };
}

export async function loadRecentTransactions(
  userId: string,
  limit = 20,
): Promise<EdenTransactionRecord[]> {
  const prisma = getPrismaClient();
  const wallet = await prisma.edenWallet.findUnique({ where: { userId } });
  if (!wallet) return [];

  const txs = await prisma.edenTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return txs.map(mapTransaction);
}

// ─── Contributions ────────────────────────────────────────────────────────

export async function submitContribution(input: {
  contributorUserId: string;
  contributionType: Prisma.ContributionRecordCreateInput["contributionType"];
  title: string;
  summary: string;
  artifactRef?: string;
  evidenceRef?: string;
  runtimeId?: string;
  businessId?: string;
}): Promise<EdenContributionRecord> {
  const prisma = getPrismaClient();

  const record = await prisma.contributionRecord.create({
    data: {
      contributorUserId: input.contributorUserId,
      contributionType: input.contributionType,
      title: input.title,
      summary: input.summary,
      artifactRef: input.artifactRef ?? null,
      evidenceRef: input.evidenceRef ?? null,
      runtimeId: input.runtimeId ?? null,
      businessId: input.businessId ?? null,
    },
  });

  return mapContribution(record);
}

export async function approveContribution(input: {
  contributionId: string;
  reviewerUserId: string;
  scoreAwarded: number;
  leavesBonusAwarded?: number;
  notes?: string;
}): Promise<EdenContributionRecord> {
  const prisma = getPrismaClient();

  const record = await prisma.contributionRecord.update({
    where: { id: input.contributionId },
    data: {
      status: "APPROVED",
      reviewedByUserId: input.reviewerUserId,
      approvedAt: new Date(),
      contributionScoreAwarded: input.scoreAwarded,
      leavesBonusAwarded: input.leavesBonusAwarded ?? null,
      notes: input.notes ?? null,
    },
  });

  // Update contributor wallet score
  const wallet = await prisma.edenWallet.upsert({
    where: { userId: record.contributorUserId },
    create: { userId: record.contributorUserId },
    update: {},
  });

  await prisma.edenWallet.update({
    where: { id: wallet.id },
    data: { contributionScore: { increment: input.scoreAwarded } },
  });

  // Issue Leaf's bonus if set
  if (input.leavesBonusAwarded && input.leavesBonusAwarded > 0) {
    await grantLeafs({
      recipientUserId: record.contributorUserId,
      grantorUserId: input.reviewerUserId,
      leafsAmount: input.leavesBonusAwarded,
      description: `Contribution bonus: ${record.title}`,
    });
  }

  return mapContribution(record);
}

export async function loadContributionsForUser(
  userId: string,
  limit = 20,
): Promise<EdenContributionRecord[]> {
  const prisma = getPrismaClient();
  const records = await prisma.contributionRecord.findMany({
    where: { contributorUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return records.map(mapContribution);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function computeFeeSplit(totalLeafs: number) {
  const builderLeafs = Math.floor(totalLeafs * EDEN_FEE_SPLIT.builderPercent / 100);
  const platformLeafs = Math.floor(totalLeafs * EDEN_FEE_SPLIT.platformPercent / 100);
  const providerReserveLeafs = Math.floor(totalLeafs * EDEN_FEE_SPLIT.providerReservePercent / 100);
  // Contribution pool gets the remainder to avoid rounding drift
  const contributionPoolLeafs = totalLeafs - builderLeafs - platformLeafs - providerReserveLeafs;
  return { builderLeafs, platformLeafs, providerReserveLeafs, contributionPoolLeafs };
}

function mapWallet(w: {
  id: string;
  userId: string;
  leafsBalance: number;
  lockedLeafs: number;
  totalPurchasedLeafs: number;
  totalGrantedLeafs: number;
  totalSpentLeafs: number;
  contributionScore: number;
}): EdenWalletRecord {
  return {
    id: w.id,
    userId: w.userId,
    leafsBalance: w.leafsBalance,
    lockedLeafs: w.lockedLeafs,
    totalPurchasedLeafs: w.totalPurchasedLeafs,
    totalGrantedLeafs: w.totalGrantedLeafs,
    totalSpentLeafs: w.totalSpentLeafs,
    contributionScore: w.contributionScore,
  };
}

function mapTransaction(tx: {
  id: string;
  transactionType: string;
  status: string;
  leafsAmount: number | null;
  cashAmountCents: number | null;
  description: string;
  createdAt: Date;
  builderEarningsLeafs: number | null;
  platformFeeLeafs: number | null;
  providerReserveLeafs: number | null;
  contributionPoolLeafs: number | null;
}): EdenTransactionRecord {
  return {
    id: tx.id,
    transactionType: tx.transactionType,
    transactionTypeLabel: formatTransactionTypeLabel(tx.transactionType),
    status: tx.status,
    statusLabel: formatTransactionStatusLabel(tx.status),
    leafsAmount: tx.leafsAmount,
    cashAmountCents: tx.cashAmountCents,
    description: tx.description,
    createdAtLabel: tx.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    feeSplit:
      tx.builderEarningsLeafs != null
        ? {
            builderEarningsLeafs: tx.builderEarningsLeafs,
            platformFeeLeafs: tx.platformFeeLeafs,
            providerReserveLeafs: tx.providerReserveLeafs,
            contributionPoolLeafs: tx.contributionPoolLeafs,
          }
        : null,
  };
}

function mapContribution(r: {
  id: string;
  contributionType: string;
  title: string;
  summary: string;
  status: string;
  contributionScoreAwarded: number | null;
  leavesBonusAwarded: number | null;
  createdAt: Date;
  approvedAt: Date | null;
}): EdenContributionRecord {
  return {
    id: r.id,
    contributionType: r.contributionType,
    contributionTypeLabel: formatContributionTypeLabel(r.contributionType),
    title: r.title,
    summary: r.summary,
    status: r.status,
    statusLabel: formatContributionStatusLabel(r.status),
    contributionScoreAwarded: r.contributionScoreAwarded,
    leavesBonusAwarded: r.leavesBonusAwarded,
    createdAtLabel: r.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    approvedAtLabel: r.approvedAt
      ? r.approvedAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  };
}

function formatTransactionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    LEAFS_TOPUP: "Leaf's top-up",
    LEAFS_DEDUCTION: "Leaf's deduction",
    LEAFS_GRANT: "Leaf's grant",
    SERVICE_PURCHASE: "Service purchase",
    BUILDER_PAYOUT: "Builder payout",
    CONTRIBUTION_BONUS: "Contribution bonus",
    PLATFORM_FEE: "Platform fee",
    PROVIDER_RESERVE: "Provider reserve",
    CONTRIBUTION_POOL: "Contribution pool",
    MANUAL_ADJUSTMENT: "Manual adjustment",
  };
  return map[type] ?? type;
}

function formatTransactionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    FAILED: "Failed",
    REVERSED: "Reversed",
  };
  return map[status] ?? status;
}

function formatContributionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CODE_IMPROVEMENT: "Code improvement",
    DESIGN_IMPROVEMENT: "Design improvement",
    BUG_FIX: "Bug fix",
    DOCS_IMPROVEMENT: "Docs improvement",
    BUSINESS_TEMPLATE: "Business template",
    RUNTIME_IMPROVEMENT: "Runtime improvement",
    FEEDBACK_ADOPTED: "Feedback adopted",
    OTHER: "Other",
  };
  return map[type] ?? type;
}

function formatContributionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return map[status] ?? status;
}

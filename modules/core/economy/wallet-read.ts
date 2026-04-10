import "server-only";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

// Phase 01 wallet read helper. During the EdenWallet cutover some users have a
// wallet row (populated from Stripe top-ups), some don't (their Leaf's still
// live in the legacy User.*Balance columns until the bulk migration runs).
// This helper lazily backfills a wallet from the legacy columns on first read
// so every caller can treat EdenWallet.leafsBalance as authoritative.
//
// Remove the backfill branch in the same commit that drops the legacy columns.

export type WalletReadResult = {
  leafsBalance: number;
  lockedLeafs: number;
  totalPurchasedLeafs: number;
  totalGrantedLeafs: number;
  totalSpentLeafs: number;
  contributionScore: number;
  backfilledFromLegacy: boolean;
};

export async function readOrBackfillWallet(
  userId: string,
): Promise<WalletReadResult> {
  const prisma = getPrismaClient();

  const existing = await prisma.edenWallet.findUnique({
    where: { userId },
    select: {
      leafsBalance: true,
      lockedLeafs: true,
      totalPurchasedLeafs: true,
      totalGrantedLeafs: true,
      totalSpentLeafs: true,
      contributionScore: true,
    },
  });

  if (existing) {
    return { ...existing, backfilledFromLegacy: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      edenBalanceCredits: true,
      promoBalance: true,
      realBalance: true,
      withdrawableBalance: true,
      lifetimePromoSpent: true,
      lifetimeRealSpent: true,
    },
  });

  if (!user) {
    throw new Error(`user ${userId} not found while backfilling wallet`);
  }

  const legacyTotal =
    user.edenBalanceCredits +
    user.promoBalance +
    user.realBalance +
    user.withdrawableBalance;
  const lifetimeSpent = user.lifetimePromoSpent + user.lifetimeRealSpent;

  const created = await prisma.edenWallet.create({
    data: {
      userId,
      leafsBalance: legacyTotal,
      totalSpentLeafs: lifetimeSpent,
    },
    select: {
      leafsBalance: true,
      lockedLeafs: true,
      totalPurchasedLeafs: true,
      totalGrantedLeafs: true,
      totalSpentLeafs: true,
      contributionScore: true,
    },
  });

  return { ...created, backfilledFromLegacy: true };
}

import { NextResponse } from "next/server";

import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import { readOrBackfillWallet } from "@/modules/core/economy/wallet-read";
import { loadRecentTransactions } from "@/modules/core/economy/eden-economy-service";

// GET /api/leaf/balance
// Contract: docs/PHASE_01_API_CONTRACT.md §5.1
//
// Unity-facing balance read. Uses EdenWallet as the source of truth via
// readOrBackfillWallet, which lazily creates a wallet seeded from the legacy
// User.*Balance columns on first read. Every new Unity-facing balance read
// should go through this path, not /api/wallet/balance (which is still on the
// legacy User columns until the code-cutover step in contract §15).

export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  const wallet = await readOrBackfillWallet(identity.userId);
  const recent = await loadRecentTransactions(identity.userId, 20);

  return NextResponse.json({
    ok: true,
    data: {
      balance: wallet.leafsBalance,
      locked: wallet.lockedLeafs,
      totalPurchased: wallet.totalPurchasedLeafs,
      totalGranted: wallet.totalGrantedLeafs,
      totalSpent: wallet.totalSpentLeafs,
      contributionScore: wallet.contributionScore,
      recent: recent.map((tx) => ({
        id: tx.id,
        type: tx.transactionType,
        leafsAmount: tx.leafsAmount,
        description: tx.description,
        createdAt: tx.createdAtLabel,
      })),
    },
  });
}

import "server-only";

import { cookies } from "next/headers";
import {
  mergeWalletTransactions,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import { loadOwnerLeavesGrantTransactions } from "@/modules/core/services/leaves-grant-service";
import { loadSettledCreditsTopUpTransactions } from "@/modules/core/payments/credits-topup-payment-service";

export type EdenWalletTransactionState = {
  cookieTransactions: ReturnType<typeof parseMockTransactionsCookie>;
  persistedTopUpTransactions: Awaited<ReturnType<typeof loadSettledCreditsTopUpTransactions>>;
  persistedGrantTransactions: Awaited<ReturnType<typeof loadOwnerLeavesGrantTransactions>>;
  effectiveTransactions: ReturnType<typeof mergeWalletTransactions>;
};

export async function getWalletTransactionState(): Promise<EdenWalletTransactionState> {
  const cookieStore = await cookies();
  const cookieTransactions = parseMockTransactionsCookie(
    cookieStore.get(mockTransactionsCookieName)?.value,
  );
  const [persistedTopUpTransactions, persistedGrantTransactions] = await Promise.all([
    loadSettledCreditsTopUpTransactions(),
    loadOwnerLeavesGrantTransactions(),
  ]);

  return {
    cookieTransactions,
    persistedTopUpTransactions,
    persistedGrantTransactions,
    effectiveTransactions: mergeWalletTransactions(
      cookieTransactions,
      [...persistedTopUpTransactions, ...persistedGrantTransactions],
    ),
  };
}

export async function getSimulatedTransactions() {
  const { effectiveTransactions } = await getWalletTransactionState();
  return effectiveTransactions;
}

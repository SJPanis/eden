import "server-only";

import { cookies } from "next/headers";
import {
  mergeWalletTransactions,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import { loadOwnerLeavesGrantTransactions } from "@/modules/core/services/leaves-grant-service";
import { loadSettledCreditsTopUpTransactions } from "@/modules/core/payments/credits-topup-payment-service";
import { loadPersistedServiceUsageTransactions } from "@/modules/core/services/service-usage-service";

export type EdenWalletTransactionState = {
  cookieTransactions: ReturnType<typeof parseMockTransactionsCookie>;
  persistedTopUpTransactions: Awaited<ReturnType<typeof loadSettledCreditsTopUpTransactions>>;
  persistedGrantTransactions: Awaited<ReturnType<typeof loadOwnerLeavesGrantTransactions>>;
  persistedUsageTransactions: Awaited<ReturnType<typeof loadPersistedServiceUsageTransactions>>;
  effectiveTransactions: ReturnType<typeof mergeWalletTransactions>;
};

export async function getWalletTransactionState(): Promise<EdenWalletTransactionState> {
  const cookieStore = await cookies();
  const cookieTransactions = parseMockTransactionsCookie(
    cookieStore.get(mockTransactionsCookieName)?.value,
  );
  const [persistedTopUpTransactions, persistedGrantTransactions, persistedUsageTransactions] = await Promise.all([
    loadSettledCreditsTopUpTransactions(),
    loadOwnerLeavesGrantTransactions(),
    loadPersistedServiceUsageTransactions(),
  ]);

  return {
    cookieTransactions,
    persistedTopUpTransactions,
    persistedGrantTransactions,
    persistedUsageTransactions,
    effectiveTransactions: mergeWalletTransactions(
      cookieTransactions,
      [
        ...persistedTopUpTransactions,
        ...persistedGrantTransactions,
        ...persistedUsageTransactions,
      ],
    ),
  };
}

export async function getSimulatedTransactions() {
  const { effectiveTransactions } = await getWalletTransactionState();
  return effectiveTransactions;
}

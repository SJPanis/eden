import "server-only";

import { cookies } from "next/headers";
import {
  mergeWalletTransactions,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import { loadSettledCreditsTopUpTransactions } from "@/modules/core/payments/credits-topup-payment-service";

export type EdenWalletTransactionState = {
  cookieTransactions: ReturnType<typeof parseMockTransactionsCookie>;
  persistedTopUpTransactions: Awaited<ReturnType<typeof loadSettledCreditsTopUpTransactions>>;
  effectiveTransactions: ReturnType<typeof mergeWalletTransactions>;
};

export async function getWalletTransactionState(): Promise<EdenWalletTransactionState> {
  const cookieStore = await cookies();
  const cookieTransactions = parseMockTransactionsCookie(
    cookieStore.get(mockTransactionsCookieName)?.value,
  );
  const persistedTopUpTransactions = await loadSettledCreditsTopUpTransactions();

  return {
    cookieTransactions,
    persistedTopUpTransactions,
    effectiveTransactions: mergeWalletTransactions(
      cookieTransactions,
      persistedTopUpTransactions,
    ),
  };
}

export async function getSimulatedTransactions() {
  const { effectiveTransactions } = await getWalletTransactionState();
  return effectiveTransactions;
}

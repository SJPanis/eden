import "server-only";

import { formatLeaves } from "@/modules/core/credits/eden-currency";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import type { EdenAiWalletResult } from "@/modules/eden-ai/types";

export async function inspectWallet(context: EdenAiToolContext): Promise<EdenAiWalletResult> {
  return {
    kind: "wallet",
    currentBalanceCredits: context.currentBalanceCredits,
    balanceLabel: formatLeaves(context.currentBalanceCredits),
    groundingMode: "live",
    recentTransactions: context.recentWalletTransactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amountLabel: transaction.amountLabel,
      timestampLabel: transaction.timestamp,
      kind: transaction.kind,
    })),
  };
}

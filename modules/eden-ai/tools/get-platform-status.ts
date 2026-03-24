import "server-only";

import { formatLeaves } from "@/modules/core/credits/eden-currency";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import type { EdenAiPlatformStatusResult } from "@/modules/eden-ai/types";

export async function getPlatformStatus(
  context: EdenAiToolContext,
): Promise<EdenAiPlatformStatusResult> {
  return {
    kind: "platform_status",
    title: "Eden platform status",
    summary:
      "Eden can currently inspect published discovery, wallet position, and innovator workspace state through the first operator layer.",
    groundingMode: "live",
    metrics: [
      {
        label: "Published services",
        value: `${context.discoverySnapshot.marketplaceServices.length}`,
        detail: "Published services currently visible in the Eden consumer marketplace.",
      },
      {
        label: "Published businesses",
        value: `${context.discoverySnapshot.marketplaceBusinesses.length}`,
        detail: "Businesses with at least one service currently visible to consumers.",
      },
      {
        label: "Your wallet",
        value: formatLeaves(context.currentBalanceCredits),
        detail: "Current spendable Eden wallet balance for the authenticated user.",
      },
      {
        label: "Innovator context",
        value: context.activeBusinessId ? "Available" : "Not selected",
        detail: context.activeBusinessId
          ? "A business workspace is available for Eden AI project actions."
          : "No innovator workspace is currently available for direct project actions.",
      },
    ],
  };
}

import "server-only";

import { getAskEdenBusinessMatches } from "@/modules/core/mock-data/discovery-selectors";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import type { EdenAiBusinessResult, EdenAiGroundingMode } from "@/modules/eden-ai/types";

export async function searchBusinesses(
  context: EdenAiToolContext,
  input: { prompt: string; limit?: number },
) {
  const groundingMode = resolveBusinessGroundingMode();
  const matches = getAskEdenBusinessMatches(
    input.prompt,
    input.limit ?? 3,
    context.discoverySnapshot,
  ).map((business) => ({
    kind: "business",
    id: business.id,
    name: business.name,
    tags: business.tags,
    summary: business.summary,
    groundingMode,
    statusLabel:
      business.status === "published"
        ? "Published and available"
        : business.status === "testing"
          ? "Testing only"
          : "Preview only",
    actionLabel: "Open Business",
  } satisfies EdenAiBusinessResult));

  return {
    groundingMode,
    warnings:
      groundingMode === "live"
        ? []
        : [
            "Business discovery is currently grounded in Eden's shared marketplace snapshot, so non-persistent matches are labeled as simulated.",
          ],
    results: matches,
  };
}

function resolveBusinessGroundingMode(): EdenAiGroundingMode {
  if (process.env.EDEN_BUILDER_LOOP_READ_MODE === "mock_only") {
    return "simulated";
  }

  return "live";
}

import "server-only";

import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { formatLeaves } from "@/modules/core/credits/eden-currency";
import { getRecentUserTransactionHistory, getUserCreditsBalance } from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import type { EdenDiscoverySnapshot } from "@/modules/core/mock-data/discovery-selectors";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { loadDiscoverySnapshot } from "@/modules/core/services/discovery-service";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import type {
  EdenAiBusinessResult,
  EdenAiGroundingMode,
  EdenAiPlatformStatusResult,
  EdenAiProjectArtifact,
  EdenAiServiceResult,
  EdenAiWalletResult,
} from "@/modules/eden-ai/types";
import { searchBusinesses } from "@/modules/eden-ai/tools/search-businesses";
import { createProjectAgentTool } from "@/modules/eden-ai/tools/create-project-agent";
import { createProjectBlueprintTool } from "@/modules/eden-ai/tools/create-project-blueprint";
import { getPlatformStatus } from "@/modules/eden-ai/tools/get-platform-status";
import { inspectWallet } from "@/modules/eden-ai/tools/inspect-wallet";
import { runProjectAgentTool } from "@/modules/eden-ai/tools/run-project-agent";
import { searchPublishedServices } from "@/modules/eden-ai/tools/search-published-services";

export type EdenAiToolContext = {
  session: EdenMockSession;
  createdBusiness: Awaited<ReturnType<typeof getMockCreatedBusiness>>;
  workspaceServices: Awaited<ReturnType<typeof getMockWorkspaceServices>>;
  pipelineRecords: Awaited<ReturnType<typeof getMockPipelineRecords>>;
  discoverySnapshot: EdenDiscoverySnapshot;
  simulatedTransactions: Awaited<ReturnType<typeof getSimulatedTransactions>>;
  currentBalanceCredits: number;
  recentWalletTransactions: ReturnType<typeof getRecentUserTransactionHistory>;
  activeBusinessId: string | null;
};

export async function buildEdenAiToolContext(
  session: EdenMockSession,
): Promise<EdenAiToolContext> {
  const [createdBusiness, workspaceServices, pipelineRecords, simulatedTransactions] =
    await Promise.all([
      getMockCreatedBusiness(),
      getMockWorkspaceServices(),
      getMockPipelineRecords(),
      getSimulatedTransactions(),
    ]);
  const discoverySnapshot = await loadDiscoverySnapshot({
    createdBusiness,
    workspaceServices,
    pipelineRecords,
  });
  const currentBalanceCredits = getUserCreditsBalance(
    session.user.id,
    simulatedTransactions,
  );
  const recentWalletTransactions = getRecentUserTransactionHistory(
    {
      userId: session.user.id,
      limit: 4,
    },
    simulatedTransactions,
    createdBusiness,
    workspaceServices,
  );
  const activeBusinessId = resolveActiveBusinessId({
    session,
    createdBusiness,
    discoverySnapshot,
  });

  return {
    session,
    createdBusiness,
    workspaceServices,
    pipelineRecords,
    discoverySnapshot,
    simulatedTransactions,
    currentBalanceCredits,
    recentWalletTransactions,
    activeBusinessId,
  };
}

export function createEdenAiToolRegistry(context: EdenAiToolContext) {
  return {
    searchPublishedServices: (input: { prompt: string; limit?: number }) =>
      searchPublishedServices(context, input),
    searchBusinesses: (input: { prompt: string; limit?: number }) =>
      searchBusinesses(context, input),
    inspectWallet: () => inspectWallet(context),
    createProjectBlueprint: (input: {
      prompt: string;
      businessId?: string | null;
    }) => createProjectBlueprintTool(context, input),
    createProjectAgent: (input: {
      projectId: string;
      name: string;
      roleTitle: string;
      instructions: string;
      parentAgentId?: string | null;
      branchLabel?: string | null;
    }) => createProjectAgentTool(context, input),
    runProjectAgent: (input: {
      projectId: string;
      agentId: string;
      prompt: string;
      executionKey?: string | null;
    }) => runProjectAgentTool(context, input),
    getPlatformStatus: () => getPlatformStatus(context),
  };
}

export type EdenAiToolRegistry = ReturnType<typeof createEdenAiToolRegistry>;

export function resolveDiscoveryGroundingMode(): EdenAiGroundingMode {
  if (process.env.EDEN_BUILDER_LOOP_READ_MODE === "real_only") {
    return "live";
  }

  if (process.env.EDEN_BUILDER_LOOP_READ_MODE === "hybrid") {
    return "live";
  }

  return "simulated";
}

export function buildServicePricingDetail(service: {
  pricingLabel: string;
  pricePerUseCredits: number | null;
}) {
  if (service.pricePerUseCredits === null) {
    return "Visible pricing still needs confirmation before the service can be treated as ready to run.";
  }

  return `${service.pricingLabel} is shown before the service run begins.`;
}

export function buildWalletSummary(wallet: EdenAiWalletResult) {
  return `${wallet.balanceLabel} available right now.`;
}

export function buildPlatformStatusSummary(status: EdenAiPlatformStatusResult) {
  const publishedMetric = status.metrics.find((metric) => metric.label === "Published services");
  return publishedMetric
    ? `${publishedMetric.value} published services are currently visible in Eden.`
    : status.summary;
}

export function buildBusinessMatchSummary(business: EdenAiBusinessResult) {
  return `${business.name} is ${business.statusLabel.toLowerCase()} in the current Eden marketplace.`;
}

export function buildServiceMatchSummary(service: EdenAiServiceResult) {
  return `${service.title} is ${service.availabilityLabel.toLowerCase()} with ${service.pricingLabel.toLowerCase()}.`;
}

export function buildProjectArtifactSummary(project: EdenAiProjectArtifact) {
  return project.created
    ? `${project.title} is now staged in the Business workspace with ${project.suggestedAgents.length} proposed agents.`
    : `${project.title} is proposed and can be staged once a builder workspace is selected.`;
}

export function formatWalletBalanceLabel(currentBalanceCredits: number) {
  return formatLeaves(currentBalanceCredits);
}

function resolveActiveBusinessId(input: {
  session: EdenMockSession;
  createdBusiness: Awaited<ReturnType<typeof getMockCreatedBusiness>>;
  discoverySnapshot: EdenDiscoverySnapshot;
}) {
  if (
    input.createdBusiness?.business.ownerUserId === input.session.user.id ||
    input.session.role === "owner"
  ) {
    return input.createdBusiness?.business.id ?? input.discoverySnapshot.businessCatalog[0]?.id ?? null;
  }

  return input.session.user.businessIds[0] ?? null;
}

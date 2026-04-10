import { ConsumerHomePanel } from "@/ui/consumer/consumer-home";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import {
  getRecentUserTransactionHistory,
  getUserCreditsBalance,
} from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { loadDiscoverySnapshot } from "@/modules/core/services";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export default async function ConsumerPage() {
  const [session, simulatedTransactions, pipelineRecords, createdBusiness, workspaceServices] = await Promise.all([
    requireMockAccess(layerAccessRules.consumer ?? [], "/consumer"),
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockCreatedBusiness(),
    getMockWorkspaceServices(),
  ]);
  const discoverySnapshot = await loadDiscoverySnapshot({
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });
  const currentBalanceCredits = session.auth.source === "persistent"
    ? session.user.edenBalanceCredits
    : getUserCreditsBalance(session.user.id, simulatedTransactions);

  // Onboarding gate — show modal once for new persistent users
  let needsOnboarding = false;
  if (session.auth.source === "persistent") {
    try {
      const dbUser = await getPrismaClient().user.findUnique({
        where: { id: session.user.id },
        select: { onboardingCompletedAt: true },
      });
      needsOnboarding = !dbUser?.onboardingCompletedAt;
    } catch {
      // ignore — column may not exist yet
    }
  }
  const recentWalletTransactions = getRecentUserTransactionHistory(
    {
      userId: session.user.id,
      limit: 6,
    },
    simulatedTransactions,
    createdBusiness,
    workspaceServices,
  );

  return (
    <ConsumerHomePanel
      session={session}
      discoverySnapshot={discoverySnapshot}
      currentBalanceCredits={currentBalanceCredits}
      recentWalletTransactions={recentWalletTransactions}
      needsOnboarding={needsOnboarding}
    />
  );
}

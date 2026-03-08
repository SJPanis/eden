import { ConsumerHomePanel } from "@/ui/consumer/consumer-home";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import {
  getRecentUserTransactionHistory,
  getUserCreditsBalance,
} from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { getMockSession } from "@/modules/core/session/server";
import { loadDiscoverySnapshot } from "@/modules/core/services";

export default async function ConsumerPage() {
  const [session, simulatedTransactions, pipelineRecords, createdBusiness, workspaceServices] = await Promise.all([
    getMockSession(),
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
  const currentBalanceCredits = getUserCreditsBalance(session.user.id, simulatedTransactions);
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
    />
  );
}

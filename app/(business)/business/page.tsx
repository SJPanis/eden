import { getMockBusinessAssistantHistoryForBusiness } from "@/modules/core/assistant/mock-business-assistant-history";
import { getMockBusinessAssistantHistory } from "@/modules/core/assistant/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import {
  getSimulatedTransactions,
} from "@/modules/core/credits/server";
import {
  resolveBusinessContext,
} from "@/modules/core/credits/mock-credits";
import { buildDiscoverySnapshot, defaultBusinessId } from "@/modules/core/mock-data";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import {
  BusinessDashboardPanel,
  BusinessWorkspaceStarterPanel,
} from "@/ui/business/business-dashboard";

export default async function BusinessPage() {
  const session = await requireMockAccess(layerAccessRules.business ?? [], "/business");
  const [
    simulatedTransactions,
    pipelineRecords,
    pipelineEvents,
    createdBusiness,
    workspaceServices,
    assistantHistory,
  ] = await Promise.all([
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockPipelineEvents(),
    getMockCreatedBusiness(),
    getMockWorkspaceServices(),
    getMockBusinessAssistantHistory(),
  ]);
  const activeBusinessId = resolveBusinessContext(
    session.user.id,
    session.role === "owner" ? defaultBusinessId : undefined,
    createdBusiness,
  );

  if (!activeBusinessId) {
    return <BusinessWorkspaceStarterPanel session={session} />;
  }

  const discoverySnapshot = buildDiscoverySnapshot({
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });
  const scopedAssistantHistory = getMockBusinessAssistantHistoryForBusiness(
    activeBusinessId,
    assistantHistory,
  );

  return (
    <BusinessDashboardPanel
      session={session}
      discoverySnapshot={discoverySnapshot}
      simulatedTransactions={simulatedTransactions}
      pipelineRecords={pipelineRecords}
      pipelineEvents={pipelineEvents}
      activeBusinessId={activeBusinessId}
      createdBusiness={createdBusiness}
      workspaceServices={workspaceServices}
      assistantHistory={scopedAssistantHistory}
    />
  );
}

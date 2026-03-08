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
import { defaultBusinessId } from "@/modules/core/mock-data";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import {
  loadBusinessServiceUsageMetrics,
  loadBusinessWorkspaceOverview,
  loadDiscoverySnapshot,
} from "@/modules/core/services";
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

  const [discoverySnapshot, workspaceOverview, usageMetrics] = await Promise.all([
    loadDiscoverySnapshot({
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }),
    loadBusinessWorkspaceOverview(activeBusinessId, {
      createdBusiness,
      workspaceServices,
    }),
    loadBusinessServiceUsageMetrics(activeBusinessId, {
      simulatedTransactions,
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }),
  ]);
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
      businessProfile={workspaceOverview.businessProfile}
      businessOwner={workspaceOverview.businessOwner}
      createdBusiness={createdBusiness}
      workspaceServices={workspaceServices}
      assistantHistory={scopedAssistantHistory}
      usageMetrics={usageMetrics}
    />
  );
}

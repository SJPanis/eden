import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import {
  getSimulationTargetBusinessId,
} from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { OwnerDashboardPanel } from "@/ui/owner/owner-dashboard";

export default async function OwnerPage() {
  const session = await requireMockAccess(layerAccessRules.owner ?? [], "/owner");
  const [simulatedTransactions, pipelineRecords, pipelineEvents, adminState, workspaceServices] = await Promise.all([
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockPipelineEvents(),
    getMockAdminState(),
    getMockWorkspaceServices(),
  ]);
  const simulationBusinessId = getSimulationTargetBusinessId(session.role, session.user.id);

  return (
    <OwnerDashboardPanel
      session={session}
      simulatedTransactions={simulatedTransactions}
      pipelineRecords={pipelineRecords}
      pipelineEvents={pipelineEvents}
      adminState={adminState}
      simulationBusinessId={simulationBusinessId}
      workspaceServices={workspaceServices}
    />
  );
}

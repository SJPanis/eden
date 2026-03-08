import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import {
  getSimulationTargetBusinessId,
} from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { loadOwnerDashboardData } from "@/modules/core/services";
import { OwnerDashboardPanel } from "@/ui/owner/owner-dashboard";

export default async function OwnerPage() {
  const session = await requireMockAccess(layerAccessRules.owner ?? [], "/owner");
  const [simulatedTransactions, pipelineRecords, pipelineEvents, adminState, workspaceServices, createdBusiness] = await Promise.all([
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockPipelineEvents(),
    getMockAdminState(),
    getMockWorkspaceServices(),
    getMockCreatedBusiness(),
  ]);
  const simulationBusinessId = getSimulationTargetBusinessId(session.role, session.user.id);
  const dashboardData = await loadOwnerDashboardData({
    createdBusiness,
    workspaceServices,
  });

  return (
    <OwnerDashboardPanel
      session={session}
      simulatedTransactions={simulatedTransactions}
      pipelineRecords={pipelineRecords}
      pipelineEvents={pipelineEvents}
      adminState={adminState}
      simulationBusinessId={simulationBusinessId}
      workspaceServices={workspaceServices}
      watchedUsers={dashboardData.watchedUsers}
      watchedBusinesses={dashboardData.watchedBusinesses}
      watchedServices={dashboardData.watchedServices}
      userCatalog={dashboardData.userCatalog}
      businessCatalog={dashboardData.businessCatalog}
      serviceCatalog={dashboardData.serviceCatalog}
    />
  );
}

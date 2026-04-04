import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { ServiceBuilderPage } from "@/ui/services/service-builder-page";

export default async function CreateServicePage() {
  const [session, simulatedTransactions, adminState, createdBusiness] =
    await Promise.all([
      requireMockAccess(layerAccessRules.consumer ?? [], "/services/create"),
      getSimulatedTransactions(),
      getMockAdminState(),
      getMockCreatedBusiness(),
    ]);
  const activeBusinessId = resolveBusinessContext(
    session.user.id,
    undefined,
    createdBusiness,
  );

  return (
    <RoleShell
      role="consumer"
      session={session}
      simulatedTransactions={simulatedTransactions}
      activeBusinessId={activeBusinessId}
      createdBusiness={createdBusiness}
      adminState={adminState}
    >
      <ServiceBuilderPage />
    </RoleShell>
  );
}

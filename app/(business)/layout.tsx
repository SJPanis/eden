import type { ReactNode } from "react";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { defaultBusinessId } from "@/modules/core/mock-data";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";

type BusinessLayoutProps = {
  children: ReactNode;
};

export default async function BusinessLayout({ children }: BusinessLayoutProps) {
  const session = await requireMockAccess(layerAccessRules.business ?? [], "/business");
  const [simulatedTransactions, adminState, createdBusiness] = await Promise.all([
    getSimulatedTransactions(),
    getMockAdminState(),
    getMockCreatedBusiness(),
  ]);
  const activeBusinessId = resolveBusinessContext(
    session.user.id,
    session.role === "owner" ? defaultBusinessId : undefined,
    createdBusiness,
  );

  return (
    <RoleShell
      role="business"
      session={session}
      simulatedTransactions={simulatedTransactions}
      activeBusinessId={activeBusinessId}
      createdBusiness={createdBusiness}
      adminState={adminState}
    >
      {children}
    </RoleShell>
  );
}

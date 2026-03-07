import type { ReactNode } from "react";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { getMockSession } from "@/modules/core/session/server";

type ConsumerLayoutProps = {
  children: ReactNode;
};

export default async function ConsumerLayout({ children }: ConsumerLayoutProps) {
  const [session, simulatedTransactions, adminState, createdBusiness] = await Promise.all([
    getMockSession(),
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
      {children}
    </RoleShell>
  );
}

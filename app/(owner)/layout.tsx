import type { ReactNode } from "react";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";

type OwnerLayoutProps = {
  children: ReactNode;
};

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const session = await requireMockAccess(layerAccessRules.owner ?? [], "/owner");
  const [simulatedTransactions, adminState] = await Promise.all([
    getSimulatedTransactions(),
    getMockAdminState(),
  ]);

  return (
    <RoleShell
      role="owner"
      session={session}
      simulatedTransactions={simulatedTransactions}
      adminState={adminState}
    >
      {children}
    </RoleShell>
  );
}

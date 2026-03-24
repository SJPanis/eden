import type { ReactNode } from "react";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { resolveConfiguredOwnerUsername } from "@/modules/core/session/access-control";

type OwnerLayoutProps = {
  children: ReactNode;
};

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const session = await requireMockAccess(layerAccessRules.owner ?? [], "/owner");
  const [simulatedTransactions, adminState] = await Promise.all([
    getSimulatedTransactions(),
    getMockAdminState(),
  ]);

  const ownerUsernameConfigured = resolveConfiguredOwnerUsername() !== null;
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <RoleShell
      role="owner"
      session={session}
      simulatedTransactions={simulatedTransactions}
      adminState={adminState}
    >
      {isProduction && !ownerUsernameConfigured ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 mb-4">
          <span className="font-semibold">Owner security warning.</span>{" "}
          <code className="font-mono text-xs">EDEN_OWNER_USERNAME</code> is not set in your
          environment. Set it in Vercel environment variables to lock owner access to your
          specific account username. Without it, no user can receive owner role in production.
        </div>
      ) : null}
      {!isProduction && !ownerUsernameConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
          <span className="font-semibold">Dev mode — owner access is open.</span>{" "}
          Set <code className="font-mono text-xs">EDEN_OWNER_USERNAME</code> in{" "}
          <code className="font-mono text-xs">.env.local</code> to simulate production owner
          security locally.
        </div>
      ) : null}
      {children}
    </RoleShell>
  );
}

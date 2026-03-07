import { getMockAdminState } from "@/modules/core/admin/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { AccessDeniedPanel } from "@/modules/core/session/access-denied-panel";
import { getDefaultRouteForRole, parseRoleList } from "@/modules/core/session/mock-session";
import { getMockSession } from "@/modules/core/session/server";

type SearchValue = string | string[] | undefined;

type ForbiddenPageProps = {
  searchParams: Promise<Record<string, SearchValue>>;
};

function getFirstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const resolvedSearchParams = await searchParams;
  const [session, simulatedTransactions, adminState] = await Promise.all([
    getMockSession(),
    getSimulatedTransactions(),
    getMockAdminState(),
  ]);
  const targetPath = getFirstValue(resolvedSearchParams.target) ?? "/";
  const requiredRoles = parseRoleList(getFirstValue(resolvedSearchParams.required)) || ["owner"];

  return (
    <RoleShell
      role={session.role}
      session={session}
      showRoleHeader={false}
      simulatedTransactions={simulatedTransactions}
      activeBusinessId={session.user.businessIds[0]}
      adminState={adminState}
    >
      <AccessDeniedPanel
        currentRole={session.role}
        targetPath={targetPath}
        requiredRoles={requiredRoles.length ? requiredRoles : ["owner"]}
        retryHref={targetPath}
        homeHref={getDefaultRouteForRole(session.role)}
      />
    </RoleShell>
  );
}

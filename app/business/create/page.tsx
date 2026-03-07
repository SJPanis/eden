import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import { RoleShell } from "@/modules/core/layout/role-shell";
import { getMockSession } from "@/modules/core/session/server";
import { BusinessCreationFlow } from "@/ui/business/business-creation-flow";

type BusinessCreationPageProps = {
  searchParams?: Promise<{
    source?: string;
    ideaTitle?: string;
    ideaDescription?: string;
  }>;
};

export default async function BusinessCreationPage({
  searchParams,
}: BusinessCreationPageProps) {
  const [session, simulatedTransactions, adminState, createdBusiness, resolvedSearchParams] = await Promise.all([
    getMockSession(),
    getSimulatedTransactions(),
    getMockAdminState(),
    getMockCreatedBusiness(),
    (searchParams ?? Promise.resolve({})) as Promise<{
      source?: string;
      ideaTitle?: string;
      ideaDescription?: string;
    }>,
  ]);
  const activeBusinessId = resolveBusinessContext(
    session.user.id,
    undefined,
    createdBusiness,
  );
  const source =
    resolvedSearchParams.source === "business_dashboard"
      ? "business_dashboard"
      : "ask_eden";

  return (
    <RoleShell
      role="business"
      session={session}
      simulatedTransactions={simulatedTransactions}
      activeBusinessId={activeBusinessId}
      createdBusiness={createdBusiness}
      adminState={adminState}
    >
      <BusinessCreationFlow
        session={session}
        initialSource={source}
        initialIdeaTitle={resolvedSearchParams.ideaTitle}
        initialIdeaDescription={resolvedSearchParams.ideaDescription}
      />
    </RoleShell>
  );
}

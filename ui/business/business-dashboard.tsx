import { AppsWorkspaceCard } from "@/modules/apps/components/apps-workspace-card";
import { DashboardCard } from "@/modules/core/components/dashboard-card";

export function BusinessDashboardPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DashboardCard
        eyebrow="Business Layer"
        title="Business Control Center"
        description="Create and manage your business profile, app identity, and publishing readiness."
      >
        Profile setup, operational toggles, and checklist placeholders live here.
      </DashboardCard>

      <AppsWorkspaceCard />

      <DashboardCard
        eyebrow="Billing"
        title="Wallet and Fee Visibility"
        description="Transparent fee and Eden Credits placeholders for business operations."
      >
        Transaction summaries are intentionally lightweight in v1 shell mode.
      </DashboardCard>

      <DashboardCard
        eyebrow="AI Actions"
        title="Business AI Assistant Placeholder"
        description="Future helper for idea validation, testing advice, and publish prep."
      >
        No advanced agents are implemented at this stage.
      </DashboardCard>
    </div>
  );
}

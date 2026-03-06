import { AdminHealthCard } from "@/modules/admin/components/admin-health-card";
import { DashboardCard } from "@/modules/core/components/dashboard-card";

export function OwnerDashboardPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DashboardCard
        eyebrow="Owner Layer"
        title="Root Visibility Console"
        description="Dedicated owner dashboard with isolated system-level perspective."
      >
        Root-level views are placeholders only for this initial shell.
      </DashboardCard>

      <AdminHealthCard />

      <DashboardCard
        eyebrow="Directory"
        title="Users and Businesses Snapshot"
        description="Quick summary panel for active users, business apps, and onboarding state."
      >
        Metrics and table content will be connected in later phases.
      </DashboardCard>

      <DashboardCard
        eyebrow="Approvals"
        title="Approvals and Escalations Placeholder"
        description="Queue for business approvals and platform safety decisions."
      >
        Workflow logic intentionally deferred for post-v1 shell phases.
      </DashboardCard>
    </div>
  );
}

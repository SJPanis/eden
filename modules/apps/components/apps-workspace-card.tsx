import { DashboardCard } from "@/modules/core/components/dashboard-card";

export function AppsWorkspaceCard() {
  return (
    <DashboardCard
      eyebrow="Apps Module"
      title="Business App Workspace Placeholder"
      description="Sandboxed business app lifecycle surfaces are staged here in Eden v1."
    >
      <ul className="space-y-2 text-sm text-eden-muted">
        <li>Build flow: Placeholder</li>
        <li>Test flow: Placeholder</li>
        <li>Publish flow: Placeholder</li>
      </ul>
    </DashboardCard>
  );
}

import { DashboardCard } from "@/modules/core/components/dashboard-card";

export function AdminHealthCard() {
  return (
    <DashboardCard
      eyebrow="Admin Module"
      title="System Oversight Placeholder"
      description="Owner-only controls and telemetry are isolated here for v1 shell mode."
    >
      <ul className="space-y-2 text-sm text-eden-muted">
        <li>Logs queue: Placeholder</li>
        <li>Approval center: Placeholder</li>
        <li>System status board: Placeholder</li>
      </ul>
    </DashboardCard>
  );
}

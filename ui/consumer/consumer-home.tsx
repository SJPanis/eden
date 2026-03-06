import { DashboardCard } from "@/modules/core/components/dashboard-card";

export function ConsumerHomePanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DashboardCard
        eyebrow="AI Entry Point"
        title="Ask Eden"
        description="Placeholder for the v1 AI-first consumer assistant for searching and guidance."
      >
        Start with intents like: &quot;Find wellness services near me.&quot;
      </DashboardCard>

      <DashboardCard
        eyebrow="Discovery"
        title="Browse Businesses"
        description="Explore categories, tags, and featured providers."
      >
        Categories and filters are placeholder-only in this scaffold.
      </DashboardCard>

      <DashboardCard
        eyebrow="Favorites"
        title="Saved Businesses"
        description="A lightweight placeholder for the user's favorites list."
      >
        No favorites yet. Save businesses from discovery results.
      </DashboardCard>

      <DashboardCard
        eyebrow="Wallet"
        title="Eden Credits Placeholder"
        description="Internal Eden Credits visibility panel for v1."
      >
        Available credits, usage, and fees will appear here.
      </DashboardCard>
    </div>
  );
}

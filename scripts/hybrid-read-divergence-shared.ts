export type HybridReadDivergenceScenario = {
  scenarioId: string;
  user: {
    id: string;
    displayName: string;
    summary: string;
  };
  business: {
    id: string;
    ownerUserId: string;
    name: string;
    category: string;
    tags: string[];
    description: string;
    summary: string;
    tagline: string;
    visibility: "Published";
    publishReadinessPercent: number;
    nextMilestone: string;
    featuredServiceId: string;
  };
  service: {
    id: string;
    businessId: string;
    title: string;
    category: string;
    tags: string[];
    description: string;
    summary: string;
    pricingModel: string;
    automationSummary: string;
  };
  pipelineRecord: {
    businessId: string;
    serviceId: string;
    lastActionLabel: string;
    updatedAt: Date;
  };
};

export const hybridReadDivergenceScenario: HybridReadDivergenceScenario = {
  scenarioId: "core_builder_marketplace_drift",
  user: {
    id: "user-02",
    displayName: "Paige Brooks DB Divergence",
    summary:
      "Development-only PostgreSQL divergence for validating hybrid owner and workspace reads.",
  },
  business: {
    id: "business-01",
    ownerUserId: "user-02",
    name: "Northstar Habit Lab DB Divergence",
    category: "AI Productivity Lab",
    tags: ["AI Productivity Lab", "Hybrid Read", "DB Divergence"],
    description:
      "Development-only PostgreSQL divergence used to prove that hybrid reads can override the canonical mock marketplace source.",
    summary:
      "A PostgreSQL-diverged business profile for validating consumer discovery, business overview, and owner summary reads.",
    tagline: "Database-backed marketplace drift for hybrid read verification.",
    visibility: "Published",
    publishReadinessPercent: 99,
    nextMilestone: "Verify hybrid read divergence across dashboards",
    featuredServiceId: "service-01",
  },
  service: {
    id: "service-01",
    businessId: "business-01",
    title: "Focus Sprint Planner DB Divergence",
    category: "AI Productivity Lab",
    tags: ["AI Productivity Lab", "Hybrid Read", "DB Divergence"],
    description:
      "Development-only PostgreSQL divergence for validating published discovery and service-detail hybrid reads.",
    summary:
      "A PostgreSQL-diverged published service used to confirm that hybrid discovery can surface database-backed records.",
    pricingModel: "Verification-only launch tier",
    automationSummary:
      "Database-backed automation summary used only for hybrid read verification.",
  },
  pipelineRecord: {
    businessId: "business-01",
    serviceId: "service-01",
    lastActionLabel:
      "Development-only divergence marked this service as published for hybrid read verification.",
    updatedAt: new Date(Date.UTC(2026, 2, 7, 18, 0, 0)),
  },
};


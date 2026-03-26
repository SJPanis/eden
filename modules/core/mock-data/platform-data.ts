import type { EdenMockCreatedBusinessState } from "../business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "../business/mock-workspace-services";
import type {
  EdenMockAgentNode,
  EdenMockBusiness,
  EdenMockBusinessAssistantAction,
  EdenMockCategory,
  EdenMockFeeSummaryItem,
  EdenMockLog,
  EdenMockOwnerHealthCheck,
  EdenMockOwnerSignal,
  EdenMockPipelineChecklistItem,
  EdenMockPipelineStage,
  EdenMockProject,
  EdenMockSecurityControl,
  EdenMockService,
  EdenMockTransaction,
  EdenMockUser,
} from "./platform-types";

export const defaultConsumerUserId = "user-01";
export const defaultBusinessUserId = "user-07";
export const defaultBusinessId = "business-05";
export const defaultOwnerUserId = "user-06";
export const defaultServiceId = "service-06";

export const categories: EdenMockCategory[] = [
  { id: "category-productivity", label: "Productivity", description: "Tools and coaching for better focus." },
  { id: "category-automotive", label: "Automotive", description: "AI-powered vehicle parts, visualization, and diagnostics." },
  { id: "category-finance", label: "Finance", description: "AI market analysis and financial intelligence." },
  { id: "category-music", label: "Music", description: "Music discovery and taste visualization." },
];

export const users: EdenMockUser[] = [
  {
    id: "user-01",
    username: "alina.r",
    displayName: "Alina Rivers",
    status: "active",
    role: "consumer",
    edenBalanceCredits: 420,
    summary: "Primary consumer profile used to explore businesses, save favorites, and test Ask Eden discovery routes.",
    businessIds: [],
    savedBusinessIds: ["business-05", "business-market-lens"],
    savedServiceIds: ["service-06", "service-market-lens"],
  },
  {
    id: "user-04",
    username: "jon.kessler",
    displayName: "Jon Kessler",
    status: "active",
    role: "business",
    edenBalanceCredits: 960,
    summary: "Draft-stage business owner exploring home operations and setup service concepts.",
    businessIds: ["business-03"],
    savedBusinessIds: [],
    savedServiceIds: [],
  },
  {
    id: "user-06",
    username: "legacy.ops",
    displayName: "Legacy Ops",
    status: "frozen",
    role: "owner",
    edenBalanceCredits: 0,
    summary: "Owner-layer audit sample preserved as a frozen account for control-room and security placeholders.",
    businessIds: [],
    savedBusinessIds: [],
    savedServiceIds: [],
  },
  {
    id: "user-07",
    username: "pilot_tester",
    displayName: "Pilot Tester",
    status: "active",
    role: "business",
    edenBalanceCredits: 5000,
    summary: "Owner of Imagine Auto, Market Lens, and Spot Splore — primary published business operator.",
    businessIds: ["business-05", "business-market-lens", "business-spot-splore"],
    savedBusinessIds: [],
    savedServiceIds: [],
  },
];

export const businesses: EdenMockBusiness[] = [
  {
    id: "business-03",
    name: "Orbit Living Works",
    ownerUserId: "user-04",
    status: "draft",
    category: "Productivity",
    tags: ["Productivity", "Operations", "Setup"],
    description:
      "A draft business workspace exploring connected-home setup, household systems, and lightweight support packages.",
    summary:
      "A home-oriented workspace for setup, operations design, and everyday environment improvements.",
    tagline: "Connected home service design and support.",
    visibility: "Private preview",
    teamLabel: "Jon Kessler + 1 collaborator",
    creditBalanceCredits: 960,
    publishReadinessPercent: 38,
    nextMilestone: "Pilot setup pass",
    featuredServiceId: "service-04",
  },
  {
    id: "business-05",
    name: "Imagine Auto",
    ownerUserId: "user-07",
    status: "published",
    category: "Automotive",
    tags: ["Automotive", "Parts", "AI Visualization", "Diagnostics"],
    description:
      "AI-powered automotive service for parts discovery, custom visualization, and vehicle diagnostics.",
    summary:
      "An automotive AI business offering parts search, 3D visualization, and diagnostic intelligence.",
    tagline: "Find it. Visualize it. Own it.",
    visibility: "Published",
    teamLabel: "Sonny + AI agents",
    creditBalanceCredits: 5000,
    publishReadinessPercent: 100,
    nextMilestone: "Real API integration",
    featuredServiceId: "service-06",
  },
  {
    id: "business-market-lens",
    name: "Market Lens",
    ownerUserId: "user-07",
    status: "published",
    category: "Finance",
    tags: ["Finance", "Stocks", "AI", "Market Analysis"],
    description:
      "AI stock market analysis with Claude probability heatmap projections.",
    summary:
      "AI stock market analysis with Claude probability heatmap projections.",
    tagline: "See where the market is going.",
    visibility: "Published",
    teamLabel: "Sonny + AI agents",
    creditBalanceCredits: 5000,
    publishReadinessPercent: 100,
    nextMilestone: "Live market data API",
    featuredServiceId: "service-market-lens",
  },
  {
    id: "business-spot-splore",
    name: "Spot Splore",
    ownerUserId: "user-07",
    status: "published",
    category: "Music",
    tags: ["Music", "Spotify", "Visualization", "Discovery"],
    description:
      "Connect Spotify and explore your music as a living constellation universe.",
    summary:
      "Connect Spotify and explore your music as a living constellation universe.",
    tagline: "Explore your sound.",
    visibility: "Published",
    teamLabel: "Sonny + AI agents",
    creditBalanceCredits: 5000,
    publishReadinessPercent: 85,
    nextMilestone: "Spotify OAuth",
    featuredServiceId: "service-spot-splore",
  },
];

export const services: EdenMockService[] = [
  {
    id: "service-04",
    title: "Smart Home Setup Assist",
    businessId: "business-03",
    category: "Productivity",
    description: "A draft setup support offer for connected-home configuration, routines, and maintenance planning.",
    summary:
      "Placeholder service detail for a home setup support experience with systems planning and household optimization.",
    status: "Draft",
    tags: ["Productivity", "Setup", "Operations"],
    pricingModel: "Eden Leaf’s",
    pricePerUse: 160,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-06",
    title: "Imagine Auto",
    businessId: "business-05",
    category: "Automotive",
    description: "AI-powered parts discovery, visualization, and diagnostics for any vehicle.",
    summary:
      "Find OEM and aftermarket parts, generate custom part visualizations, and run AI-powered vehicle diagnostics.",
    status: "Published",
    tags: ["Automotive", "Parts", "AI", "Diagnostics"],
    pricingModel: "Eden Leaf’s",
    pricePerUse: 50,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-market-lens",
    title: "Market Lens",
    businessId: "business-market-lens",
    category: "Finance",
    description: "AI stock analysis with Claude probability cone projections.",
    summary:
      "Search any ticker. See full price history then Claude overlays a probability heatmap cone showing likely future ranges based on technicals and pattern recognition.",
    status: "Published",
    tags: ["Finance", "Stocks", "AI", "Trading"],
    pricingModel: "Eden Leaf’s",
    pricePerUse: 75,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-spot-splore",
    title: "Spot Splore",
    businessId: "business-spot-splore",
    category: "Music",
    description: "Your Spotify universe as an interactive constellation map.",
    summary:
      "Connect Spotify. See artists as nodes, genres as clusters, songs as stars. Search any artist or genre to zoom your music universe.",
    status: "Published",
    tags: ["Music", "Spotify", "Visualization"],
    pricingModel: "Eden Leaf’s",
    pricePerUse: 50,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
];

export const projects: EdenMockProject[] = [
  {
    id: "project-01",
    businessId: "business-05",
    title: "Imagine Auto API Integration",
    type: "Active build",
    status: "Building",
    summary:
      "Connecting real parts APIs and diagnostic data feeds to replace mock data.",
    milestone: "Complete OEM parts API integration",
    updatedAt: "Updated 2 hours ago",
    progress: 72,
  },
  {
    id: "project-02",
    businessId: "business-market-lens",
    title: "Live Market Data Feed",
    type: "Active build",
    status: "Building",
    summary:
      "Integrating real-time market data APIs for live ticker analysis and probability projections.",
    milestone: "Connect live price feed API",
    updatedAt: "Updated yesterday",
    progress: 55,
  },
  {
    id: "project-03",
    businessId: "business-spot-splore",
    title: "Spotify OAuth Integration",
    type: "Active build",
    status: "Building",
    summary:
      "Implementing Spotify OAuth flow and listening history data pipeline for constellation visualization.",
    milestone: "Complete OAuth callback and token refresh",
    updatedAt: "Updated 3 days ago",
    progress: 40,
  },
];

export const transactions: EdenMockTransaction[] = [
  {
    id: "transaction-01",
    businessId: "business-05",
    userId: "user-07",
    title: "Builder workspace reserve added",
    amountLabel: "+1,200 Leaf’s",
    creditsDelta: 1200,
    direction: "inflow",
    kind: "wallet",
    detail: "Imagine Auto received a Leaf’s top-up for API integration and testing.",
    timestamp: "09:42",
  },
  {
    id: "transaction-02",
    userId: "user-01",
    serviceId: "service-06",
    title: "Consumer discovery usage settled",
    amountLabel: "-680 Leaf’s",
    creditsDelta: -680,
    direction: "outflow",
    kind: "usage",
    detail: "Service routing and discovery consumed the latest staged batch.",
    timestamp: "09:18",
  },
  {
    id: "transaction-03",
    businessId: "business-05",
    userId: "user-07",
    title: "Publish reserve moved to hold",
    amountLabel: "860 Leaf’s",
    creditsDelta: 0,
    direction: "reserve",
    kind: "reserve",
    detail: "Leaf’s were moved into a safety hold before publish validation.",
    timestamp: "08:57",
  },
  {
    id: "transaction-04",
    userId: "user-06",
    title: "Owner audit adjustment posted",
    amountLabel: "+140 Leaf’s",
    creditsDelta: 140,
    direction: "adjustment",
    kind: "adjustment",
    detail: "Manual control-room adjustment applied after a staged discrepancy review.",
    timestamp: "08:25",
  },
  {
    id: "transaction-05",
    businessId: "business-market-lens",
    userId: "user-07",
    title: "AI workspace usage settled",
    amountLabel: "-240 Leaf’s",
    creditsDelta: -240,
    direction: "outflow",
    kind: "usage",
    detail: "Market Lens AI analysis credits consumed from the latest weekly usage batch.",
    timestamp: "Yesterday",
  },
  {
    id: "transaction-06",
    businessId: "business-05",
    userId: "user-07",
    title: "Hosting reserve forecast",
    amountLabel: "$18/mo reserve",
    creditsDelta: 0,
    direction: "reserve",
    kind: "hosting",
    detail: "Placeholder hosting estimate reserved for staging, delivery, and analytics surfaces.",
    timestamp: "This month",
  },
  {
    id: "transaction-07",
    businessId: "business-05",
    userId: "user-07",
    title: "Platform fee staging",
    amountLabel: "6% platform fee",
    creditsDelta: 0,
    direction: "outflow",
    kind: "fee",
    detail: "Eden platform fee prepared for the next publish-ready settlement cycle.",
    timestamp: "This month",
  },
];

export const logs: EdenMockLog[] = [
  {
    id: "log-01",
    level: "info",
    source: "router",
    title: "Imagine Auto parts API connected",
    message: "Discovery routes recalculated for the latest consumer prompt batch.",
    timestamp: "2 hours ago",
    businessId: "business-05",
    serviceId: "service-06",
  },
  {
    id: "log-02",
    level: "warn",
    source: "billing",
    title: "Billing model reviewed",
    message: "Reserve threshold touched for Market Lens workspace during analysis load.",
    timestamp: "Yesterday",
    businessId: "business-market-lens",
    userId: "user-07",
  },
  {
    id: "log-03",
    level: "info",
    source: "publish",
    title: "Market Lens published to marketplace",
    message: "Market Lens AI analysis service published and discoverable.",
    timestamp: "2 days ago",
    businessId: "business-market-lens",
  },
  {
    id: "log-04",
    level: "info",
    source: "security",
    title: "Manual owner audit opened",
    message: "Manual owner audit opened for a freeze-business simulation.",
    timestamp: "08:54",
    userId: "user-06",
    businessId: "business-03",
  },
  {
    id: "log-05",
    level: "error",
    source: "agents",
    title: "Safety Monitor retried publish event",
    message: "Safety Monitor retried one flagged publish event after a mock timeout.",
    timestamp: "08:40",
  },
];

export const businessAssistantActions: EdenMockBusinessAssistantAction[] = [
  {
    id: "assistant-01",
    title: "Generate description",
    description: "Draft sharper marketplace copy from your current business metadata.",
    resultHint: "Produces a mocked product description refresh.",
  },
  {
    id: "assistant-02",
    title: "Suggest improvements",
    description: "Surface stronger feature framing, clearer value props, and packaging adjustments.",
    resultHint: "Creates a mocked improvement list for the current service draft.",
  },
  {
    id: "assistant-03",
    title: "Prepare for publish",
    description: "Stage the final publish checklist, copy review, and launch notes.",
    resultHint: "Builds a placeholder publish brief.",
  },
  {
    id: "assistant-04",
    title: "Create packaging variant",
    description: "Generate another mocked packaging direction for the active service draft.",
    resultHint: "Creates a local packaging variant without overwriting the draft automatically.",
  },
];

export const businessPipelineStages: EdenMockPipelineStage[] = [
  {
    id: "pipeline-build",
    title: "Build",
    state: "ready",
    summary: "Primary flows, copy blocks, and placeholder packaging are assembled.",
    readiness: "Ready to continue",
  },
  {
    id: "pipeline-test",
    title: "Test",
    state: "attention",
    summary: "Manual QA is underway and a few launch assumptions still need sign-off.",
    readiness: "Needs attention",
  },
  {
    id: "pipeline-publish",
    title: "Publish",
    state: "locked",
    summary: "Publish remains gated until testing, billing, and visibility checks are cleared.",
    readiness: "Waiting on prior steps",
  },
];

export const businessPipelineChecklist: EdenMockPipelineChecklistItem[] = [
  {
    id: "checklist-01",
    label: "Product narrative aligned",
    detail: "Business description and app messaging are staged for final review.",
    state: "done",
  },
  {
    id: "checklist-02",
    label: "Manual QA pass",
    detail: "Onboarding, state transitions, and pricing placeholders still need a final pass.",
    state: "pending",
  },
  {
    id: "checklist-03",
    label: "Billing transparency review",
    detail: "Fee summary is drafted but publish copy needs a final check.",
    state: "pending",
  },
  {
    id: "checklist-04",
    label: "Visibility approval",
    detail: "Workspace is still locked to internal testing until readiness is complete.",
    state: "blocked",
  },
];

export const businessFeeSummary: EdenMockFeeSummaryItem[] = [
  {
    id: "fee-01",
    label: "Platform fee",
    value: "6%",
    detail: "Mock Eden platform fee applied to published business revenue.",
  },
  {
    id: "fee-02",
    label: "Payment processing",
    value: "2.9% + $0.30",
    detail: "Placeholder payment provider cost shown for transparency only.",
  },
  {
    id: "fee-03",
    label: "Hosting reserve",
    value: "$18/mo",
    detail: "Estimated infrastructure placeholder for production-like traffic.",
  },
];

export const ownerSignals: EdenMockOwnerSignal[] = [
  {
    id: "signal-01",
    label: "Maintenance mode",
    value: "Off",
    detail: "Public routes continue in normal mock mode.",
  },
  {
    id: "signal-02",
    label: "Pending escalations",
    value: "3",
    detail: "Two billing reviews and one publish hold are staged for owner review.",
  },
  {
    id: "signal-03",
    label: "Audit coverage",
    value: "24/7",
    detail: "Mock owner logging remains active across ledger, publish, and agent surfaces.",
  },
];

export const ownerHealthChecks: EdenMockOwnerHealthCheck[] = [
  {
    id: "health-01",
    label: "Core routing",
    status: "Healthy",
    detail: "Prompt routing, admin shells, and lane selection are operating inside normal mock thresholds.",
  },
  {
    id: "health-02",
    label: "Credit ledger",
    status: "Watch",
    detail: "Reserve thresholds are being monitored after a staged billing spike in testing mode.",
  },
  {
    id: "health-03",
    label: "Publish queue",
    status: "Stable",
    detail: "No published services are blocked, but two business launches remain in manual review.",
  },
];

export const ownerSecurityControls: EdenMockSecurityControl[] = [
  {
    id: "security-01",
    title: "Freeze user",
    description: "Placeholder control to suspend user activity while owner review is active.",
    stateLabel: "Manual review",
    actionLabel: "Freeze User",
  },
  {
    id: "security-02",
    title: "Freeze business",
    description: "Placeholder control to stop business publishing and service visibility immediately.",
    stateLabel: "Standby",
    actionLabel: "Freeze Business",
  },
  {
    id: "security-03",
    title: "Maintenance mode",
    description: "Mock global switch for pausing public activity across Eden surfaces.",
    stateLabel: "Off",
    actionLabel: "Toggle Maintenance",
  },
  {
    id: "security-04",
    title: "Audit logs",
    description: "Open a placeholder trail of owner actions, ledger changes, and system escalations.",
    stateLabel: "Streaming",
    actionLabel: "Open Audit Logs",
  },
];

export const ownerAgentNodes: EdenMockAgentNode[] = [
  {
    id: "agent-01",
    name: "Router Cluster",
    status: "healthy",
    queueDepth: "12 queued",
    activity: "Routing consumer prompts and business workspace actions with normal latency.",
  },
  {
    id: "agent-02",
    name: "Safety Monitor",
    status: "attention",
    queueDepth: "3 flagged",
    activity: "Reviewing staged publish anomalies and manual security events.",
  },
  {
    id: "agent-03",
    name: "Publish Coordinator",
    status: "busy",
    queueDepth: "5 builds",
    activity: "Preparing businesses and services for mock publish readiness validation.",
  },
  {
    id: "agent-04",
    name: "Ledger Watcher",
    status: "healthy",
    queueDepth: "0 blocked",
    activity: "Tracking Eden credit inflow, reserve balances, and owner-side adjustments.",
  },
];

export const ownerDashboardUserIds = ["user-01", "user-07", "user-04", "user-06"];
export const ownerDashboardBusinessIds = ["business-05", "business-market-lens", "business-spot-splore", "business-03"];
export const ownerDashboardServiceIds = ["service-06", "service-market-lens", "service-spot-splore"];

export function formatCredits(value: number) {
  return `${value.toLocaleString()} Leaf’s`;
}

export function getUserById(id: string) {
  return users.find((user) => user.id === id) ?? null;
}

export function getBusinessById(
  id: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
) {
  if (createdBusiness?.business.id === id) {
    return createdBusiness.business;
  }

  return businesses.find((business) => business.id === id) ?? null;
}

export function getServiceById(
  id: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  if (createdBusiness?.service.id === id) {
    return createdBusiness.service;
  }

  const localService = workspaceServices.find((entry) => entry.service.id === id);
  if (localService) {
    return localService.service;
  }

  return services.find((service) => service.id === id) ?? null;
}

export function getProjectsByBusinessId(
  businessId: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  const localProjects = workspaceServices
    .filter((entry) => entry.project.businessId === businessId)
    .map((entry) => entry.project);

  if (createdBusiness?.business.id === businessId) {
    return [createdBusiness.project, ...localProjects];
  }

  return [...localProjects, ...projects.filter((project) => project.businessId === businessId)];
}

export function getTransactionsByBusinessId(businessId: string) {
  return transactions.filter((transaction) => transaction.businessId === businessId);
}

export function getLogsByBusinessId(
  businessId: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  const localLogs = workspaceServices
    .filter((entry) => entry.project.businessId === businessId)
    .flatMap((entry) => entry.logs);

  if (createdBusiness?.business.id === businessId) {
    return [...localLogs, ...createdBusiness.logs];
  }

  return [...localLogs, ...logs.filter((log) => log.businessId === businessId)];
}

export function getBusinessOwner(
  businessOrId: string | EdenMockBusiness,
  createdBusiness?: EdenMockCreatedBusinessState | null,
) {
  const business =
    typeof businessOrId === "string"
      ? getBusinessById(businessOrId, createdBusiness)
      : businessOrId;
  return business ? getUserById(business.ownerUserId) : null;
}

export function getBusinessForService(
  serviceOrId: string | EdenMockService,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  const service =
    typeof serviceOrId === "string"
      ? getServiceById(serviceOrId, createdBusiness, workspaceServices)
      : serviceOrId;
  return service ? getBusinessById(service.businessId, createdBusiness) : null;
}

export function getBusinessesForOwner(userId: string) {
  return businesses.filter((business) => business.ownerUserId === userId);
}

export function getOwnerDashboardUsers() {
  return ownerDashboardUserIds
    .map((id) => getUserById(id))
    .filter((user): user is EdenMockUser => Boolean(user));
}

export function getOwnerDashboardBusinesses() {
  return ownerDashboardBusinessIds
    .map((id) => getBusinessById(id))
    .filter((business): business is EdenMockBusiness => Boolean(business));
}

export function getOwnerDashboardServices() {
  return ownerDashboardServiceIds
    .map((id) => getServiceById(id))
    .filter((service): service is EdenMockService => Boolean(service));
}

export function getBusinessUsageCredits(businessId: string) {
  return getTransactionsByBusinessId(businessId)
    .filter((transaction) => transaction.kind === "usage" && transaction.creditsDelta < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.creditsDelta), 0);
}

export function getCreditFlowSummary() {
  const creditsIssued = transactions
    .filter((transaction) => transaction.creditsDelta > 0)
    .reduce((total, transaction) => total + transaction.creditsDelta, 0);
  const creditsConsumed = transactions
    .filter((transaction) => transaction.creditsDelta < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.creditsDelta), 0);
  const reserveHeld = transactions
    .filter((transaction) => transaction.direction === "reserve")
    .reduce((total, transaction) => total + getCreditsFromAmountLabel(transaction.amountLabel), 0);

  return {
    issued: creditsIssued,
    consumed: creditsConsumed,
    reserveHeld: reserveHeld || 860,
    netMovement: creditsIssued - creditsConsumed,
  };
}

function getCreditsFromAmountLabel(amountLabel: string) {
  const normalized = amountLabel.toLowerCase();
  if (!normalized.includes("credit")) {
    return 0;
  }

  const match = amountLabel.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match) {
    return 0;
  }

  return Number.parseFloat(match[0].replace(/,/g, ""));
}

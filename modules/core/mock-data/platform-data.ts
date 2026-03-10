import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
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
} from "@/modules/core/mock-data/platform-types";

export const defaultConsumerUserId = "user-01";
export const defaultBusinessUserId = "user-02";
export const defaultBusinessId = "business-01";
export const defaultOwnerUserId = "user-06";
export const defaultServiceId = "service-01";

export const categories: EdenMockCategory[] = [
  { id: "category-productivity", label: "Productivity", description: "Tools and coaching for better focus." },
  { id: "category-wellness", label: "Wellness", description: "Mind and body services with guided care." },
  { id: "category-learning", label: "Learning", description: "Practical workshops and growth tracks." },
  { id: "category-home", label: "Home", description: "Services to improve everyday living." },
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
    savedBusinessIds: ["business-02", "business-01"],
    savedServiceIds: ["service-01", "service-03"],
  },
  {
    id: "user-02",
    username: "paige.brooks",
    displayName: "Paige Brooks",
    status: "active",
    role: "business",
    edenBalanceCredits: 1820,
    summary: "Owner of Northstar Habit Lab and the default business workspace used throughout Eden v1.",
    businessIds: ["business-01"],
    savedBusinessIds: [],
    savedServiceIds: [],
  },
  {
    id: "user-03",
    username: "mina.fields",
    displayName: "Mina Fields",
    status: "active",
    role: "business",
    edenBalanceCredits: 2640,
    summary: "Wellness-focused business owner running the published Calm Harbor Studio surface.",
    businessIds: ["business-02"],
    savedBusinessIds: [],
    savedServiceIds: [],
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
    id: "user-05",
    username: "ari.cole",
    displayName: "Ari Cole",
    status: "active",
    role: "business",
    edenBalanceCredits: 1330,
    summary: "Creator-education business owner managing Spark Lab Academy inside Eden.",
    businessIds: ["business-04"],
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
    status: "review",
    role: "business",
    edenBalanceCredits: 260,
    summary: "Testing account used to simulate publish review, QA load, and staged business escalation flows.",
    businessIds: [],
    savedBusinessIds: [],
    savedServiceIds: [],
  },
];

export const businesses: EdenMockBusiness[] = [
  {
    id: "business-01",
    name: "Northstar Habit Lab",
    ownerUserId: "user-02",
    status: "testing",
    category: "Productivity",
    tags: ["Productivity", "Builder tools", "Consumer AI"],
    description:
      "A focused builder workspace for turning behavior-change ideas into polished Eden business experiences.",
    summary:
      "A builder-focused workspace creating momentum, planning, and habit products inside Eden.",
    tagline: "Focus systems and guided momentum design.",
    visibility: "Internal testing",
    teamLabel: "Paige Brooks + 2 collaborators",
    creditBalanceCredits: 1820,
    publishReadinessPercent: 74,
    nextMilestone: "Publish review",
    featuredServiceId: "service-01",
  },
  {
    id: "business-02",
    name: "Calm Harbor Studio",
    ownerUserId: "user-03",
    status: "published",
    category: "Wellness",
    tags: ["Wellness", "Recovery", "Guided care"],
    description:
      "A wellness brand focused on short reset rituals, recovery support, and guided calm experiences.",
    summary:
      "A wellness business profile with guided reset services, recovery flows, and consumer-facing content.",
    tagline: "Personal wellness and stress reset experiences.",
    visibility: "Published",
    teamLabel: "Mina Fields + 4 collaborators",
    creditBalanceCredits: 2640,
    publishReadinessPercent: 96,
    nextMilestone: "New recovery bundle launch",
    featuredServiceId: "service-02",
  },
  {
    id: "business-03",
    name: "Orbit Living Works",
    ownerUserId: "user-04",
    status: "draft",
    category: "Home",
    tags: ["Home", "Operations", "Setup"],
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
    id: "business-04",
    name: "Spark Lab Academy",
    ownerUserId: "user-05",
    status: "published",
    category: "Learning",
    tags: ["Learning", "Creator", "Workshops"],
    description:
      "A creator-education business centered on practical workshops, fast skill sprints, and cohort-style learning tracks.",
    summary:
      "A learning business profile centered on practical workshops, creator training, and build-ready guidance.",
    tagline: "Hands-on learning tracks for creators.",
    visibility: "Published",
    teamLabel: "Ari Cole + 3 collaborators",
    creditBalanceCredits: 1330,
    publishReadinessPercent: 91,
    nextMilestone: "Spring cohort refresh",
    featuredServiceId: "service-03",
  },
];

export const services: EdenMockService[] = [
  {
    id: "service-01",
    title: "Focus Sprint Planner",
    businessId: "business-01",
    category: "Productivity",
    description: "A guided weekly planning experience that turns user intent into repeatable focus sessions.",
    summary:
      "Placeholder service detail for a guided focus-planning experience that helps users convert intent into momentum.",
    status: "Testing",
    tags: ["Productivity", "Planning", "Focus"],
    pricingModel: "Eden Leaves",
    pricePerUse: 95,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-02",
    title: "Evening Reset Session",
    businessId: "business-02",
    category: "Wellness",
    description: "A short guided reset for winding down, calming the nervous system, and building recovery rituals.",
    summary:
      "Placeholder service detail for a guided reset experience with calm routines, recovery prompts, and simple next actions.",
    status: "Published",
    tags: ["Wellness", "Recovery", "Guided care"],
    pricingModel: "Eden Leaves",
    pricePerUse: 70,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-03",
    title: "Creator Skill Sprint",
    businessId: "business-04",
    category: "Learning",
    description: "A practical skill-building sprint for creators who want a fast path from concept to output.",
    summary:
      "Placeholder learning service focused on short, practical skill blocks and milestone-based builder guidance.",
    status: "Published",
    tags: ["Learning", "Creator", "Sprint"],
    pricingModel: "Eden Leaves",
    pricePerUse: 135,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-04",
    title: "Smart Home Setup Assist",
    businessId: "business-03",
    category: "Home",
    description: "A draft setup support offer for connected-home configuration, routines, and maintenance planning.",
    summary:
      "Placeholder service detail for a home setup support experience with systems planning and household optimization.",
    status: "Draft",
    tags: ["Home", "Setup", "Operations"],
    pricingModel: "Eden Leaves",
    pricePerUse: 160,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
  {
    id: "service-05",
    title: "Recovery Flow Pack",
    businessId: "business-02",
    category: "Wellness",
    description: "A bundled recovery service with calming routines, pacing guidance, and follow-up support.",
    summary:
      "Placeholder service bundle for recovery routines, pacing recommendations, and follow-up habit support.",
    status: "Published",
    tags: ["Wellness", "Bundle", "Recovery"],
    pricingModel: "Eden Leaves",
    pricePerUse: 110,
    pricingType: "per_use",
    pricingUnit: "credits",
  },
];

export const projects: EdenMockProject[] = [
  {
    id: "project-01",
    businessId: "business-01",
    title: "Focus Sprint Planner",
    type: "Active build",
    status: "Testing",
    summary:
      "A guided weekly planning experience that converts user intent into repeatable focus sessions.",
    milestone: "Finalize test scripts and publish positioning",
    updatedAt: "Updated 2 hours ago",
    progress: 82,
  },
  {
    id: "project-02",
    businessId: "business-01",
    title: "Recovery Ritual Cards",
    type: "Idea lab",
    status: "Idea",
    summary:
      "A micro-product concept for short-form wellness resets, routines, and premium upsell bundles.",
    milestone: "Validate category fit and monetization assumptions",
    updatedAt: "Updated yesterday",
    progress: 43,
  },
  {
    id: "project-03",
    businessId: "business-01",
    title: "Momentum Check-In Bot",
    type: "Workflow prototype",
    status: "Building",
    summary:
      "A lightweight accountability assistant that nudges users through milestones and streak checkpoints.",
    milestone: "Connect build logic to publish checklist",
    updatedAt: "Updated 3 days ago",
    progress: 61,
  },
  {
    id: "project-04",
    businessId: "business-02",
    title: "Evening Reset Membership",
    type: "Published iteration",
    status: "Testing",
    summary:
      "A retention-focused expansion of calm reset sessions into recurring membership support.",
    milestone: "Review retention prompts and follow-up flows",
    updatedAt: "Updated 4 days ago",
    progress: 76,
  },
  {
    id: "project-05",
    businessId: "business-04",
    title: "Workshop Cohort Builder",
    type: "Learning release",
    status: "Building",
    summary:
      "A cohort-based builder for creator workshops, practical homework loops, and milestone tracking.",
    milestone: "Finalize cohort launch checklist",
    updatedAt: "Updated 5 days ago",
    progress: 67,
  },
];

export const transactions: EdenMockTransaction[] = [
  {
    id: "transaction-01",
    businessId: "business-01",
    userId: "user-02",
    title: "Builder workspace reserve added",
    amountLabel: "+1,200 Leaves",
    creditsDelta: 1200,
    direction: "inflow",
    kind: "wallet",
    detail: "Northstar Habit Lab received a mock Leaves top-up for testing and publish prep.",
    timestamp: "09:42",
  },
  {
    id: "transaction-02",
    userId: "user-01",
    serviceId: "service-01",
    title: "Consumer discovery usage settled",
    amountLabel: "-680 Leaves",
    creditsDelta: -680,
    direction: "outflow",
    kind: "usage",
    detail: "Service routing and discovery placeholders consumed the latest staged batch.",
    timestamp: "09:18",
  },
  {
    id: "transaction-03",
    businessId: "business-01",
    userId: "user-02",
    title: "Publish reserve moved to hold",
    amountLabel: "860 Leaves",
    creditsDelta: 0,
    direction: "reserve",
    kind: "reserve",
    detail: "Leaves were moved into a mock safety hold before publish validation.",
    timestamp: "08:57",
  },
  {
    id: "transaction-04",
    userId: "user-06",
    title: "Owner audit adjustment posted",
    amountLabel: "+140 Leaves",
    creditsDelta: 140,
    direction: "adjustment",
    kind: "adjustment",
    detail: "Manual control-room adjustment applied after a staged discrepancy review.",
    timestamp: "08:25",
  },
  {
    id: "transaction-05",
    businessId: "business-01",
    userId: "user-02",
    title: "AI workspace usage settled",
    amountLabel: "-240 Leaves",
    creditsDelta: -240,
    direction: "outflow",
    kind: "usage",
    detail: "Business assistant and testing placeholders consumed the latest weekly usage batch.",
    timestamp: "Yesterday",
  },
  {
    id: "transaction-06",
    businessId: "business-01",
    userId: "user-02",
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
    businessId: "business-01",
    userId: "user-02",
    title: "Platform fee staging",
    amountLabel: "6% platform fee",
    creditsDelta: 0,
    direction: "outflow",
    kind: "fee",
    detail: "Mock Eden platform fee prepared for the next publish-ready settlement cycle.",
    timestamp: "This month",
  },
];

export const logs: EdenMockLog[] = [
  {
    id: "log-01",
    level: "info",
    source: "router",
    title: "Focus Sprint Planner moved into testing",
    message: "Discovery routes recalculated for the latest consumer prompt batch.",
    timestamp: "2 hours ago",
    businessId: "business-01",
    serviceId: "service-01",
  },
  {
    id: "log-02",
    level: "warn",
    source: "billing",
    title: "Billing model reviewed",
    message: "Reserve threshold touched for one testing workspace during staged load.",
    timestamp: "Yesterday",
    businessId: "business-01",
    userId: "user-02",
  },
  {
    id: "log-03",
    level: "info",
    source: "publish",
    title: "AI description refresh prepared",
    message: "Northstar Habit Lab testing gate advanced to pre-publish review.",
    timestamp: "2 days ago",
    businessId: "business-01",
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

export const ownerDashboardUserIds = ["user-01", "user-02", "user-07", "user-06"];
export const ownerDashboardBusinessIds = ["business-01", "business-02", "business-03", "business-04"];
export const ownerDashboardServiceIds = ["service-02", "service-03", "service-05"];

export function formatCredits(value: number) {
  return formatLeaves(value);
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
import { formatLeaves } from "@/modules/core/credits/eden-currency";

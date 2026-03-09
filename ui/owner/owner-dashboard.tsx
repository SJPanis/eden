"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  isBusinessFrozen,
  isUserFrozen,
  type EdenMockAdminState,
} from "@/modules/core/admin/mock-admin-state";
import { MockAdminActionButton } from "@/modules/core/admin/mock-admin-action-button";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
import {
  getCreditFlowSummary,
  getRecentTransactions,
  getUserCreditsBalance,
} from "@/modules/core/credits/mock-credits";
import { MockResetControls } from "@/modules/core/components/mock-reset-controls";
import { MockTransactionControls } from "@/modules/core/credits/mock-transaction-controls";
import { MockPayoutSettlementButton } from "@/modules/core/payments/mock-payout-settlement-button";
import {
  formatPipelineTimestamp,
  getBusinessPipelineSnapshot,
  getPipelinePublishSummary,
  getPipelineStatusLabel,
  getRecentPipelineEvents,
} from "@/modules/core/pipeline/mock-pipeline";
import {
  formatCredits,
  logs as platformLogs,
  ownerAgentNodes as agentNodes,
  ownerHealthChecks as systemHealthChecks,
  ownerSecurityControls as securityControls,
  ownerSignals as topSignals,
} from "@/modules/core/mock-data";
import type {
  EdenMockAgentStatus,
  EdenMockBusiness,
  EdenMockBusinessStatus,
  EdenMockLogLevel,
  EdenMockPipelineEvent,
  EdenMockPipelineRecord,
  EdenMockReleaseStatus,
  EdenMockSecurityControl,
  EdenMockService,
  EdenMockTransaction,
  EdenMockTransactionDirection,
  EdenMockUser,
  EdenMockUserStatus,
} from "@/modules/core/mock-data";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import type { EdenOwnerPayoutAccountingSummary } from "@/modules/core/services/payout-accounting-service";
import { formatServicePricingLabel } from "@/modules/core/services/service-pricing";
import { ControlRoomSection } from "@/ui/owner/components/control-room-section";

type OwnerDashboardPanelProps = {
  session: EdenMockSession;
  simulatedTransactions: EdenMockTransaction[];
  pipelineRecords: EdenMockPipelineRecord[];
  pipelineEvents: EdenMockPipelineEvent[];
  adminState: EdenMockAdminState;
  simulationBusinessId?: string;
  workspaceServices?: EdenMockWorkspaceServiceState[];
  watchedUsers: EdenMockUser[];
  watchedBusinesses: EdenMockBusiness[];
  watchedServices: EdenMockService[];
  userCatalog: EdenMockUser[];
  businessCatalog: EdenMockBusiness[];
  serviceCatalog: EdenMockService[];
  usageMetrics: {
    totalUsageEvents: number;
    totalCreditsUsed: number;
    source: "persistent" | "mock_fallback";
    topServices: Array<{
      serviceId: string;
      serviceTitle: string;
      businessId: string;
      businessName: string;
      usageCount: number;
      totalCreditsUsed: number;
      lastUsedAtLabel: string;
      pricingModel?: string | null;
      pricePerUseCredits?: number | null;
      pricingUnit?: string | null;
      monetization: {
        estimatedGrossCredits: number;
        estimatedPlatformEarningsCredits: number;
        estimatedBuilderEarningsCredits: number;
        pricingRuleLabel: string;
      };
    }>;
    topBusinesses: Array<{
      businessId: string;
      businessName: string;
      usageCount: number;
      totalCreditsUsed: number;
      topServiceTitle: string;
      lastUsedAtLabel: string;
      monetization: {
        estimatedGrossCredits: number;
        estimatedPlatformEarningsCredits: number;
        estimatedBuilderEarningsCredits: number;
        pricingRuleLabel: string;
      };
    }>;
    topUsers: Array<{
      userId?: string | null;
      userDisplayName: string;
      username?: string | null;
      isAnonymousUser: boolean;
      usageCount: number;
      totalCreditsUsed: number;
      usageSharePercent: number;
      topServiceTitle: string;
      lastUsedAtLabel: string;
      projectedCustomerValueCredits: number;
      perService: Array<{
        serviceId: string;
        serviceTitle: string;
        businessId: string;
        businessName: string;
        usageCount: number;
        totalCreditsUsed: number;
        lastUsedAtLabel: string;
        projectedCustomerValueCredits: number;
      }>;
      monetization: {
        estimatedGrossCredits: number;
        estimatedPlatformEarningsCredits: number;
        estimatedBuilderEarningsCredits: number;
        pricingRuleLabel: string;
      };
    }>;
    recentUserActivity: Array<{
      id: string;
      serviceId: string;
      serviceTitle: string;
      businessId: string;
      businessName: string;
      userId?: string | null;
      userDisplayName: string;
      username?: string | null;
      usageType: string;
      creditsUsed: number;
      estimatedGrossCredits: number;
      timestampLabel: string;
      source: "persistent" | "mock_fallback";
    }>;
    userConcentration: {
      distinctUsers: number;
      anonymousUsageEvents: number;
      topUserSharePercent: number;
      topThreeUsersSharePercent: number;
    };
    monetization: {
      estimatedGrossCredits: number;
      estimatedPlatformEarningsCredits: number;
      estimatedBuilderEarningsCredits: number;
      pricingRuleLabel: string;
    };
  };
  paymentMetrics: {
    source: "persistent" | "mock_fallback";
    totalPayments: number;
    pendingCount: number;
    settledCount: number;
    failedCount: number;
    canceledCount: number;
    totalCreditsSettled: number;
    totalSettledAmountCents: number;
    recentPayments: Array<{
      id: string;
      provider: string;
      providerLabel: string;
      providerSessionId: string;
      providerPaymentIntentId?: string | null;
      userId?: string | null;
      creditsAmount: number;
      amountCents: number;
      currency: string;
      status: "pending" | "settled" | "failed" | "canceled";
      createdAtLabel: string;
      settledAtLabel?: string | null;
      failureReason?: string | null;
    }>;
    paymentEventLogsSource: "persistent" | "mock_fallback";
    recentEventLogCount: number;
    recentEventLogs: Array<{
      id: string;
      provider: string;
      eventType: string;
      eventTypeLabel: string;
      providerEventId?: string | null;
      providerSessionId?: string | null;
      creditsTopUpPaymentId?: string | null;
      status: "info" | "success" | "skipped" | "failed";
      createdAtLabel: string;
      metadataSummary: string[];
    }>;
  };
  payoutAccounting: EdenOwnerPayoutAccountingSummary;
};

type CreditActivity = {
  id: string;
  title: string;
  amount: string;
  direction: EdenMockTransactionDirection;
  detail: string;
  timestamp: string;
  simulated?: boolean;
};

const sectionLinks = [
  { id: "system-overview", label: "System Overview" },
  { id: "users", label: "Users" },
  { id: "businesses", label: "Businesses" },
  { id: "services", label: "Services" },
  { id: "release-activity", label: "Release Activity" },
  { id: "transaction-flow", label: "Transaction Flow" },
  { id: "agent-system-status", label: "Agent System Status" },
  { id: "system-logs", label: "System Logs" },
  { id: "security-controls", label: "Security Controls" },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getUserStatusClasses(status: EdenMockUserStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "review") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getBusinessStatusClasses(status: EdenMockBusinessStatus) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "testing") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getAdminStateClasses(state: "active" | "frozen" | "maintenance") {
  if (state === "frozen") return "border-rose-200 bg-rose-50 text-rose-700";
  if (state === "maintenance") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getReleaseStatusClasses(status: EdenMockReleaseStatus) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ready") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "testing") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getAgentStatusClasses(status: EdenMockAgentStatus) {
  if (status === "healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "busy") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getLogLevelClasses(level: EdenMockLogLevel) {
  if (level === "info") return "bg-sky-100 text-sky-700";
  if (level === "warn") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getCreditDirectionClasses(direction: CreditActivity["direction"]) {
  if (direction === "inflow") return "bg-emerald-100 text-emerald-700";
  if (direction === "outflow") return "bg-rose-100 text-rose-700";
  if (direction === "reserve") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function getPaymentStatusClasses(status: "pending" | "settled" | "failed" | "canceled") {
  if (status === "settled") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getPaymentEventStatusClasses(
  status: "info" | "success" | "skipped" | "failed",
) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "skipped") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getPayoutSettlementStatusClasses(
  status: "pending" | "settled" | "canceled",
) {
  if (status === "settled") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatPayoutSettlementStatus(status: "pending" | "settled" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatMoneyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function getServicePricingDisplay(input: {
  pricingModel?: string | null;
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
}) {
  return formatServicePricingLabel(
    {
      pricingModel: input.pricingModel,
      pricePerUse: input.pricePerUse,
      pricingType: input.pricingType,
      pricingUnit: input.pricingUnit,
    },
    {
      fallbackLabel: input.pricingModel ?? "Not priced yet",
      includePricingModel: Boolean(input.pricingModel),
    },
  );
}

function getFallbackReleaseStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("publish")) return "published" as const;
  if (normalized.includes("ready")) return "ready" as const;
  if (normalized.includes("testing")) return "testing" as const;
  return "draft" as const;
}

export function OwnerDashboardPanel({
  session,
  simulatedTransactions,
  pipelineRecords,
  pipelineEvents,
  adminState,
  simulationBusinessId,
  workspaceServices = [],
  watchedUsers,
  watchedBusinesses,
  watchedServices,
  userCatalog,
  businessCatalog,
  serviceCatalog,
  usageMetrics,
  paymentMetrics,
  payoutAccounting,
}: OwnerDashboardPanelProps) {
  const users = watchedUsers;
  const businesses = watchedBusinesses;
  const baseServices = watchedServices;
  const userLookup = new Map(userCatalog.map((user) => [user.id, user]));
  const businessLookup = new Map(businessCatalog.map((business) => [business.id, business]));
  const serviceLookup = new Map(serviceCatalog.map((service) => [service.id, service]));
  const getCatalogUserById = (userId?: string | null) =>
    userId ? userLookup.get(userId) ?? null : null;
  const getCatalogBusinessById = (businessId?: string | null) =>
    businessId ? businessLookup.get(businessId) ?? null : null;
  const getCatalogServiceById = (serviceId?: string | null) =>
    serviceId ? serviceLookup.get(serviceId) ?? null : null;
  const getUserDisplayLabel = (userId?: string | null) => {
    if (!userId) {
      return "Unlinked user";
    }

    const user = getCatalogUserById(userId);
    return user ? `${user.displayName} (@${user.username})` : `Unknown user (${userId})`;
  };
  const scopedBusinessIds = businesses.map((business) => business.id);
  const creditFlow = getCreditFlowSummary(simulatedTransactions);
  const simulationBusiness = simulationBusinessId
    ? getCatalogBusinessById(simulationBusinessId)
    : null;
  const maintenanceMode = adminState.maintenanceMode;
  const frozenUsersCount = adminState.frozenUserIds.length;
  const frozenBusinessesCount = adminState.frozenBusinessIds.length;
  const auditLogsControl =
    securityControls.find((control) => control.id === "security-04") ??
    ({
      id: "security-audit",
      title: "Audit logs",
      description: "Open a placeholder trail of owner actions, ledger changes, and system escalations.",
      stateLabel: "Streaming",
      actionLabel: "Open Audit Logs",
    } satisfies EdenMockSecurityControl);
  const ownerSignalsDisplay = topSignals.map((signal) => {
    if (signal.id === "signal-01") {
      return {
        ...signal,
        value: maintenanceMode ? "On" : "Off",
        detail: maintenanceMode
          ? "Mock maintenance mode is active across the platform shell."
          : "Public routes continue in normal mock mode.",
      };
    }

    return signal;
  });

  const businessCards = businesses.map((business) => {
    const snapshot = getBusinessPipelineSnapshot(
      { businessId: business.id, userId: business.ownerUserId },
      simulatedTransactions,
      pipelineRecords,
      undefined,
      workspaceServices,
    );
    const latestEvent =
      getRecentPipelineEvents({ businessId: business.id, limit: 1 }, pipelineEvents)[0] ?? null;

    return {
      business,
      ownerName: getCatalogUserById(business.ownerUserId)?.displayName ?? "Unknown owner",
      isFrozen: isBusinessFrozen(business.id, adminState),
      snapshot,
      latestEvent,
    };
  });

  const services = Array.from(
    new Map(
      [
        ...baseServices,
        ...businessCards.map(
          (entry) =>
            getCatalogServiceById(entry.snapshot?.serviceId ?? entry.business.featuredServiceId) ??
            entry.snapshot?.service,
        ),
      ]
        .filter((service): service is EdenMockService => Boolean(service))
        .map((service) => [service.id, service]),
    ).values(),
  ).map((service) => {
    const business = getCatalogBusinessById(service.businessId);
    const latestEvent =
      getRecentPipelineEvents({ serviceId: service.id, limit: 1 }, pipelineEvents)[0] ?? null;
    const linkedBusiness = businessCards.find(
      (entry) =>
        entry.business.id === business?.id ||
        entry.business.id === service.businessId ||
        entry.snapshot?.serviceId === service.id,
    );

    return {
      service,
      businessName: business?.name ?? "Connected Business",
      businessFrozen: business ? isBusinessFrozen(business.id, adminState) : false,
      releaseStatus:
        linkedBusiness?.snapshot?.status ?? getFallbackReleaseStatus(service.status),
      latestEvent,
    };
  });

  const publishSummary = getPipelinePublishSummary(
    { businessIds: scopedBusinessIds },
    pipelineRecords,
    pipelineEvents,
  );
  const releaseEvents = getRecentPipelineEvents(
    { businessIds: scopedBusinessIds, limit: 6 },
    pipelineEvents,
  );
  const creditActivity: CreditActivity[] = getRecentTransactions(
    { limit: 8 },
    simulatedTransactions,
  ).map((transaction) => ({
    id: transaction.id,
    title: transaction.title,
    amount: transaction.amountLabel,
    direction: transaction.direction,
    detail: transaction.detail,
    timestamp: transaction.timestamp,
    simulated: transaction.simulated,
  }));
  const overviewMetrics = [
    {
      id: "overview-users",
      label: "Total users",
      value: `${userCatalog.length}`,
      detail: "Shared mock accounts spanning consumer, business, and owner roles.",
    },
    {
      id: "overview-businesses",
      label: "Total businesses",
      value: `${businessCatalog.length}`,
      detail: "Mock business workspaces currently staged across draft, testing, ready, and published states.",
    },
    {
      id: "overview-services",
      label: "Total services",
      value: `${serviceCatalog.length}`,
      detail: "Published and staged service catalog entries visible to owner monitoring surfaces.",
    },
    {
      id: "overview-credits",
      label: "Eden credit flow",
      value: `+${formatCredits(creditFlow.inflow)} / -${formatCredits(creditFlow.outflow)}`,
      detail: "Shared placeholder credit movement across wallet top-ups, usage, reserves, and adjustments.",
    },
    {
      id: "overview-health",
      label: "System health",
      value: maintenanceMode
        ? "Maintenance"
        : systemHealthChecks.some((check) => check.status === "Watch")
          ? "Watch state"
          : "Stable",
      detail: maintenanceMode
        ? "The owner layer has enabled a mock maintenance banner across the platform shell."
        : "Mock aggregate platform health across routing, ledger, publish, and agent systems.",
    },
    {
      id: "overview-usage-events",
      label: "Tracked service runs",
      value: `${usageMetrics.totalUsageEvents}`,
      detail:
        usageMetrics.source === "persistent"
          ? "Persisted ServiceUsage rows recorded through the current mock execution boundary."
          : "Fallback count derived from the shared mock usage ledger until persistent rows are available.",
    },
    {
      id: "overview-usage-credits",
      label: "Usage credits tracked",
      value: formatCredits(usageMetrics.totalCreditsUsed),
      detail:
        usageMetrics.source === "persistent"
          ? "Credits attached to persisted service usage events for early monetization reporting."
          : "Credits estimated from usage transactions while Prisma-backed usage records are unavailable.",
    },
    {
      id: "overview-platform-earnings",
      label: "Estimated Eden earnings",
      value: formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits),
      detail: "Platform fee projection derived from stored per-use service pricing where available.",
    },
    {
      id: "overview-builder-earnings",
      label: "Estimated builder earnings",
      value: formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits),
      detail: "Builder net earnings projection after the Eden fee share using current service pricing.",
    },
  ];
  const releaseSummaryCards = [
    {
      id: "release-summary-live",
      label: "Live releases",
      value: `${publishSummary.publishedCount}`,
      detail: "Currently published watched businesses.",
    },
    {
      id: "release-summary-ready",
      label: "Ready queue",
      value: `${publishSummary.readyCount}`,
      detail: "Release targets ready to publish next.",
    },
    {
      id: "release-summary-testing",
      label: "Testing queue",
      value: `${publishSummary.testingCount}`,
      detail: "Businesses still in mocked QA and review.",
    },
    {
      id: "release-summary-events",
      label: "Publish events",
      value: `${publishSummary.publishEventsCount}`,
      detail: publishSummary.latestPublishEvent
        ? `Latest publish: ${formatPipelineTimestamp(publishSummary.latestPublishEvent.timestamp)}.`
        : "No publish transitions recorded yet.",
    },
  ];
  const creditSummary = [
    {
      label: "Credits issued",
      value: formatCredits(creditFlow.inflow),
      detail: "Mock distribution to users, businesses, and owner test accounts.",
    },
    {
      label: "Credits consumed",
      value: formatCredits(creditFlow.outflow),
      detail: "Placeholder usage from AI routing, service discovery, and workspace actions.",
    },
    {
      label: "Reserve held",
      value: formatCredits(creditFlow.reserve),
      detail: "Credits reserved for publish staging, safety holds, and owner review buffers.",
    },
    {
      label: "Net movement",
      value: `${creditFlow.net >= 0 ? "+" : "-"}${formatCredits(Math.abs(creditFlow.net))}`,
      detail: "Net mock balance movement after inflow, usage, and owner-side adjustments.",
    },
  ];
  const paymentSummaryCards = [
    {
      id: "payments-pending",
      label: "Pending top-ups",
      value: `${paymentMetrics.pendingCount}`,
      detail: "Checkout sessions created but not yet settled by Stripe webhook delivery.",
    },
    {
      id: "payments-settled",
      label: "Settled top-ups",
      value: `${paymentMetrics.settledCount}`,
      detail: "Payment records authoritatively settled through the Stripe webhook path.",
    },
    {
      id: "payments-needs-review",
      label: "Failed or canceled",
      value: `${paymentMetrics.failedCount + paymentMetrics.canceledCount}`,
      detail: "Top-ups that did not settle and may need owner review or retry guidance.",
    },
    {
      id: "payments-credits",
      label: "Credits settled",
      value: formatCredits(paymentMetrics.totalCreditsSettled),
      detail: `${formatMoneyAmount(
        paymentMetrics.totalSettledAmountCents,
        "usd",
      )} processed through the persistent top-up ledger.`,
    },
  ];
  const payoutSummaryCards = [
    {
      id: "payout-liability",
      label: "Total builder liability",
      value: formatCredits(payoutAccounting.totalBuilderLiabilityCredits),
      detail: "Current unpaid builder earnings liability after persistent payout settlements are applied.",
    },
    {
      id: "payout-ready",
      label: "Payout-ready total",
      value: formatCredits(payoutAccounting.totalPayoutReadyCredits),
      detail: "Accrued earnings available after the current internal reserve holdback.",
    },
    {
      id: "payout-pending",
      label: "Pending settlements",
      value: formatCredits(payoutAccounting.pendingSettlementCredits),
      detail: "Internal payout records queued but not yet marked as settled.",
    },
    {
      id: "payout-fee-share",
      label: "Eden fee share",
      value: formatCredits(payoutAccounting.edenFeeShareCredits),
      detail: "Platform share derived from the same pricing-based earnings calculation.",
    },
    {
      id: "payout-holdback",
      label: "Reserve holdback",
      value: formatCredits(payoutAccounting.holdbackCredits),
      detail: "Internal reserve held before earnings become payout-ready.",
    },
    {
      id: "payout-paid-out",
      label: "Paid out",
      value: formatCredits(payoutAccounting.paidOutCredits),
      detail: "Persistent payout settlement total already marked as paid out.",
    },
  ];
  const adminSummaryStrip = [
    {
      id: "admin-summary-maintenance",
      label: "Maintenance mode",
      value: maintenanceMode ? "On" : "Off",
      detail: maintenanceMode
        ? "Platform shell maintenance banner is currently active."
        : "Platform shell is running in normal mock mode.",
      tone: maintenanceMode ? getAdminStateClasses("maintenance") : getAdminStateClasses("active"),
    },
    {
      id: "admin-summary-users",
      label: "Frozen users",
      value: `${frozenUsersCount}`,
      detail: "Accounts currently under a local owner freeze overlay.",
      tone: frozenUsersCount ? getAdminStateClasses("frozen") : getAdminStateClasses("active"),
    },
    {
      id: "admin-summary-businesses",
      label: "Frozen businesses",
      value: `${frozenBusinessesCount}`,
      detail: "Business workspaces currently flagged by the owner layer.",
      tone: frozenBusinessesCount ? getAdminStateClasses("frozen") : getAdminStateClasses("active"),
    },
    {
      id: "admin-summary-events",
      label: "Recent release events",
      value: `${releaseEvents.length}`,
      detail: "Latest shared mocked transitions currently visible to the control room.",
      tone: getReleaseStatusClasses(releaseEvents[0]?.newStatus ?? "draft"),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden rounded-[32px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(254,243,199,0.9),rgba(255,255,255,0.97)_52%,rgba(219,234,254,0.9))] p-5 md:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">Owner Layer</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
              Eden Control Room
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
              Central owner console for monitoring the platform, release state, and mocked cross-layer activity.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {sectionLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="rounded-full border border-eden-edge bg-white/80 px-3 py-2 text-xs font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ownerSignalsDisplay.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-eden-edge bg-white/82 p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{signal.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-eden-ink">{signal.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2"
          >
            {overviewMetrics.slice(0, 4).map((metric) => (
              <motion.article
                key={metric.id}
                variants={cardVariants}
                className="rounded-2xl border border-eden-edge bg-white/84 p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">{metric.detail}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 lg:grid-cols-4"
      >
        {adminSummaryStrip.map((item) => (
          <motion.article
            key={item.id}
            variants={cardVariants}
            className="rounded-2xl border border-eden-edge bg-white/92 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-eden-ink">{item.value}</p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${item.tone}`}
              >
                {item.value}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
          </motion.article>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]"
      >
        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <ControlRoomSection
            id="system-overview"
            eyebrow="System Overview"
            title="Platform-wide snapshot"
            description="Owner-facing rollup for user count, business volume, credit flow, and current release visibility."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Mock control feed
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-5"
            >
              {overviewMetrics.map((metric) => (
                <motion.article
                  key={metric.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{metric.detail}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Health monitors</p>
                <div className="mt-4 space-y-3">
                  {systemHealthChecks.map((check) => (
                    <div key={check.label} className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-eden-ink">{check.label}</p>
                        <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                          {check.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,237,213,0.62),rgba(255,255,255,0.96))] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Owner watchlist</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-eden-muted">
                  <p>{publishSummary.testingCount} watched releases remain in testing.</p>
                  <p>{publishSummary.readyCount} release targets are ready for publish.</p>
                  <p>
                    Frozen users: {frozenUsersCount}. Frozen businesses: {frozenBusinessesCount}.
                  </p>
                  <p>
                    Latest publish:{" "}
                    {publishSummary.latestPublishEvent
                      ? `${formatPipelineTimestamp(publishSummary.latestPublishEvent.timestamp)} by ${publishSummary.latestPublishEvent.actor}.`
                      : "No publish events recorded yet."}
                  </p>
                </div>
              </div>
            </div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="users"
            eyebrow="Users"
            title="Account monitoring"
            description="Mock user accounts with status, role, and Eden balance visibility for owner review."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {users.length} records
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {users.map((user) => (
                <motion.article
                  key={user.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  {(() => {
                    const userFrozen = isUserFrozen(user.id, adminState);
                    const userStatus = userFrozen ? "frozen" : user.status;

                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/owner/users/${user.id}`}
                              className="text-sm font-semibold text-eden-ink transition-colors hover:text-eden-accent"
                            >
                              {user.username}
                            </Link>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                              {toTitleCase(user.role)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getUserStatusClasses(
                              userStatus,
                            )}`}
                          >
                            {toTitleCase(userStatus)}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-eden-edge bg-eden-bg/60 px-3 py-2">
                          <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">Eden balance</span>
                          <span className="text-sm font-semibold text-eden-ink">
                            {formatCredits(getUserCreditsBalance(user.id, simulatedTransactions))}
                          </span>
                        </div>
                        <div className="mt-3">
                          <MockAdminActionButton
                            action={userFrozen ? "unfreeze_user" : "freeze_user"}
                            userId={user.id}
                            label={userFrozen ? "Unfreeze User" : "Freeze User"}
                            detail={
                              userFrozen
                                ? "Remove the local frozen-user flag for this account."
                                : "Mark this account as frozen in the local mock admin state."
                            }
                            className={
                              userFrozen
                                ? "w-full border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                                : "w-full border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100"
                            }
                          />
                        </div>
                      </>
                    );
                  })()}
                </motion.article>
              ))}
            </motion.div>
          </ControlRoomSection>
        </motion.div>
        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="businesses"
            eyebrow="Businesses"
            title="Business workspace monitoring"
            description="Current release state and latest transition visibility for watched businesses."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {businessCards.length} watched
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3"
            >
              {businessCards.map((entry) => {
                const releaseStatus =
                  entry.snapshot?.status ?? getFallbackReleaseStatus(entry.business.status);

                return (
                  <motion.article
                    key={entry.business.id}
                    variants={cardVariants}
                    className="rounded-2xl border border-eden-edge bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/businesses/${entry.business.id}`}
                          className="text-sm font-semibold text-eden-ink transition-colors hover:text-eden-accent"
                        >
                          {entry.business.name}
                        </Link>
                        <p className="mt-1 text-sm text-eden-muted">Owner: {entry.ownerName}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          entry.isFrozen
                            ? getAdminStateClasses("frozen")
                            : getReleaseStatusClasses(releaseStatus)
                        }`}
                      >
                        {entry.isFrozen ? "Frozen" : getPipelineStatusLabel(releaseStatus)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                        {entry.business.category}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getBusinessStatusClasses(
                          entry.business.status,
                        )}`}
                      >
                        Workspace {toTitleCase(entry.business.status)}
                      </span>
                      {entry.isFrozen ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-rose-700">
                          Owner hold
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-emerald-700">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Active service</p>
                        <p className="mt-2 text-sm font-semibold text-eden-ink">
                            {getCatalogServiceById(
                              entry.snapshot?.serviceId ?? entry.business.featuredServiceId,
                            )?.title ??
                              entry.snapshot?.service?.title ??
                              "Active service"}
                          </p>
                      </div>
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Readiness</p>
                        <p className="mt-2 text-sm font-semibold text-eden-ink">
                          {entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.28),rgba(255,255,255,0.96))] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Latest release activity</p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {entry.latestEvent
                          ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} -> ${getPipelineStatusLabel(entry.latestEvent.newStatus)}`
                          : "Seeded from shared mock data"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">
                        {entry.latestEvent?.detail ??
                          "No local transition recorded yet for this watched business."}
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Link
                          href={`/owner/payouts/${entry.business.id}`}
                          className="rounded-xl border border-eden-edge bg-white px-3 py-2 text-sm font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
                        >
                          Open Payout Detail
                        </Link>
                        <Link
                          href={`/businesses/${entry.business.id}`}
                          className="rounded-xl border border-eden-edge bg-eden-bg px-3 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                        >
                          Open Business
                        </Link>
                      </div>
                      <MockAdminActionButton
                        action={entry.isFrozen ? "unfreeze_business" : "freeze_business"}
                        businessId={entry.business.id}
                        label={entry.isFrozen ? "Unfreeze Business" : "Freeze Business"}
                        detail={
                          entry.isFrozen
                            ? "Remove the local business freeze flag and return this workspace to active mock mode."
                            : "Mark this business as frozen in local admin state."
                        }
                        className={
                          entry.isFrozen
                            ? "w-full border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                            : "w-full border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100"
                        }
                      />
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="services"
            eyebrow="Services"
            title="Service release visibility"
            description="Relevant mocked services with current release state and latest transition context."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {services.length} monitored
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 sm:grid-cols-2"
            >
              {services.map((entry) => (
                <motion.article
                  key={entry.service.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <Link
                    href={`/services/${entry.service.id}`}
                    className="text-sm font-semibold text-eden-ink transition-colors hover:text-eden-accent"
                  >
                    {entry.service.title}
                  </Link>
                  <p className="mt-2 text-sm text-eden-muted">Business: {entry.businessName}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                      {entry.service.category}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getReleaseStatusClasses(
                        entry.releaseStatus,
                      )}`}
                    >
                      {getPipelineStatusLabel(entry.releaseStatus)}
                    </span>
                    {entry.businessFrozen ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-rose-700">
                        Business frozen
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Latest transition</p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {entry.latestEvent
                        ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} -> ${getPipelineStatusLabel(entry.latestEvent.newStatus)}`
                        : entry.service.status}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      {entry.latestEvent?.detail ??
                        "No service-specific transition has been simulated yet."}
                    </p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <ControlRoomSection
            id="release-activity"
            eyebrow="Release Activity"
            title="Mocked pipeline event history"
            description="Owner visibility into publish queue movement and recent status transitions across watched businesses."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {releaseEvents.length} recent events
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-4"
            >
              {releaseSummaryCards.map((item) => (
                <motion.article
                  key={item.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </motion.article>
              ))}
            </motion.div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {releaseEvents.map((event) => {
                  const business = getCatalogBusinessById(event.businessId);
                  const service = getCatalogServiceById(event.serviceId);

                  return (
                    <motion.article
                      key={event.id}
                      variants={cardVariants}
                      className="rounded-2xl border border-eden-edge bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-eden-ink">
                              {business?.name ?? "Business"} / {service?.title ?? "Service"}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getReleaseStatusClasses(
                                event.newStatus,
                              )}`}
                            >
                              {getPipelineStatusLabel(event.newStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-eden-muted">{event.detail}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                            {getPipelineStatusLabel(event.previousStatus)} to {getPipelineStatusLabel(event.newStatus)} by {event.actor}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Timestamp</p>
                          <p className="mt-1 text-sm font-semibold text-eden-ink">
                            {formatPipelineTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,237,213,0.48),rgba(255,255,255,0.96))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Latest publish</p>
                  <p className="mt-2 text-lg font-semibold text-eden-ink">
                    {publishSummary.latestPublishEvent
                      ? getCatalogServiceById(publishSummary.latestPublishEvent.serviceId)?.title ??
                        "Published service"
                      : "No publish recorded"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {publishSummary.latestPublishEvent?.detail ??
                      "The owner release feed will show publish history here after a mocked publish action is triggered."}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                    {publishSummary.latestPublishEvent
                      ? `${publishSummary.latestPublishEvent.actor} - ${formatPipelineTimestamp(publishSummary.latestPublishEvent.timestamp)}`
                      : "Waiting for mock activity"}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Current release queue</p>
                  <div className="mt-4 space-y-3">
                    {businessCards.map((entry) => {
                      const releaseStatus =
                        entry.snapshot?.status ?? getFallbackReleaseStatus(entry.business.status);

                      return (
                        <div key={`queue-${entry.business.id}`} className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-eden-ink">{entry.business.name}</p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                entry.isFrozen
                                  ? getAdminStateClasses("frozen")
                                  : getReleaseStatusClasses(releaseStatus)
                              }`}
                            >
                              {entry.isFrozen ? "Frozen" : getPipelineStatusLabel(releaseStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-eden-muted">
                            {getCatalogServiceById(
                              entry.snapshot?.serviceId ?? entry.business.featuredServiceId,
                            )?.title ??
                              entry.snapshot?.service?.title ??
                              "Active service"}{" "}
                            is at {entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}% readiness.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="agent-system-status"
            eyebrow="Agent System Status"
            title="Agent nodes and activity"
            description="Mock node health, queue depth, and current activity across the Eden agent surface."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {agentNodes.length} nodes
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3"
            >
              {agentNodes.map((node) => (
                <motion.article
                  key={node.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">{node.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">{node.queueDepth}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getAgentStatusClasses(
                        node.status,
                      )}`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">{node.activity}</p>
                </motion.article>
              ))}
            </motion.div>
          </ControlRoomSection>
        </motion.div>
        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <ControlRoomSection
            id="transaction-flow"
            eyebrow="Transaction Flow"
            title="Eden credit movement"
            description="Owner-facing placeholder activity showing how credits move across issuing, spending, holds, and adjustments."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Ledger mock mode
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-4"
            >
              {creditSummary.map((item) => (
                <motion.article
                  key={item.label}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </motion.article>
              ))}
            </motion.div>
            <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Recent credit activity</p>
              <div className="mt-4 space-y-3">
                {creditActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-3 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-eden-ink">{activity.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getCreditDirectionClasses(
                            activity.direction,
                          )}`}
                        >
                          {activity.direction}
                        </span>
                        {activity.simulated ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                            Local mock
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{activity.detail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-semibold text-eden-ink">{activity.amount}</p>
                      <p className="mt-1 text-xs text-eden-muted">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Payment reconciliation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">
                        Persistent credits top-up records from the Stripe-backed settlement path.
                      </p>
                    </div>
                    <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                      {paymentMetrics.source === "persistent"
                        ? "Persistent payment ledger"
                        : "Fallback empty state"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {paymentSummaryCards.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-eden-ink">{item.value}</p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Recent top-up payments
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      Owner inspection of pending, settled, failed, and canceled Eden Credits top-ups.
                    </p>
                  </div>
                  <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                    {paymentMetrics.totalPayments} records
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {paymentMetrics.recentPayments.length ? (
                    paymentMetrics.recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {payment.providerLabel}
                              </p>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPaymentStatusClasses(
                                  payment.status,
                                )}`}
                              >
                                {payment.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {getUserDisplayLabel(payment.userId)}
                            </p>
                            <div className="mt-2 space-y-1 text-xs leading-5 text-eden-muted">
                              <p className="break-all">
                                Session: <span className="font-mono">{payment.providerSessionId}</span>
                              </p>
                              {payment.providerPaymentIntentId ? (
                                <p className="break-all">
                                  Payment intent:{" "}
                                  <span className="font-mono">{payment.providerPaymentIntentId}</span>
                                </p>
                              ) : null}
                              <p>
                                Created: {payment.createdAtLabel}
                                {payment.settledAtLabel
                                  ? ` | Settled: ${payment.settledAtLabel}`
                                  : ""}
                              </p>
                              {payment.failureReason ? (
                                <p>Reason: {payment.failureReason}</p>
                              ) : null}
                            </div>
                            <div className="mt-3">
                              <Link
                                href={`/owner/payments/${payment.id}`}
                                className="inline-flex rounded-full border border-eden-edge bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
                              >
                                Open payment detail
                              </Link>
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {formatCredits(payment.creditsAmount)}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              {formatMoneyAmount(payment.amountCents, payment.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      No persistent top-up payment records are available yet. Once Stripe-backed
                      checkout sessions are created, the webhook settlement feed will appear here.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Payment lifecycle events
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Best-effort persistent event logs for Stripe checkout creation, webhook receipt,
                    settlement, skipped duplicate settlement, and settlement failures.
                  </p>
                </div>
                <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                  {paymentMetrics.paymentEventLogsSource === "persistent"
                    ? `${paymentMetrics.recentEventLogCount} recent events`
                    : "Fallback empty state"}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {paymentMetrics.recentEventLogs.length ? (
                  paymentMetrics.recentEventLogs.map((eventLog) => (
                    <div
                      key={eventLog.id}
                      className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-eden-ink">
                              {eventLog.eventTypeLabel}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPaymentEventStatusClasses(
                                eventLog.status,
                              )}`}
                            >
                              {eventLog.status}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs leading-5 text-eden-muted">
                            <p>Provider: {eventLog.provider}</p>
                            {eventLog.providerEventId ? (
                              <p className="break-all">
                                Event: <span className="font-mono">{eventLog.providerEventId}</span>
                              </p>
                            ) : null}
                            {eventLog.providerSessionId ? (
                              <p className="break-all">
                                Session:{" "}
                                <span className="font-mono">{eventLog.providerSessionId}</span>
                              </p>
                            ) : null}
                          {eventLog.creditsTopUpPaymentId ? (
                            <p className="break-all">
                              Payment record:{" "}
                              <span className="font-mono">{eventLog.creditsTopUpPaymentId}</span>
                            </p>
                          ) : null}
                        </div>
                        {eventLog.metadataSummary.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                              {eventLog.metadataSummary.map((summaryLine) => (
                                <span
                                  key={`${eventLog.id}-${summaryLine}`}
                                  className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted"
                                >
                                  {summaryLine}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {eventLog.creditsTopUpPaymentId ? (
                            <div className="mt-3">
                              <Link
                                href={`/owner/payments/${eventLog.creditsTopUpPaymentId}`}
                                className="inline-flex rounded-full border border-eden-edge bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
                              >
                                Open payment detail
                              </Link>
                            </div>
                          ) : null}
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                            Logged
                          </p>
                          <p className="mt-1 text-sm font-semibold text-eden-ink">
                            {eventLog.createdAtLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                    No persistent payment lifecycle events are available yet. Once Stripe checkout
                    and webhook events occur, the owner layer will surface the recorded lifecycle
                    trail here.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Builder payout accounting
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {payoutAccounting.accountingRuleLabel}
                  </p>
                </div>
                <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-xs text-eden-muted">
                  {payoutAccounting.payoutStatusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {payoutSummaryCards.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-eden-edge bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Payout history
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      Recent persistent payout settlement records used to reconcile builder liability and paid-out balances.
                    </p>
                  </div>
                  <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                    {payoutAccounting.historySource === "persistent"
                      ? "Persistent records"
                      : "No persistent records"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.payoutHistory.length ? (
                    payoutAccounting.payoutHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {item.businessName}
                              </p>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPayoutSettlementStatusClasses(
                                  item.status,
                                )}`}
                              >
                                {formatPayoutSettlementStatus(item.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {formatCredits(item.amountCredits)} | {item.reference ?? "No reference"}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              {item.notes ?? "Internal settlement note not provided."}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">{item.createdAtLabel}</p>
                            <p className="mt-1 text-xs text-eden-muted">
                              {item.settledAtLabel
                                ? `Settled ${item.settledAtLabel}`
                                : "Awaiting settlement"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      No payout settlement records exist yet. Use the internal payout action below to create persistent payout history without enabling real payout rails.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout status overview
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Settled payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.settledCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.settledSettlementCredits,
                      )} recorded as paid
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Pending payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.pendingCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.pendingSettlementCredits,
                      )} still queued
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Canceled payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.canceledCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.canceledSettlementCredits,
                      )} removed from queue
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Current state
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.payoutStatusLabel}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      Liability {formatCredits(payoutAccounting.totalBuilderLiabilityCredits)} | Ready{" "}
                      {formatCredits(payoutAccounting.totalPayoutReadyCredits)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Usage earnings snapshot
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {usageMetrics.monetization.pricingRuleLabel}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Tracked runs</p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">{usageMetrics.totalUsageEvents}</p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Usage credits</p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.totalCreditsUsed)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Eden earnings</p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Builder earnings</p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Top services by usage
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.topServices.length ? (
                      usageMetrics.topServices.map((service) => (
                        <div
                          key={service.serviceId}
                          className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-eden-ink">{service.serviceTitle}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                                {service.businessName}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-eden-muted">
                                {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                              </p>
                              <p className="mt-2 text-sm leading-6 text-eden-muted">
                                Current rate:{" "}
                                {getServicePricingDisplay({
                                  pricingModel: service.pricingModel,
                                  pricePerUse: service.pricePerUseCredits,
                                  pricingUnit: service.pricingUnit,
                                })}
                              </p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-sm font-semibold text-eden-ink">
                                {formatCredits(service.monetization.estimatedPlatformEarningsCredits)}
                              </p>
                              <p className="mt-1 text-xs text-eden-muted">Eden fee share</p>
                              <p className="mt-2 text-xs text-eden-muted">
                                Gross: {formatCredits(service.monetization.estimatedGrossCredits)}
                              </p>
                              <p className="mt-2 text-xs text-eden-muted">{service.lastUsedAtLabel}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                        No service usage has been tracked yet. The leaderboard will populate after mocked service runs are recorded.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top earning businesses
                </p>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.topEarningBusinesses.length ? (
                    payoutAccounting.topEarningBusinesses.map((business) => (
                      <div
                        key={business.businessId}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-eden-ink">{business.businessName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                              Top service: {business.topServiceTitle}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {business.usageCount} runs | {formatCredits(business.totalCreditsUsed)} used
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Unpaid earnings: {formatCredits(business.unpaidEarningsCredits)}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Paid out: {formatCredits(business.paidOutCredits)}
                              {business.pendingSettlementCredits > 0
                                ? ` | Pending ${formatCredits(business.pendingSettlementCredits)}`
                                : ""}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {formatCredits(business.payoutReadyCredits)}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">Payout-ready</p>
                            <p className="mt-2 text-xs text-eden-muted">
                              Eden fee share: {formatCredits(business.edenFeeShareCredits)}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">{business.lastUsedAtLabel}</p>
                          </div>
                        </div>
                        {business.payoutReadyCredits > 0 ? (
                          <div className="mt-3 space-y-2">
                            <Link
                              href={`/owner/payouts/${business.businessId}`}
                              className="block rounded-2xl border border-eden-edge bg-white px-3 py-3 text-sm font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
                            >
                              Open payout detail
                            </Link>
                            <MockPayoutSettlementButton
                              businessId={business.businessId}
                              amountCredits={business.payoutReadyCredits}
                              label="Record mock payout settlement"
                              detail={`Mark ${formatCredits(
                                business.payoutReadyCredits,
                              )} as paid out for ${business.businessName}. This only writes an internal settlement record.`}
                              reference={`owner-payout-${business.businessId}`}
                              notes={`Owner control-room settlement for ${business.businessName}`}
                              className="w-full border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                            />
                          </div>
                        ) : (
                          <div className="mt-3">
                            <Link
                              href={`/owner/payouts/${business.businessId}`}
                              className="block rounded-2xl border border-eden-edge bg-white px-3 py-3 text-sm font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
                            >
                              Open payout detail
                            </Link>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      Earning rankings will appear here after the platform records priced service usage.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top users by platform usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.topUsers.length ? (
                    usageMetrics.topUsers.map((user) => (
                      <div
                        key={user.userId ?? `guest-${user.userDisplayName}`}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {user.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                                {user.isAnonymousUser
                                  ? "Guest"
                                  : user.username
                                    ? `@${user.username}`
                                    : "User"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {user.usageCount} runs across {user.perService.length} service
                              {user.perService.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Top service: {user.topServiceTitle}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Estimated customer value:{" "}
                              {formatCredits(user.projectedCustomerValueCredits)}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {user.usageSharePercent}% of tracked runs
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              Builder earnings:{" "}
                              {formatCredits(user.monetization.estimatedBuilderEarningsCredits)}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">{user.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      User rankings will populate after platform usage events are recorded.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Usage concentration by user
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Top user share
                      </p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {usageMetrics.userConcentration.topUserSharePercent}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Top 3 users
                      </p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {usageMetrics.userConcentration.topThreeUsersSharePercent}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        User buckets
                      </p>
                      <p className="mt-2 text-lg font-semibold text-eden-ink">
                        {usageMetrics.userConcentration.distinctUsers}
                      </p>
                      <p className="mt-1 text-xs text-eden-muted">
                        {usageMetrics.userConcentration.anonymousUsageEvents} guest events
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Recent user activity
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.recentUserActivity.length ? (
                      usageMetrics.recentUserActivity.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-eden-ink">
                                  {event.userDisplayName}
                                </p>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                                  {event.username ? `@${event.username}` : "Guest wallet"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-eden-muted">
                                Used {event.serviceTitle} from {event.businessName}.
                              </p>
                              <p className="mt-1 text-xs text-eden-muted">
                                Value: {formatCredits(event.estimatedGrossCredits)} | Charge:{" "}
                                {formatCredits(event.creditsUsed)}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                              {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                            {event.timestampLabel}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                        Recent user activity will appear here after service usage is recorded.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <MockTransactionControls
                businessId={simulationBusinessId}
                description={
                  simulationBusiness
                    ? `These development-only actions append local Eden Credits events for ${simulationBusiness.name}.`
                    : `These development-only actions append local Eden Credits events for ${session.user.displayName}.`
                }
              />
            </div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="system-logs"
            eyebrow="System Logs"
            title="Recent control-room events"
            description="Mock owner logs covering routing, billing, publish, security, and agent events."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Live mock feed
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {platformLogs.slice(0, 5).map((event) => (
                <motion.article
                  key={event.id}
                  variants={cardVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getLogLevelClasses(
                          event.level,
                        )}`}
                      >
                        {event.level}
                      </span>
                      <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">{event.source}</span>
                    </div>
                    <span className="text-xs text-eden-muted">{event.timestamp}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-eden-ink">{event.title}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{event.message}</p>
                </motion.article>
              ))}
            </motion.div>
          </ControlRoomSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <ControlRoomSection
            id="security-controls"
            eyebrow="Security Controls"
            title="Owner safety actions"
            description="Development-only controls for freezing accounts, toggling maintenance mode, and reviewing audit visibility."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Local mock mode
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-3"
            >
              <motion.article
                variants={cardVariants}
                className="rounded-2xl border border-eden-edge bg-white p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Frozen users
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">
                  {frozenUsersCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Accounts currently marked as frozen in the local mock admin state.
                </p>
              </motion.article>
              <motion.article
                variants={cardVariants}
                className="rounded-2xl border border-eden-edge bg-white p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Frozen businesses
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">
                  {frozenBusinessesCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Business workspaces currently under a mocked owner freeze hold.
                </p>
              </motion.article>
              <motion.article
                variants={cardVariants}
                className="rounded-2xl border border-eden-edge bg-white p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Maintenance mode
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getAdminStateClasses(
                      maintenanceMode ? "maintenance" : "active",
                    )}`}
                  >
                    {maintenanceMode ? "Maintenance active" : "Active"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-eden-muted">
                  Toggle the platform-wide maintenance banner used across the Eden shell.
                </p>
                <div className="mt-4">
                  <MockAdminActionButton
                    action="toggle_maintenance"
                    label={maintenanceMode ? "Disable Maintenance Mode" : "Toggle Maintenance Mode"}
                    detail={
                      maintenanceMode
                        ? "Turn off the current mock maintenance banner."
                        : "Enable a mock maintenance banner across the platform shell."
                    }
                    className={
                      maintenanceMode
                        ? "w-full border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                        : "w-full border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                    }
                  />
                </div>
              </motion.article>
            </motion.div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4 text-sm leading-6 text-eden-muted">
                Freeze and unfreeze actions are development-only overlays. They update the owner records, detail views, and platform shell immediately without enforcing any real backend restriction.
              </div>
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eden-ink">{auditLogsControl.title}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      {auditLogsControl.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                    {auditLogsControl.stateLabel}
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-eden-accent">
                  {auditLogsControl.actionLabel}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <MockResetControls
                showAll
                showLedger
                showPipeline
                showReleaseHistory
                description="Owner-only development resets for the cookie-backed ledger, pipeline, release history, and admin overlay state."
              />
            </div>
          </ControlRoomSection>
        </motion.div>
      </motion.div>
    </div>
  );
}




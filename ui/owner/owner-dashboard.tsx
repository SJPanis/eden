"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";
import { MockResetControls } from "@/modules/core/components/mock-reset-controls";
import { OwnerLeavesGrantButton } from "@/modules/core/components/owner-leaves-grant-button";
import { MockTransactionControls } from "@/modules/core/credits/mock-transaction-controls";
import {
  edenEarnedLeavesLabel,
} from "@/modules/core/credits/eden-currency";
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
import { OwnerReconciliationFilters } from "@/ui/owner/components/owner-reconciliation-filters";
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
      platformFeeCredits: number;
      builderEarningsCredits: number;
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
      relatedUserId?: string | null;
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

type OwnerPaymentFilter = "all" | "pending" | "settled" | "failed_or_canceled";
type OwnerPayoutFilter = "all" | "pending" | "settled" | "failed_or_canceled";

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

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getUserStatusClasses(status: EdenMockUserStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "review") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-rose-500/25 bg-rose-500/10 text-rose-300";
}

function getBusinessStatusClasses(status: EdenMockBusinessStatus) {
  if (status === "published") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "testing") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-white/8 bg-white/[0.06] text-white/50";
}

function getAdminStateClasses(state: "active" | "frozen" | "maintenance") {
  if (state === "frozen") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  if (state === "maintenance") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

function getReleaseStatusClasses(status: EdenMockReleaseStatus) {
  if (status === "published") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "ready") return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  if (status === "testing") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-white/8 bg-white/[0.06] text-white/50";
}

function getAgentStatusClasses(status: EdenMockAgentStatus) {
  if (status === "healthy") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "busy") return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function getLogLevelClasses(level: EdenMockLogLevel) {
  if (level === "info") return "bg-sky-500/10 text-sky-300";
  if (level === "warn") return "bg-amber-500/10 text-amber-300";
  return "bg-rose-500/10 text-rose-300";
}

function getCreditDirectionClasses(direction: CreditActivity["direction"]) {
  if (direction === "inflow") return "bg-emerald-500/10 text-emerald-400";
  if (direction === "outflow") return "bg-rose-500/10 text-rose-300";
  if (direction === "reserve") return "bg-amber-500/10 text-amber-300";
  return "bg-sky-500/10 text-sky-300";
}

function getPaymentStatusClasses(status: "pending" | "settled" | "failed" | "canceled") {
  if (status === "settled") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "pending") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-rose-500/25 bg-rose-500/10 text-rose-300";
}

function formatPaymentStatus(status: "pending" | "settled" | "failed" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPaymentFilterEmptyState(filter: OwnerPaymentFilter) {
  if (filter === "pending") {
    return "No pending top-up payments are currently recorded.";
  }

  if (filter === "settled") {
    return "No settled top-up payments are currently recorded.";
  }

  if (filter === "failed_or_canceled") {
    return "No failed or canceled top-up payments are currently recorded.";
  }

  return "No persistent top-up payment records are available yet. Once Stripe-backed checkout sessions are created, the webhook settlement feed will appear here.";
}

function getPaymentEventStatusClasses(
  status: "info" | "success" | "skipped" | "failed",
) {
  if (status === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "skipped") return "border-white/8 bg-white/[0.06] text-white/50";
  if (status === "failed") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  return "border-sky-500/25 bg-sky-500/10 text-sky-300";
}

function formatPaymentEventStatus(status: "info" | "success" | "skipped" | "failed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPayoutSettlementStatusClasses(
  status: "pending" | "settled" | "canceled",
) {
  if (status === "settled") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "pending") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-white/8 bg-white/[0.06] text-white/50";
}

function getOwnerReconciliationActionClasses() {
  return "inline-flex rounded-full border border-white/8 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]";
}

function formatPayoutSettlementStatus(status: "pending" | "settled" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPayoutFilterEmptyState(filter: OwnerPayoutFilter) {
  if (filter === "pending") {
    return "No pending payout settlement rows are currently recorded.";
  }

  if (filter === "settled") {
    return "No settled payout rows are currently recorded.";
  }

  if (filter === "failed_or_canceled") {
    return "No failed or canceled payout rows are currently recorded.";
  }

  return "No payout settlement records exist yet. Use the internal payout action below to create persistent payout history without enabling real payout rails.";
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

// Compact stat cell used across all tabs
function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.05] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-white">{value}</p>
      {sub ? <p className="mt-1 text-[11px] leading-4 text-white/40">{sub}</p> : null}
    </div>
  );
}

// Status dot for inline status indicators
function StatusDot({ tone }: { tone: "green" | "amber" | "red" | "sky" | "muted" }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-rose-400",
    sky: "bg-sky-400",
    muted: "bg-white/20",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[tone]}`} />;
}

// Panel header used within tabs
function PanelHeader({ eyebrow, title, badge }: { eyebrow: string; title: string; badge?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#14989a]">{eyebrow}</p>
        <p className="mt-0.5 text-sm font-semibold text-white">{title}</p>
      </div>
      {badge ? (
        <span className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function OwnerDashboardPanel({
  session,
  simulatedTransactions,
  pipelineRecords,
  pipelineEvents,
  adminState,
  simulationBusinessId,
  workspaceServices = [],
  watchedBusinesses,
  watchedServices,
  userCatalog,
  businessCatalog,
  serviceCatalog,
  usageMetrics,
  paymentMetrics,
  payoutAccounting,
}: OwnerDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "economy" | "pipeline" | "security">("overview");
  const [paymentFilter, setPaymentFilter] = useState<OwnerPaymentFilter>("all");
  const [payoutFilter, setPayoutFilter] = useState<OwnerPayoutFilter>("all");

  const users = userCatalog;
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
      description: "Open the current owner audit and escalation trail across runtime, ledger, and policy actions.",
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
          : "Public routes continue in normal owner-overlay mode.",
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
      label: "Eden Leaf's flow",
      value: `+${formatCredits(creditFlow.inflow)} / -${formatCredits(creditFlow.outflow)}`,
      detail: "Development ledger-overlay movement across wallet top-ups, usage, reserves, and adjustments.",
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
        ? "The owner layer has enabled a maintenance overlay banner across the platform shell."
        : "Hybrid platform health across routing, ledger, publish, and agent systems.",
    },
    {
      id: "overview-usage-events",
      label: "Tracked service runs",
      value: `${usageMetrics.totalUsageEvents}`,
      detail:
        usageMetrics.source === "persistent"
          ? "Persisted ServiceUsage rows recorded through the current execution boundary."
          : "Fallback count derived from the shared usage ledger until persistent rows are available.",
    },
    {
      id: "overview-usage-credits",
      label: "Spendable Leaf's used",
      value: formatCredits(usageMetrics.totalCreditsUsed),
      detail:
        usageMetrics.source === "persistent"
          ? "Spendable Leaf's attached to persisted service usage events for early monetization reporting."
          : "Spendable Leaf's estimated from usage transactions while Prisma-backed usage records are unavailable.",
    },
    {
      id: "overview-platform-earnings",
      label: "Estimated Eden earnings",
      value: formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits),
      detail: "Platform fee projection derived from stored per-use service pricing where available.",
    },
    {
      id: "overview-innovator-earnings",
      label: `${edenEarnedLeavesLabel} accrued`,
      value: formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits),
      detail: "Innovator net earned Leaf's projection after the Eden fee share using current service pricing.",
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
      detail: "Businesses still in the current QA/testing overlay.",
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
      label: "Leaf\'s issued",
      value: formatCredits(creditFlow.inflow),
      detail: "Development-overlay distribution to users, businesses, and owner test accounts.",
    },
    {
      label: "Leaf\'s consumed",
      value: formatCredits(creditFlow.outflow),
      detail: "Overlay usage from AI routing, service discovery, and workspace actions.",
    },
    {
      label: "Reserve held",
      value: formatCredits(creditFlow.reserve),
      detail: "Leaf's reserved for publish staging, safety holds, and owner review buffers.",
    },
    {
      label: "Net movement",
      value: `${creditFlow.net >= 0 ? "+" : "-"}${formatCredits(Math.abs(creditFlow.net))}`,
      detail: "Net overlay balance movement after inflow, usage, and owner-side adjustments.",
    },
  ];
  const paymentSummaryCards = [
    {
      id: "payments-total",
      label: "Total top-ups",
      value: `${paymentMetrics.totalPayments}`,
      detail: "Persistent Leaf's top-up records tracked through the current owner payment ledger.",
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
      label: "Leaf\'s settled",
      value: formatCredits(paymentMetrics.totalCreditsSettled),
      detail: `${formatMoneyAmount(
        paymentMetrics.totalSettledAmountCents,
        "usd",
      )} processed through the persistent top-up ledger.`,
    },
  ];
  const paymentFilterOptions = [
    { value: "all", label: "All", count: paymentMetrics.recentPayments.length },
    {
      value: "pending",
      label: "Pending",
      count: paymentMetrics.recentPayments.filter((payment) => payment.status === "pending").length,
    },
    {
      value: "settled",
      label: "Settled",
      count: paymentMetrics.recentPayments.filter((payment) => payment.status === "settled").length,
    },
    {
      value: "failed_or_canceled",
      label: "Failed/Canceled",
      count: paymentMetrics.recentPayments.filter(
        (payment) => payment.status === "failed" || payment.status === "canceled",
      ).length,
    },
  ] as const;
  const filteredPayments = useMemo(
    () =>
      paymentMetrics.recentPayments.filter((payment) => {
        if (paymentFilter === "all") {
          return true;
        }

        if (paymentFilter === "failed_or_canceled") {
          return payment.status === "failed" || payment.status === "canceled";
        }

        return payment.status === paymentFilter;
      }),
    [paymentFilter, paymentMetrics.recentPayments],
  );
  const payoutSummaryCards = [
    {
      id: "payout-liability",
      label: "Total innovator liability",
      value: formatCredits(payoutAccounting.totalBuilderLiabilityCredits),
      detail: "Current unpaid innovator earnings liability after persistent payout settlements and internal Eden use are applied.",
    },
    {
      id: "payout-internal-use",
      label: "Earned Leaf\'s used internally",
      value: formatCredits(payoutAccounting.totalInternalUseCredits),
      detail: "Persistent internal-use records where innovators reused earned Leaf's inside Eden instead of leaving them in payout accounting.",
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
  const payoutFilterOptions = [
    { value: "all", label: "All", count: payoutAccounting.payoutHistory.length },
    {
      value: "pending",
      label: "Pending",
      count: payoutAccounting.payoutHistory.filter((item) => item.status === "pending").length,
    },
    {
      value: "settled",
      label: "Settled",
      count: payoutAccounting.payoutHistory.filter((item) => item.status === "settled").length,
    },
    {
      value: "failed_or_canceled",
      label: "Failed/Canceled",
      count: payoutAccounting.payoutHistory.filter((item) => item.status === "canceled").length,
    },
  ] as const;
  const filteredPayoutHistory = useMemo(
    () =>
      payoutAccounting.payoutHistory.filter((item) => {
        if (payoutFilter === "all") {
          return true;
        }

        if (payoutFilter === "failed_or_canceled") {
          return item.status === "canceled";
        }

        return item.status === payoutFilter;
      }),
    [payoutAccounting.payoutHistory, payoutFilter],
  );
  const adminSummaryStrip = [
    {
      id: "admin-summary-maintenance",
      label: "Maintenance mode",
      value: maintenanceMode ? "On" : "Off",
      detail: maintenanceMode
        ? "Platform shell maintenance banner is currently active."
        : "Platform shell is running in normal owner-overlay mode.",
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
      detail: "Latest shared release transitions currently visible to the control room.",
      tone: getReleaseStatusClasses(releaseEvents[0]?.newStatus ?? "draft"),
    },
  ];
  const topBusinessesByUsage = [...usageMetrics.topBusinesses].sort((left, right) => {
    return (
      right.usageCount - left.usageCount ||
      right.monetization.estimatedBuilderEarningsCredits -
        left.monetization.estimatedBuilderEarningsCredits
    );
  });
  const topBusinessesByEarnings = [...payoutAccounting.topEarningBusinesses].sort(
    (left, right) => {
      return (
        right.totalEarnedCredits - left.totalEarnedCredits ||
        right.payoutReadyCredits - left.payoutReadyCredits
      );
    },
  );
  const topServicesByUsage = [...usageMetrics.topServices].sort((left, right) => {
    return (
      right.usageCount - left.usageCount ||
      right.monetization.estimatedGrossCredits - left.monetization.estimatedGrossCredits
    );
  });
  const topServicesByEarnings = [...usageMetrics.topServices].sort((left, right) => {
    return (
      right.monetization.estimatedGrossCredits - left.monetization.estimatedGrossCredits ||
      right.usageCount - left.usageCount
    );
  });
  const topUsersByValue = [...usageMetrics.topUsers].sort((left, right) => {
    return (
      right.projectedCustomerValueCredits - left.projectedCustomerValueCredits ||
      right.usageCount - left.usageCount
    );
  });
  const topUsersByUsage = [...usageMetrics.topUsers].sort((left, right) => {
    return (
      right.usageCount - left.usageCount ||
      right.projectedCustomerValueCredits - left.projectedCustomerValueCredits
    );
  });
  const recentUsagePulseWindow = usageMetrics.recentUserActivity.slice(0, 8);
  const recentUsagePulseByService = recentUsagePulseWindow.reduce<Record<string, number>>(
    (lookup, event) => {
      lookup[event.serviceId] = (lookup[event.serviceId] ?? 0) + 1;
      return lookup;
    },
    {},
  );
  const servicePulseLeaders = topServicesByUsage
    .map((service) => ({
      ...service,
      recentPulseCount: recentUsagePulseByService[service.serviceId] ?? 0,
    }))
    .sort((left, right) => {
      return (
        right.recentPulseCount - left.recentPulseCount ||
        right.usageCount - left.usageCount ||
        right.monetization.estimatedGrossCredits - left.monetization.estimatedGrossCredits
      );
    });
  const topEarningBusiness = topBusinessesByEarnings[0] ?? null;
  const topEarningService = topServicesByEarnings[0] ?? null;
  const topValueUser = topUsersByValue[0] ?? null;
  const strongestUsagePulse =
    servicePulseLeaders.find((service) => service.recentPulseCount > 0) ?? null;
  const latestUserActivity = usageMetrics.recentUserActivity[0] ?? null;
  const platformGrowthSummaryCards = [
    {
      id: "platform-growth-top-business",
      label: "Top earning business",
      value: topEarningBusiness?.businessName ?? "No priced business yet",
      detail: topEarningBusiness
        ? `${formatCredits(topEarningBusiness.totalEarnedCredits)} earned | Ready ${formatCredits(
            topEarningBusiness.payoutReadyCredits,
          )}.`
        : "Business earnings leaders appear once priced usage is recorded across the platform.",
    },
    {
      id: "platform-growth-top-service",
      label: "Top earning service",
      value: topEarningService?.serviceTitle ?? "No priced service yet",
      detail: topEarningService
        ? `${formatCredits(topEarningService.monetization.estimatedGrossCredits)} gross at ${getServicePricingDisplay(
            {
              pricingModel: topEarningService.pricingModel,
              pricePerUse: topEarningService.pricePerUseCredits,
              pricingUnit: topEarningService.pricingUnit,
            },
          )}.`
        : "Service earning leaders appear here after priced usage is tracked.",
    },
    {
      id: "platform-growth-top-user",
      label: "Top user by value",
      value: topValueUser?.userDisplayName ?? "No user value yet",
      detail: topValueUser
        ? `${formatCredits(topValueUser.projectedCustomerValueCredits)} projected value via ${topValueUser.topServiceTitle}.`
        : "Projected user value appears once service usage is tied to individual users.",
    },
    {
      id: "platform-growth-pulse",
      label: "Recent platform pulse",
      value: strongestUsagePulse
        ? `${strongestUsagePulse.recentPulseCount}/${recentUsagePulseWindow.length} recent runs`
        : "No recent pulse yet",
      detail: strongestUsagePulse
        ? `${strongestUsagePulse.serviceTitle} from ${strongestUsagePulse.businessName} is leading current demand.`
        : "Recent usage pulse appears once fresh service runs are recorded.",
    },
    {
      id: "platform-growth-money",
      label: "Innovator liability / Eden earnings",
      value: formatCredits(payoutAccounting.totalBuilderLiabilityCredits),
      detail: `${formatCredits(
        usageMetrics.monetization.estimatedPlatformEarningsCredits,
      )} Eden earnings projected from current service pricing.`,
    },
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "users" as const, label: "Users" },
    { id: "economy" as const, label: "Economy" },
    { id: "pipeline" as const, label: "Pipeline" },
    { id: "security" as const, label: "Security" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <EdenBrandLockup size="sm" label="Eden" subtitle="Owner control room" />
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="hidden sm:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#14989a]">Owner Layer</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Mission Control</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminSummaryStrip.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.05] px-3 py-1.5">
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${item.tone}`}>{item.value}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.08] px-3 py-2 font-mono text-[11px] text-sky-300/80">
          Honest state: payments, payouts, runtime records, sandbox tasks, and several usage metrics now persist. Release transitions, freeze toggles, and some ledger views still include development overlays.
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
              activeTab === tab.id
                ? "bg-[#14989a]/20 text-[#14989a] shadow-[0_0_0_1px_rgba(20,152,154,0.35)]"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {/* Overview metrics grid */}
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {overviewMetrics.slice(0, 5).map((metric) => (
                <StatCell key={metric.id} label={metric.label} value={metric.value} sub={metric.detail} />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {overviewMetrics.slice(5).map((metric) => (
                <StatCell key={metric.id} label={metric.label} value={metric.value} sub={metric.detail} />
              ))}
            </div>

            {/* Signals + health */}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Owner Signals" title="Live signal feed" />
                <div className="grid gap-2 sm:grid-cols-3">
                  {ownerSignalsDisplay.map((signal) => (
                    <div key={signal.label} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{signal.label}</p>
                      <p className="mt-1.5 text-base font-semibold text-white">{signal.value}</p>
                      <p className="mt-1 text-[11px] leading-4 text-white/40">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Health Monitors" title="System status" badge={`${systemHealthChecks.length} checks`} />
                <div className="space-y-2">
                  {systemHealthChecks.map((check) => (
                    <div key={check.label} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={check.status === "Stable" ? "green" : check.status === "Watch" ? "amber" : "red"} />
                        <p className="text-xs font-medium text-white">{check.label}</p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{check.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin controls */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Admin State" title="Maintenance toggle" />
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getAdminStateClasses(maintenanceMode ? "maintenance" : "active")}`}>
                    {maintenanceMode ? "Maintenance active" : "Active"}
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    {frozenUsersCount} users frozen · {frozenBusinessesCount} biz frozen
                  </span>
                </div>
                <MockAdminActionButton
                  action="toggle_maintenance"
                  label={maintenanceMode ? "Disable Maintenance Mode" : "Toggle Maintenance Mode"}
                  detail={
                    maintenanceMode
                      ? "Turn off the current maintenance overlay banner."
                      : "Enable a maintenance overlay banner across the platform shell."
                  }
                  className={
                    maintenanceMode
                      ? "w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                      : "w-full border-amber-500/25 bg-amber-500/10 hover:border-amber-300 hover:bg-amber-500/15"
                  }
                />
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4 lg:col-span-2">
                <PanelHeader eyebrow="Dev Controls" title="Reset + grant actions" />
                <div className="space-y-3">
                  <MockResetControls
                    showAll
                    showLedger
                    showPipeline
                    showReleaseHistory
                    description="Owner-only development resets for the cookie-backed ledger, pipeline, release history, and admin overlay state."
                  />
                  <OwnerLeavesGrantButton
                    userId={session.user.id}
                    username={session.user.username}
                    amountCredits={250}
                    className="w-full border-sky-500/25 bg-sky-500/10 hover:border-sky-300 hover:bg-sky-500/15"
                  />
                </div>
              </div>
            </div>

            {/* Mock transaction controls */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Ledger Simulation" title="Mock transaction controls" />
              <MockTransactionControls
                businessId={simulationBusinessId}
                description={
                  simulationBusiness
                    ? `These development-only actions append local Eden Leaf's events for ${simulationBusiness.name}.`
                    : `These development-only actions append local Eden Leaf's events for ${session.user.displayName}.`
                }
              />
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div
            key="users"
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#14989a]">Account Monitoring</p>
              <span className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{users.length} records</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => {
                const userFrozen = isUserFrozen(user.id, adminState);
                const userStatus = userFrozen ? "frozen" : user.status;
                return (
                  <div key={user.id} className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/owner/users/${user.id}`}
                          className="text-sm font-semibold text-white transition-colors hover:text-[#14989a]"
                        >
                          {user.username}
                        </Link>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                          {toTitleCase(user.role)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getUserStatusClasses(userStatus)}`}>
                        {toTitleCase(userStatus)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">Balance</span>
                      <span className="text-sm font-semibold text-white">
                        {formatCredits(getUserCreditsBalance(user.id, simulatedTransactions))}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
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
                            ? "w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                            : "w-full border-rose-500/25 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-500/15"
                        }
                      />
                      <OwnerLeavesGrantButton
                        userId={user.id}
                        username={user.username}
                        amountCredits={250}
                        className="w-full border-sky-500/25 bg-sky-500/10 hover:border-sky-300 hover:bg-sky-500/15"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "economy" && (
          <motion.div
            key="economy"
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {/* Credit summary */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Credit Flow" title="Leaf's movement summary" badge="Dev ledger overlay" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {creditSummary.map((item) => (
                  <StatCell key={item.label} label={item.label} value={item.value} sub={item.detail} />
                ))}
              </div>
            </div>

            {/* Credit activity */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Recent Activity" title="Leaf's transaction feed" badge={`${creditActivity.length} entries`} />
              <div className="space-y-2">
                {creditActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getCreditDirectionClasses(activity.direction)}`}>
                        {activity.direction}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-white">{activity.title}</p>
                        <p className="truncate text-[11px] text-white/40">{activity.detail}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-white">{activity.amount}</p>
                      <p className="text-[10px] text-white/40">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment summary */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader
                eyebrow="Payment Ledger"
                title="Top-up payment summary"
                badge={paymentMetrics.source === "persistent" ? "Persistent" : "Fallback"}
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {paymentSummaryCards.map((item) => (
                  <StatCell key={item.id} label={item.label} value={item.value} sub={item.detail} />
                ))}
              </div>
            </div>

            {/* Recent payments */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Top-up Payments" title="Recent payment records" badge={`${filteredPayments.length} of ${paymentMetrics.recentPayments.length}`} />
              <OwnerReconciliationFilters
                ariaLabel="Filter owner payment inspection rows"
                options={paymentFilterOptions.map((option) => ({ ...option }))}
                value={paymentFilter}
                onChange={(value) => setPaymentFilter(value as OwnerPaymentFilter)}
              />
              <div className="mt-3 space-y-2">
                {filteredPayments.length ? (
                  filteredPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{payment.providerLabel}</p>
                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getPaymentStatusClasses(payment.status)}`}>
                              {formatPaymentStatus(payment.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-white/40">{getUserDisplayLabel(payment.userId)}</p>
                          {payment.userId ? (
                            <div className="mt-2">
                              <Link href={`/owner/users/${payment.userId}`} className={getOwnerReconciliationActionClasses()}>
                                Inspect Related User
                              </Link>
                            </div>
                          ) : null}
                          <div className="mt-2 space-y-0.5 font-mono text-[10px] leading-4 text-white/40">
                            <p className="break-all">Session: {payment.providerSessionId}</p>
                            {payment.providerPaymentIntentId ? (
                              <p className="break-all">Intent: {payment.providerPaymentIntentId}</p>
                            ) : null}
                            <p>Created: {payment.createdAtLabel}{payment.settledAtLabel ? ` · Settled: ${payment.settledAtLabel}` : ""}</p>
                            {payment.failureReason ? <p>Reason: {payment.failureReason}</p> : null}
                          </div>
                          <div className="mt-2">
                            <Link href={`/owner/payments/${payment.id}`} className={getOwnerReconciliationActionClasses()}>
                              View Payment
                            </Link>
                          </div>
                        </div>
                        <div className="shrink-0 text-left md:text-right">
                          <p className="text-sm font-semibold text-white">{formatCredits(payment.creditsAmount)}</p>
                          <p className="text-[10px] text-white/40">{formatMoneyAmount(payment.amountCents, payment.currency)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                    {paymentMetrics.recentPayments.length ? getPaymentFilterEmptyState(paymentFilter) : getPaymentFilterEmptyState("all")}
                  </div>
                )}
              </div>
            </div>

            {/* Payment lifecycle events */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader
                eyebrow="Payment Lifecycle"
                title="Webhook event log"
                badge={paymentMetrics.paymentEventLogsSource === "persistent" ? `${paymentMetrics.recentEventLogCount} events` : "Fallback"}
              />
              <div className="space-y-2">
                {paymentMetrics.recentEventLogs.length ? (
                  paymentMetrics.recentEventLogs.map((eventLog) => (
                    <div key={eventLog.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{eventLog.eventTypeLabel}</p>
                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getPaymentEventStatusClasses(eventLog.status)}`}>
                              {formatPaymentEventStatus(eventLog.status)}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 font-mono text-[10px] leading-4 text-white/40">
                            <p>Provider: {eventLog.provider}</p>
                            {eventLog.providerEventId ? <p className="break-all">Event: {eventLog.providerEventId}</p> : null}
                            {eventLog.providerSessionId ? <p className="break-all">Session: {eventLog.providerSessionId}</p> : null}
                            {eventLog.creditsTopUpPaymentId ? <p className="break-all">Payment: {eventLog.creditsTopUpPaymentId}</p> : null}
                          </div>
                          {eventLog.metadataSummary.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {eventLog.metadataSummary.map((summaryLine) => (
                                <span key={`${eventLog.id}-${summaryLine}`} className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/40">
                                  {summaryLine}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {eventLog.creditsTopUpPaymentId || eventLog.relatedUserId ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {eventLog.creditsTopUpPaymentId ? (
                                <Link href={`/owner/payments/${eventLog.creditsTopUpPaymentId}`} className={getOwnerReconciliationActionClasses()}>View Payment</Link>
                              ) : null}
                              {eventLog.relatedUserId ? (
                                <Link href={`/owner/users/${eventLog.relatedUserId}`} className={getOwnerReconciliationActionClasses()}>Inspect Related User</Link>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-left md:text-right">
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">Logged</p>
                          <p className="mt-0.5 text-sm font-semibold text-white">{eventLog.createdAtLabel}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                    No persistent payment lifecycle events are available yet. Once Stripe checkout and webhook events occur, the owner layer will surface the recorded lifecycle trail here.
                  </div>
                )}
              </div>
            </div>

            {/* Payout accounting */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Innovator Payouts" title="Payout accounting summary" badge={payoutAccounting.payoutStatusLabel} />
              <p className="mb-3 text-[11px] text-white/40">{payoutAccounting.accountingRuleLabel}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {payoutSummaryCards.map((item) => (
                  <StatCell key={item.id} label={item.label} value={item.value} sub={item.detail} />
                ))}
              </div>
            </div>

            {/* Payout history + status overview */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader
                  eyebrow="Payout History"
                  title="Settlement records"
                  badge={payoutAccounting.historySource === "persistent" ? "Persistent" : "No records"}
                />
                <OwnerReconciliationFilters
                  ariaLabel="Filter owner payout history rows"
                  options={payoutFilterOptions.map((option) => ({ ...option }))}
                  value={payoutFilter}
                  onChange={(value) => setPayoutFilter(value as OwnerPayoutFilter)}
                />
                <div className="mt-3 space-y-2">
                  {filteredPayoutHistory.length ? (
                    filteredPayoutHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">{item.businessName}</p>
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getPayoutSettlementStatusClasses(item.status)}`}>
                                {formatPayoutSettlementStatus(item.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-white/40">{formatCredits(item.amountCredits)} | {item.reference ?? "No reference"}</p>
                            <p className="text-[10px] text-white/40">{item.notes ?? "Internal settlement note not provided."}</p>
                          </div>
                          <div className="shrink-0 text-left md:text-right">
                            <p className="text-sm font-semibold text-white">{item.createdAtLabel}</p>
                            <p className="text-[10px] text-white/40">{item.settledAtLabel ? `Settled ${item.settledAtLabel}` : "Awaiting settlement"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                      {payoutAccounting.payoutHistory.length ? getPayoutFilterEmptyState(payoutFilter) : getPayoutFilterEmptyState("all")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Payout Status" title="Settlement overview" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatCell label="Settled payouts" value={`${payoutAccounting.statusOverview.settledCount}`} sub={`${formatCredits(payoutAccounting.statusOverview.settledSettlementCredits)} recorded as paid`} />
                  <StatCell label="Pending payouts" value={`${payoutAccounting.statusOverview.pendingCount}`} sub={`${formatCredits(payoutAccounting.statusOverview.pendingSettlementCredits)} still queued`} />
                  <StatCell label="Canceled payouts" value={`${payoutAccounting.statusOverview.canceledCount}`} sub={`${formatCredits(payoutAccounting.statusOverview.canceledSettlementCredits)} removed from queue`} />
                  <StatCell label="Internal Eden use" value={`${payoutAccounting.statusOverview.internalUseCount}`} sub={`${formatCredits(payoutAccounting.statusOverview.internalUseCredits)} reused from earned Leaf's`} />
                  <div className="sm:col-span-2">
                    <StatCell label="Current state" value={payoutAccounting.payoutStatusLabel} sub={`Liability ${formatCredits(payoutAccounting.totalBuilderLiabilityCredits)} | Ready ${formatCredits(payoutAccounting.totalPayoutReadyCredits)}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Internal earned use */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader
                eyebrow="Internal Earned Use"
                title="Innovator Leaf's reused internally"
                badge={payoutAccounting.internalUseHistorySource === "persistent" ? "Persistent" : "No records"}
              />
              <div className="space-y-2">
                {payoutAccounting.internalUseHistory.length ? (
                  payoutAccounting.internalUseHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{item.businessName}</p>
                            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-sky-300">
                              {item.usageTypeLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-white/40">{formatCredits(item.amountCredits)} | {item.reference ?? "No reference"}</p>
                          <p className="text-[10px] text-white/40">{item.actorLabel}{item.notes ? ` | ${item.notes}` : ""}</p>
                        </div>
                        <div className="shrink-0 text-left md:text-right">
                          <p className="text-sm font-semibold text-white">{item.createdAtLabel}</p>
                          <div className="mt-2">
                            <Link href={`/owner/payouts/${item.businessId}`} className={getOwnerReconciliationActionClasses()}>View Payout</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                    No internal earned-Leaf's usage has been recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top earning businesses with payout actions */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Earning Leaders" title="Top earning businesses" />
              <div className="space-y-3">
                {payoutAccounting.topEarningBusinesses.length ? (
                  payoutAccounting.topEarningBusinesses.map((business) => (
                    <div key={business.businessId} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{business.businessName}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">Top: {business.topServiceTitle}</p>
                          <p className="mt-1 text-[11px] text-white/40">{business.usageCount} runs | {formatCredits(business.totalCreditsUsed)} used</p>
                          <p className="text-[11px] text-white/40">Unpaid: {formatCredits(business.unpaidEarningsCredits)}</p>
                          {business.internalUseCredits > 0 ? (
                            <p className="text-[11px] text-white/40">Used internally: {formatCredits(business.internalUseCredits)}</p>
                          ) : null}
                          <p className="text-[11px] text-white/40">
                            Paid out: {formatCredits(business.paidOutCredits)}
                            {business.pendingSettlementCredits > 0 ? ` | Pending ${formatCredits(business.pendingSettlementCredits)}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-left md:text-right">
                          <p className="text-sm font-semibold text-white">{formatCredits(business.payoutReadyCredits)}</p>
                          <p className="text-[10px] text-white/40">Payout-ready</p>
                          <p className="mt-1 text-[10px] text-white/40">Available for Eden use: {formatCredits(business.availableForInternalUseCredits)}</p>
                          <p className="text-[10px] text-white/40">Eden fee share: {formatCredits(business.edenFeeShareCredits)}</p>
                          <p className="text-[10px] text-white/40">{business.lastUsedAtLabel}</p>
                        </div>
                      </div>
                      {business.payoutReadyCredits > 0 ? (
                        <div className="mt-3 space-y-2">
                          <Link href={`/owner/payouts/${business.businessId}`} className="block rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]">
                            View Payout
                          </Link>
                          <MockPayoutSettlementButton
                            businessId={business.businessId}
                            amountCredits={business.payoutReadyCredits}
                            label="Record internal payout settlement"
                            detail={`Mark ${formatCredits(business.payoutReadyCredits)} as paid out for ${business.businessName}. This only writes an internal settlement record.`}
                            reference={`owner-payout-${business.businessId}`}
                            notes={`Owner control-room settlement for ${business.businessName}`}
                            className="w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                          />
                        </div>
                      ) : (
                        <div className="mt-3">
                          <Link href={`/owner/payouts/${business.businessId}`} className="block rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]">
                            View Payout
                          </Link>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                    Earning rankings will appear here after the platform records priced service usage.
                  </div>
                )}
              </div>
            </div>

            {/* Usage analytics: top services, users */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Usage Analytics" title="Top services by usage" />
                <div className="space-y-2">
                  {usageMetrics.topServices.length ? (
                    usageMetrics.topServices.map((service) => (
                      <div key={service.serviceId} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{service.serviceTitle}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{service.businessName}</p>
                            <p className="mt-1 text-[11px] text-white/40">{service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used</p>
                            <p className="text-[11px] text-white/40">Rate: {getServicePricingDisplay({ pricingModel: service.pricingModel, pricePerUse: service.pricePerUseCredits, pricingUnit: service.pricingUnit })}</p>
                          </div>
                          <div className="shrink-0 text-left md:text-right">
                            <p className="text-sm font-semibold text-white">{formatCredits(service.monetization.estimatedPlatformEarningsCredits)}</p>
                            <p className="text-[10px] text-white/40">Eden fee share</p>
                            <p className="mt-1 text-[10px] text-white/40">Gross: {formatCredits(service.monetization.estimatedGrossCredits)}</p>
                            <p className="text-[10px] text-white/40">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                      No service usage has been tracked yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="User Analytics" title="Top users by platform usage" />
                <div className="space-y-2">
                  {usageMetrics.topUsers.length ? (
                    usageMetrics.topUsers.map((user) => (
                      <div key={user.userId ?? `guest-${user.userDisplayName}`} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">{user.userDisplayName}</p>
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
                                {user.isAnonymousUser ? "Guest" : user.username ? `@${user.username}` : "User"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-white/40">{user.usageCount} runs across {user.perService.length} service{user.perService.length === 1 ? "" : "s"}.</p>
                            <p className="text-[11px] text-white/40">Top: {user.topServiceTitle}</p>
                            <p className="text-[11px] text-white/40">Customer value: {formatCredits(user.projectedCustomerValueCredits)}</p>
                          </div>
                          <div className="shrink-0 text-left md:text-right">
                            <p className="text-sm font-semibold text-white">{user.usageSharePercent}% of tracked runs</p>
                            <p className="text-[10px] text-white/40">Innovator earnings: {formatCredits(user.monetization.estimatedBuilderEarningsCredits)}</p>
                            <p className="text-[10px] text-white/40">{user.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                      User rankings will populate after platform usage events are recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User concentration + recent activity */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Usage Pulse" title="Recent user activity" />
                <div className="space-y-2">
                  {usageMetrics.recentUserActivity.length ? (
                    usageMetrics.recentUserActivity.map((event) => (
                      <div key={event.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">{event.userDisplayName}</p>
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
                                {event.username ? `@${event.username}` : "Guest wallet"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-white/40">Used {event.serviceTitle} from {event.businessName}.</p>
                            <p className="text-[10px] text-white/40">Value: {formatCredits(event.estimatedGrossCredits)} | Charge: {formatCredits(event.creditsUsed)}</p>
                            <p className="text-[10px] text-white/40">Innovator: {formatCredits(event.builderEarningsCredits)} | Eden fee: {formatCredits(event.platformFeeCredits)}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
                            {event.source === "persistent" ? "Persistent" : "Mock"}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">{event.timestampLabel}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/40">
                      Recent user activity will appear here after service usage is recorded.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Concentration" title="Usage distribution" />
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <StatCell label="Top user share" value={`${usageMetrics.userConcentration.topUserSharePercent}%`} />
                  <StatCell label="Top 3 users" value={`${usageMetrics.userConcentration.topThreeUsersSharePercent}%`} />
                  <StatCell label="User buckets" value={`${usageMetrics.userConcentration.distinctUsers}`} sub={`${usageMetrics.userConcentration.anonymousUsageEvents} guest events`} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "pipeline" && (
          <motion.div
            key="pipeline"
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {/* Release summary cards */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {releaseSummaryCards.map((item) => (
                <StatCell key={item.id} label={item.label} value={item.value} sub={item.detail} />
              ))}
            </div>

            {/* Release events + queue */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Release Events" title="Recent transition history" badge={`${releaseEvents.length} events`} />
                <div className="space-y-2">
                  {releaseEvents.map((event) => {
                    const business = getCatalogBusinessById(event.businessId);
                    const service = getCatalogServiceById(event.serviceId);
                    return (
                      <div key={event.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {business?.name ?? "Business"} / {service?.title ?? "Service"}
                              </p>
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getReleaseStatusClasses(event.newStatus)}`}>
                                {getPipelineStatusLabel(event.newStatus)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-white/40">{event.detail}</p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">
                              {getPipelineStatusLabel(event.previousStatus)} to {getPipelineStatusLabel(event.newStatus)} by {event.actor}
                            </p>
                          </div>
                          <div className="shrink-0 text-left md:text-right">
                            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">Timestamp</p>
                            <p className="mt-0.5 text-sm font-semibold text-white">{formatPipelineTimestamp(event.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <PanelHeader eyebrow="Latest Publish" title="Most recent publish event" />
                  <p className="text-base font-semibold text-white">
                    {publishSummary.latestPublishEvent
                      ? getCatalogServiceById(publishSummary.latestPublishEvent.serviceId)?.title ?? "Published service"
                      : "No publish recorded"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {publishSummary.latestPublishEvent?.detail ?? "The owner release feed will show publish history here after a release transition is recorded through the current workflow path."}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">
                    {publishSummary.latestPublishEvent
                      ? `${publishSummary.latestPublishEvent.actor} — ${formatPipelineTimestamp(publishSummary.latestPublishEvent.timestamp)}`
                      : "Waiting for mock activity"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <PanelHeader eyebrow="Release Queue" title="Current business queue" />
                  <div className="space-y-2">
                    {businessCards.map((entry) => {
                      const releaseStatus = entry.snapshot?.status ?? getFallbackReleaseStatus(entry.business.status);
                      return (
                        <div key={`queue-${entry.business.id}`} className="flex items-start justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{entry.business.name}</p>
                            <p className="text-[11px] text-white/40">
                              {getCatalogServiceById(entry.snapshot?.serviceId ?? entry.business.featuredServiceId)?.title ?? entry.snapshot?.service?.title ?? "Active service"}{" "}
                              at {entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}%
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${entry.isFrozen ? getAdminStateClasses("frozen") : getReleaseStatusClasses(releaseStatus)}`}>
                            {entry.isFrozen ? "Frozen" : getPipelineStatusLabel(releaseStatus)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Business cards */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Businesses" title="Business workspace monitoring" badge={`${businessCards.length} watched`} />
              <div className="grid gap-3 lg:grid-cols-2">
                {businessCards.map((entry) => {
                  const releaseStatus = entry.snapshot?.status ?? getFallbackReleaseStatus(entry.business.status);
                  return (
                    <div key={entry.business.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/businesses/${entry.business.id}`} className="text-sm font-semibold text-white transition-colors hover:text-[#14989a]">
                            {entry.business.name}
                          </Link>
                          <p className="text-[11px] text-white/40">Owner: {entry.ownerName}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${entry.isFrozen ? getAdminStateClasses("frozen") : getReleaseStatusClasses(releaseStatus)}`}>
                          {entry.isFrozen ? "Frozen" : getPipelineStatusLabel(releaseStatus)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{entry.business.category}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getBusinessStatusClasses(entry.business.status)}`}>
                          Workspace {toTitleCase(entry.business.status)}
                        </span>
                        {entry.isFrozen ? (
                          <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-rose-300">Owner hold</span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400">Active</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1.5">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">Active service</p>
                          <p className="mt-0.5 text-xs font-semibold text-white">
                            {getCatalogServiceById(entry.snapshot?.serviceId ?? entry.business.featuredServiceId)?.title ?? entry.snapshot?.service?.title ?? "Active service"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1.5">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">Readiness</p>
                          <p className="mt-0.5 text-xs font-semibold text-white">{entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}%</p>
                        </div>
                      </div>
                      <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">Latest release activity</p>
                        <p className="mt-0.5 text-xs font-semibold text-white">
                          {entry.latestEvent ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} → ${getPipelineStatusLabel(entry.latestEvent.newStatus)}` : "Seeded from shared mock data"}
                        </p>
                        <p className="text-[10px] text-white/40">{entry.latestEvent?.detail ?? "No local transition recorded yet for this watched business."}</p>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Link href={`/owner/payouts/${entry.business.id}`} className="flex-1 rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:border-[#14989a]/50">View Payout</Link>
                          <Link href={`/businesses/${entry.business.id}`} className="flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-xs font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white">Open Business</Link>
                        </div>
                        <MockAdminActionButton
                          action={entry.isFrozen ? "unfreeze_business" : "freeze_business"}
                          businessId={entry.business.id}
                          label={entry.isFrozen ? "Unfreeze Business" : "Freeze Business"}
                          detail={
                            entry.isFrozen
                              ? "Remove the local business freeze flag and return this workspace to the active owner overlay."
                              : "Mark this business as frozen in local admin state."
                          }
                          className={
                            entry.isFrozen
                              ? "w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                              : "w-full border-rose-500/25 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-500/15"
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Services table */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Services" title="Service release visibility" badge={`${services.length} monitored`} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((entry) => (
                  <div key={entry.service.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <Link href={`/services/${entry.service.id}`} className="text-sm font-semibold text-white transition-colors hover:text-[#14989a]">
                      {entry.service.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-white/40">Business: {entry.businessName}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{entry.service.category}</span>
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getReleaseStatusClasses(entry.releaseStatus)}`}>
                        {getPipelineStatusLabel(entry.releaseStatus)}
                      </span>
                      {entry.businessFrozen ? (
                        <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-rose-300">Business frozen</span>
                      ) : null}
                    </div>
                    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">Latest transition</p>
                      <p className="mt-0.5 text-xs font-semibold text-white">
                        {entry.latestEvent ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} → ${getPipelineStatusLabel(entry.latestEvent.newStatus)}` : entry.service.status}
                      </p>
                      <p className="text-[10px] text-white/40">{entry.latestEvent?.detail ?? "No service-specific transition has been recorded yet."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            key="security"
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {/* Security controls */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Freeze State" title="Frozen accounts" />
                <div className="grid grid-cols-2 gap-2">
                  <StatCell label="Frozen users" value={`${frozenUsersCount}`} sub="Local freeze overlay" />
                  <StatCell label="Frozen businesses" value={`${frozenBusinessesCount}`} sub="Owner flagged" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Maintenance" title="Platform overlay toggle" />
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getAdminStateClasses(maintenanceMode ? "maintenance" : "active")}`}>
                    {maintenanceMode ? "Maintenance active" : "Active"}
                  </span>
                </div>
                <p className="mb-3 text-[11px] text-white/40">Toggle the platform-wide maintenance banner used across the Eden shell.</p>
                <MockAdminActionButton
                  action="toggle_maintenance"
                  label={maintenanceMode ? "Disable Maintenance Mode" : "Toggle Maintenance Mode"}
                  detail={
                    maintenanceMode
                      ? "Turn off the current maintenance overlay banner."
                      : "Enable a maintenance overlay banner across the platform shell."
                  }
                  className={
                    maintenanceMode
                      ? "w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                      : "w-full border-amber-500/25 bg-amber-500/10 hover:border-amber-300 hover:bg-amber-500/15"
                  }
                />
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <PanelHeader eyebrow="Audit Logs" title={auditLogsControl.title} />
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{auditLogsControl.stateLabel}</span>
                </div>
                <p className="mb-3 text-[11px] text-white/40">{auditLogsControl.description}</p>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14989a]">{auditLogsControl.actionLabel}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4 text-[11px] text-white/40">
              Freeze and unfreeze actions are development-only overlays. They update the owner records, detail views, and platform shell immediately without enforcing any real backend restriction.
            </div>

            {/* Reset controls */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Dev Resets" title="Owner reset actions" />
              <MockResetControls
                showAll
                showLedger
                showPipeline
                showReleaseHistory
                description="Owner-only development resets for the cookie-backed ledger, pipeline, release history, and admin overlay state."
              />
            </div>

            {/* Agent nodes */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Agent System" title="Node health and activity" badge={`${agentNodes.length} nodes`} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {agentNodes.map((node) => (
                  <div key={node.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{node.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{node.queueDepth}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getAgentStatusClasses(node.status)}`}>
                        {node.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-white/40">{node.activity}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Health checks */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="Health Monitors" title="System health checks" badge={`${systemHealthChecks.length} checks`} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {systemHealthChecks.map((check) => (
                  <div key={check.label} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={check.status === "Stable" ? "green" : check.status === "Watch" ? "amber" : "red"} />
                        <p className="text-sm font-semibold text-white">{check.label}</p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{check.status}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-white/40">{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform logs */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <PanelHeader eyebrow="System Logs" title="Recent control-room events" badge="Seeded overlay feed" />
              <div className="space-y-2">
                {platformLogs.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${getLogLevelClasses(event.level)}`}>
                          {event.level}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">{event.source}</span>
                      </div>
                      <span className="shrink-0 text-[10px] text-white/40">{event.timestamp}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{event.title}</p>
                    <p className="mt-1 text-[11px] text-white/40">{event.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

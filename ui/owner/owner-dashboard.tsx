"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "skipped") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatPaymentEventStatus(status: "info" | "success" | "skipped" | "failed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPayoutSettlementStatusClasses(
  status: "pending" | "settled" | "canceled",
) {
  if (status === "settled") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getOwnerReconciliationActionClasses() {
  return "inline-flex rounded-full border border-white/8 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]";
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
      id: "overview-builder-earnings",
      label: `${edenEarnedLeavesLabel} accrued`,
      value: formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits),
      detail: "Builder net earned Leaf's projection after the Eden fee share using current service pricing.",
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
      label: "Total builder liability",
      value: formatCredits(payoutAccounting.totalBuilderLiabilityCredits),
      detail: "Current unpaid builder earnings liability after persistent payout settlements and internal Eden use are applied.",
    },
    {
      id: "payout-internal-use",
      label: "Earned Leaf\'s used internally",
      value: formatCredits(payoutAccounting.totalInternalUseCredits),
      detail: "Persistent internal-use records where builders reused earned Leaf's inside Eden instead of leaving them in payout accounting.",
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
      label: "Builder liability / Eden earnings",
      value: formatCredits(payoutAccounting.totalBuilderLiabilityCredits),
      detail: `${formatCredits(
        usageMetrics.monetization.estimatedPlatformEarningsCredits,
      )} Eden earnings projected from current service pricing.`,
    },
  ];

  return (
    <div className="space-y-5">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.05] p-5 md:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div>
            <EdenBrandLockup
              size="sm"
              label="Eden"
              subtitle="Owner control room"
            />
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">Owner Layer</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Eden Control Room
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
              Central owner console for monitoring the platform, runtime control plane, and the
              remaining development overlays that still back older owner flows.
            </p>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              Honest state: payments, payouts, runtime records, sandbox tasks, and several usage
              metrics now persist. Release transitions, freeze toggles, and some ledger views still
              include development overlays until those owner flows are replaced.
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {sectionLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ownerSignalsDisplay.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-white/8 bg-white/82 p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">{signal.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-white">{signal.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{signal.detail}</p>
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
                className="rounded-2xl border border-white/8 bg-white/[0.05] p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/50">{metric.detail}</p>
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
            className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-white">{item.value}</p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${item.tone}`}
              >
                {item.value}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{metric.detail}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Health monitors</p>
                <div className="mt-4 space-y-3">
                  {systemHealthChecks.map((check) => (
                    <div key={check.label} className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{check.label}</p>
                        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                          {check.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/50">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Owner watchlist</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-white/50">
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
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
                              className="text-sm font-semibold text-white transition-colors hover:text-eden-accent"
                            >
                              {user.username}
                            </Link>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
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
                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04]/60 px-3 py-2">
                          <span className="text-xs uppercase tracking-[0.12em] text-white/50">Eden balance</span>
                          <span className="text-sm font-semibold text-white">
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
                        <div className="mt-3">
                          <OwnerLeavesGrantButton
                            userId={user.id}
                            username={user.username}
                            amountCredits={250}
                            className="w-full border-sky-200 bg-sky-50 hover:border-sky-300 hover:bg-sky-100"
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                    className="rounded-2xl border border-white/8 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/businesses/${entry.business.id}`}
                          className="text-sm font-semibold text-white transition-colors hover:text-eden-accent"
                        >
                          {entry.business.name}
                        </Link>
                        <p className="mt-1 text-sm text-white/50">Owner: {entry.ownerName}</p>
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
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
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
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">Active service</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                            {getCatalogServiceById(
                              entry.snapshot?.serviceId ?? entry.business.featuredServiceId,
                            )?.title ??
                              entry.snapshot?.service?.title ??
                              "Active service"}
                          </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">Readiness</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Latest release activity</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {entry.latestEvent
                          ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} -> ${getPipelineStatusLabel(entry.latestEvent.newStatus)}`
                          : "Seeded from shared mock data"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/50">
                        {entry.latestEvent?.detail ??
                          "No local transition recorded yet for this watched business."}
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Link
                          href={`/owner/payouts/${entry.business.id}`}
                          className="rounded-xl border border-white/8 bg-white px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]"
                        >
                          View Payout
                        </Link>
                        <Link
                          href={`/businesses/${entry.business.id}`}
                          className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
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
                            ? "Remove the local business freeze flag and return this workspace to the active owner overlay."
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
            description="Relevant services with current release state and latest transition context."
            actions={
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <Link
                    href={`/services/${entry.service.id}`}
                    className="text-sm font-semibold text-white transition-colors hover:text-eden-accent"
                  >
                    {entry.service.title}
                  </Link>
                  <p className="mt-2 text-sm text-white/50">Business: {entry.businessName}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
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
                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Latest transition</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {entry.latestEvent
                        ? `${getPipelineStatusLabel(entry.latestEvent.previousStatus)} -> ${getPipelineStatusLabel(entry.latestEvent.newStatus)}`
                        : entry.service.status}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {entry.latestEvent?.detail ??
                        "No service-specific transition has been recorded yet."}
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
            title="Release transition history"
            description="Owner visibility into publish queue movement and recent status transitions across watched businesses."
            actions={
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
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
                      className="rounded-2xl border border-white/8 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
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
                          <p className="mt-2 text-sm leading-6 text-white/50">{event.detail}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/50">
                            {getPipelineStatusLabel(event.previousStatus)} to {getPipelineStatusLabel(event.newStatus)} by {event.actor}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Timestamp</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatPipelineTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Latest publish</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {publishSummary.latestPublishEvent
                      ? getCatalogServiceById(publishSummary.latestPublishEvent.serviceId)?.title ??
                        "Published service"
                      : "No publish recorded"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {publishSummary.latestPublishEvent?.detail ??
                      "The owner release feed will show publish history here after a release transition is recorded through the current workflow path."}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/50">
                    {publishSummary.latestPublishEvent
                      ? `${publishSummary.latestPublishEvent.actor} - ${formatPipelineTimestamp(publishSummary.latestPublishEvent.timestamp)}`
                      : "Waiting for mock activity"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Current release queue</p>
                  <div className="mt-4 space-y-3">
                    {businessCards.map((entry) => {
                      const releaseStatus =
                        entry.snapshot?.status ?? getFallbackReleaseStatus(entry.business.status);

                      return (
                        <div key={`queue-${entry.business.id}`} className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{entry.business.name}</p>
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
                          <p className="mt-2 text-sm leading-6 text-white/50">
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{node.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">{node.queueDepth}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getAgentStatusClasses(
                        node.status,
                      )}`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/50">{node.activity}</p>
                </motion.article>
              ))}
            </motion.div>
          </ControlRoomSection>
        </motion.div>
        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <ControlRoomSection
            id="transaction-flow"
            eyebrow="Transaction Flow"
            title="Eden Leaf's movement"
            description="Owner-facing development ledger activity showing how spendable Leaf's move across issuing, spending, holds, and adjustments."
            actions={
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                Development ledger overlay
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                </motion.article>
              ))}
            </motion.div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Recent Leaf's activity</p>
              <div className="mt-4 space-y-3">
                {creditActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{activity.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getCreditDirectionClasses(
                            activity.direction,
                          )}`}
                        >
                          {activity.direction}
                        </span>
                        {activity.simulated ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            Overlay
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/50">{activity.detail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-semibold text-white">{activity.amount}</p>
                      <p className="mt-1 text-xs text-white/50">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Platform growth intelligence
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Compact platform performance view across service demand, customer value, and payout exposure before the detailed reconciliation and analytics feeds below.
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                  {usageMetrics.source === "persistent"
                    ? "Persistent usage analytics"
                    : "Mock fallback analytics"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {platformGrowthSummaryCards.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/8 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest usage businesses
                </p>
                <div className="mt-4 space-y-3">
                  {topBusinessesByUsage.length ? (
                    topBusinessesByUsage.slice(0, 3).map((business, index) => (
                      <div
                        key={`${business.businessId}-usage-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {business.businessName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {business.usageCount} runs | {formatCredits(business.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Top service: {business.topServiceTitle}
                            </p>
                          </div>
                          <p className="text-xs text-white/50">{business.lastUsedAtLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Usage-leading businesses appear here once the platform records tracked service runs.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest earning businesses
                </p>
                <div className="mt-4 space-y-3">
                  {topBusinessesByEarnings.length ? (
                    topBusinessesByEarnings.slice(0, 3).map((business, index) => (
                      <div
                        key={`${business.businessId}-earning-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {business.businessName}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Earned Leaf's {formatCredits(business.totalEarnedCredits)} | Ready{" "}
                              {formatCredits(business.payoutReadyCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Eden fee share {formatCredits(business.edenFeeShareCredits)}
                            </p>
                          </div>
                          <p className="text-xs text-white/50">{business.lastUsedAtLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Earning leaders appear here once priced service usage and payout accounting are available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest usage services
                </p>
                <div className="mt-4 space-y-3">
                  {topServicesByUsage.length ? (
                    topServicesByUsage.slice(0, 3).map((service, index) => (
                      <div
                        key={`${service.serviceId}-usage-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {service.serviceTitle}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {service.businessName}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            {getServicePricingDisplay({
                              pricingModel: service.pricingModel,
                              pricePerUse: service.pricePerUseCredits,
                              pricingUnit: service.pricingUnit,
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Usage-leading services appear here once the platform records tracked service usage.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest earning services
                </p>
                <div className="mt-4 space-y-3">
                  {topServicesByEarnings.length ? (
                    topServicesByEarnings.slice(0, 3).map((service, index) => (
                      <div
                        key={`${service.serviceId}-earning-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {service.serviceTitle}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {service.businessName}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Gross {formatCredits(service.monetization.estimatedGrossCredits)} | Eden fee{" "}
                              {formatCredits(service.monetization.estimatedPlatformEarningsCredits)}
                            </p>
                          </div>
                          <p className="text-xs text-white/50">{service.lastUsedAtLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Pricing-based service earning leaders appear here after tracked usage is recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top users by value
                </p>
                <div className="mt-4 space-y-3">
                  {topUsersByValue.length ? (
                    topUsersByValue.slice(0, 3).map((user, index) => (
                      <div
                        key={`${user.userId ?? user.userDisplayName}-value-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {user.userDisplayName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {user.isAnonymousUser
                                ? "Guest"
                                : user.username
                                  ? `@${user.username}`
                                  : "User"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Projected value {formatCredits(user.projectedCustomerValueCredits)} via{" "}
                              {user.topServiceTitle}.
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(user.monetization.estimatedBuilderEarningsCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">Builder-side value</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      User value leaders appear here once service usage is tied to individual platform users.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top users by usage
                </p>
                <div className="mt-4 space-y-3">
                  {topUsersByUsage.length ? (
                    topUsersByUsage.slice(0, 3).map((user, index) => (
                      <div
                        key={`${user.userId ?? user.userDisplayName}-usage-highlight`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {user.userDisplayName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {user.usageCount} runs | {user.usageSharePercent}% of tracked demand
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Top service {user.topServiceTitle} | Value{" "}
                              {formatCredits(user.projectedCustomerValueCredits)}
                            </p>
                          </div>
                          <p className="text-xs text-white/50">{user.lastUsedAtLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Usage-leading users appear here once platform service runs are recorded.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent user activity pulse
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Latest user activity
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {latestUserActivity?.userDisplayName ?? "No recent user activity"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {latestUserActivity
                        ? `${latestUserActivity.userDisplayName} used ${latestUserActivity.serviceTitle} from ${latestUserActivity.businessName} for ${formatCredits(
                            latestUserActivity.creditsUsed,
                          )}.`
                        : "Recent platform activity appears here once service usage is recorded."}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      {latestUserActivity?.timestampLabel ?? "Waiting for the next tracked user event."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Highest value user
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {topValueUser?.userDisplayName ?? "No user value yet"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {topValueUser
                        ? `${formatCredits(topValueUser.projectedCustomerValueCredits)} projected value with ${formatCredits(
                            topValueUser.monetization.estimatedPlatformEarningsCredits,
                          )} Eden fee share.`
                        : "Projected user value appears once priced service usage is attached to users."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Current usage pulse
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {strongestUsagePulse?.serviceTitle ?? "No usage pulse yet"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {strongestUsagePulse
                        ? `${strongestUsagePulse.recentPulseCount} of the latest ${recentUsagePulseWindow.length} runs landed on this service.`
                        : "Recent pulse appears once multiple fresh usage events are recorded."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Payment Operational Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Compact owner reconciliation view of the persistent top-up ledger before the detailed payment and lifecycle feeds below.
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                  {paymentMetrics.source === "persistent"
                    ? "Persistent payment ledger"
                    : "Fallback empty state"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {paymentSummaryCards.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/8 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Recent top-up payments
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Owner inspection of pending, settled, failed, and canceled Eden Leaf's top-ups.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                    {filteredPayments.length} of {paymentMetrics.recentPayments.length} shown
                  </span>
                </div>
                <OwnerReconciliationFilters
                  ariaLabel="Filter owner payment inspection rows"
                  options={paymentFilterOptions.map((option) => ({ ...option }))}
                  value={paymentFilter}
                  onChange={(value) => setPaymentFilter(value as OwnerPaymentFilter)}
                />
                <div className="mt-4 space-y-3">
                  {filteredPayments.length ? (
                    filteredPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {payment.providerLabel}
                              </p>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPaymentStatusClasses(
                                  payment.status,
                                )}`}
                              >
                                {formatPaymentStatus(payment.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {getUserDisplayLabel(payment.userId)}
                            </p>
                            {payment.userId ? (
                              <div className="mt-2">
                                <Link
                                  href={`/owner/users/${payment.userId}`}
                                  className={getOwnerReconciliationActionClasses()}
                                >
                                  Inspect Related User
                                </Link>
                              </div>
                            ) : null}
                            <div className="mt-2 space-y-1 text-xs leading-5 text-white/50">
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
                                className={getOwnerReconciliationActionClasses()}
                              >
                                View Payment
                              </Link>
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(payment.creditsAmount)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {formatMoneyAmount(payment.amountCents, payment.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      {paymentMetrics.recentPayments.length
                        ? getPaymentFilterEmptyState(paymentFilter)
                        : getPaymentFilterEmptyState("all")}
                    </div>
                  )}
                </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Payment lifecycle events
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Best-effort persistent event logs for Stripe checkout creation, webhook receipt,
                    settlement, skipped duplicate settlement, and settlement failures.
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
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
                      className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {eventLog.eventTypeLabel}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPaymentEventStatusClasses(
                                eventLog.status,
                              )}`}
                            >
                              {formatPaymentEventStatus(eventLog.status)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs leading-5 text-white/50">
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
                                  className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50"
                                >
                                  {summaryLine}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {eventLog.creditsTopUpPaymentId || eventLog.relatedUserId ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {eventLog.creditsTopUpPaymentId ? (
                                <Link
                                  href={`/owner/payments/${eventLog.creditsTopUpPaymentId}`}
                                  className={getOwnerReconciliationActionClasses()}
                                >
                                  View Payment
                                </Link>
                              ) : null}
                              {eventLog.relatedUserId ? (
                                <Link
                                  href={`/owner/users/${eventLog.relatedUserId}`}
                                  className={getOwnerReconciliationActionClasses()}
                                >
                                  Inspect Related User
                                </Link>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                            Logged
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {eventLog.createdAtLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                    No persistent payment lifecycle events are available yet. Once Stripe checkout
                    and webhook events occur, the owner layer will surface the recorded lifecycle
                    trail here.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Builder payout accounting
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {payoutAccounting.accountingRuleLabel}
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                  {payoutAccounting.payoutStatusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {payoutSummaryCards.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/8 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Payout history
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Recent persistent payout settlement records used to reconcile builder liability and paid-out balances.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                    {payoutAccounting.historySource === "persistent"
                      ? "Persistent records"
                      : "No persistent records"}
                  </span>
                </div>
                <OwnerReconciliationFilters
                  ariaLabel="Filter owner payout history rows"
                  options={payoutFilterOptions.map((option) => ({ ...option }))}
                  value={payoutFilter}
                  onChange={(value) => setPayoutFilter(value as OwnerPayoutFilter)}
                />
                <div className="mt-4 space-y-3">
                  {filteredPayoutHistory.length ? (
                    filteredPayoutHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
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
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {formatCredits(item.amountCredits)} | {item.reference ?? "No reference"}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {item.notes ?? "Internal settlement note not provided."}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">{item.createdAtLabel}</p>
                            <p className="mt-1 text-xs text-white/50">
                              {item.settledAtLabel
                                ? `Settled ${item.settledAtLabel}`
                                : "Awaiting settlement"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      {payoutAccounting.payoutHistory.length
                        ? getPayoutFilterEmptyState(payoutFilter)
                        : getPayoutFilterEmptyState("all")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout status overview
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Settled payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.settledCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.settledSettlementCredits,
                      )} recorded as paid
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Pending payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.pendingCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.pendingSettlementCredits,
                      )} still queued
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Canceled payouts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.canceledCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.canceledSettlementCredits,
                      )} removed from queue
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Internal Eden use
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.internalUseCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.internalUseCredits,
                      )} reused from earned Leaf's
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Current state
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.payoutStatusLabel}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Liability {formatCredits(payoutAccounting.totalBuilderLiabilityCredits)} | Ready{" "}
                      {formatCredits(payoutAccounting.totalPayoutReadyCredits)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Internal earned Leaf's usage
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Recent business-side internal Eden use recorded against earned Leaf's. These rows reduce remaining builder liability without creating a payout.
                  </p>
                </div>
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                  {payoutAccounting.internalUseHistorySource === "persistent"
                    ? "Persistent records"
                    : "No persistent records"}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {payoutAccounting.internalUseHistory.length ? (
                  payoutAccounting.internalUseHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {item.businessName}
                            </p>
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-700">
                              {item.usageTypeLabel}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/50">
                            {formatCredits(item.amountCredits)} | {item.reference ?? "No reference"}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {item.actorLabel}
                            {item.notes ? ` | ${item.notes}` : ""}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm font-semibold text-white">{item.createdAtLabel}</p>
                          <div className="mt-3">
                            <Link
                              href={`/owner/payouts/${item.businessId}`}
                              className={getOwnerReconciliationActionClasses()}
                            >
                              View Payout
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                    No internal earned-Leaf's usage has been recorded yet.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Usage earnings snapshot
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {usageMetrics.monetization.pricingRuleLabel}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Tracked runs</p>
                      <p className="mt-2 text-lg font-semibold text-white">{usageMetrics.totalUsageEvents}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Spendable Leaf's used</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCredits(usageMetrics.totalCreditsUsed)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Eden earnings</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Builder earnings</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Top services by usage
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.topServices.length ? (
                      usageMetrics.topServices.map((service) => (
                        <div
                          key={service.serviceId}
                          className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">{service.serviceTitle}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                                {service.businessName}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-white/50">
                                {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                              </p>
                              <p className="mt-2 text-sm leading-6 text-white/50">
                                Current rate:{" "}
                                {getServicePricingDisplay({
                                  pricingModel: service.pricingModel,
                                  pricePerUse: service.pricePerUseCredits,
                                  pricingUnit: service.pricingUnit,
                                })}
                              </p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-sm font-semibold text-white">
                                {formatCredits(service.monetization.estimatedPlatformEarningsCredits)}
                              </p>
                              <p className="mt-1 text-xs text-white/50">Eden fee share</p>
                              <p className="mt-2 text-xs text-white/50">
                                Gross: {formatCredits(service.monetization.estimatedGrossCredits)}
                              </p>
                              <p className="mt-2 text-xs text-white/50">{service.lastUsedAtLabel}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                        No service usage has been tracked yet. The leaderboard will populate after service runs are recorded through the current execution paths.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top earning businesses
                </p>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.topEarningBusinesses.length ? (
                    payoutAccounting.topEarningBusinesses.map((business) => (
                      <div
                        key={business.businessId}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{business.businessName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              Top service: {business.topServiceTitle}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {business.usageCount} runs | {formatCredits(business.totalCreditsUsed)} used
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Unpaid earnings: {formatCredits(business.unpaidEarningsCredits)}
                            </p>
                            {business.internalUseCredits > 0 ? (
                              <p className="mt-1 text-sm leading-6 text-white/50">
                                Used internally: {formatCredits(business.internalUseCredits)}
                              </p>
                            ) : null}
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Paid out: {formatCredits(business.paidOutCredits)}
                              {business.pendingSettlementCredits > 0
                                ? ` | Pending ${formatCredits(business.pendingSettlementCredits)}`
                                : ""}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(business.payoutReadyCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">Payout-ready</p>
                            <p className="mt-2 text-xs text-white/50">
                              Available for Eden use: {formatCredits(business.availableForInternalUseCredits)}
                            </p>
                            <p className="mt-2 text-xs text-white/50">
                              Eden fee share: {formatCredits(business.edenFeeShareCredits)}
                            </p>
                            <p className="mt-2 text-xs text-white/50">{business.lastUsedAtLabel}</p>
                          </div>
                        </div>
                        {business.payoutReadyCredits > 0 ? (
                          <div className="mt-3 space-y-2">
                            <Link
                              href={`/owner/payouts/${business.businessId}`}
                              className="block rounded-2xl border border-white/8 bg-white px-3 py-3 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]"
                            >
                              View Payout
                            </Link>
                            <MockPayoutSettlementButton
                              businessId={business.businessId}
                              amountCredits={business.payoutReadyCredits}
                              label="Record internal payout settlement"
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
                              className="block rounded-2xl border border-white/8 bg-white px-3 py-3 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]"
                            >
                              View Payout
                            </Link>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      Earning rankings will appear here after the platform records priced service usage.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top users by platform usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.topUsers.length ? (
                    usageMetrics.topUsers.map((user) => (
                      <div
                        key={user.userId ?? `guest-${user.userDisplayName}`}
                        className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {user.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                {user.isAnonymousUser
                                  ? "Guest"
                                  : user.username
                                    ? `@${user.username}`
                                    : "User"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {user.usageCount} runs across {user.perService.length} service
                              {user.perService.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Top service: {user.topServiceTitle}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Estimated customer value:{" "}
                              {formatCredits(user.projectedCustomerValueCredits)}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {user.usageSharePercent}% of tracked runs
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Builder earnings:{" "}
                              {formatCredits(user.monetization.estimatedBuilderEarningsCredits)}
                            </p>
                            <p className="mt-2 text-xs text-white/50">{user.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
                      User rankings will populate after platform usage events are recorded.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Usage concentration by user
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Top user share
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {usageMetrics.userConcentration.topUserSharePercent}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Top 3 users
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {usageMetrics.userConcentration.topThreeUsersSharePercent}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        User buckets
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {usageMetrics.userConcentration.distinctUsers}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {usageMetrics.userConcentration.anonymousUsageEvents} guest events
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Recent user activity
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.recentUserActivity.length ? (
                      usageMetrics.recentUserActivity.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">
                                  {event.userDisplayName}
                                </p>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                  {event.username ? `@${event.username}` : "Guest wallet"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/50">
                                Used {event.serviceTitle} from {event.businessName}.
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                Value: {formatCredits(event.estimatedGrossCredits)} | Charge:{" "}
                                {formatCredits(event.creditsUsed)}
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                Builder share: {formatCredits(event.builderEarningsCredits)} | Eden fee:{" "}
                                {formatCredits(event.platformFeeCredits)}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                              {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                            {event.timestampLabel}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4 text-sm leading-6 text-white/50">
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
                    ? `These development-only actions append local Eden Leaf's events for ${simulationBusiness.name}.`
                    : `These development-only actions append local Eden Leaf's events for ${session.user.displayName}.`
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                Seeded overlay feed
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
                  className="rounded-2xl border border-white/8 bg-white p-4"
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
                      <span className="text-xs uppercase tracking-[0.12em] text-white/50">{event.source}</span>
                    </div>
                    <span className="text-xs text-white/50">{event.timestamp}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{event.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{event.message}</p>
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
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                Owner overlay mode
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
                className="rounded-2xl border border-white/8 bg-white p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Frozen users
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {frozenUsersCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Accounts currently marked as frozen in the local mock admin state.
                </p>
              </motion.article>
              <motion.article
                variants={cardVariants}
                className="rounded-2xl border border-white/8 bg-white p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Frozen businesses
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {frozenBusinessesCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Business workspaces currently under the owner freeze overlay.
                </p>
              </motion.article>
              <motion.article
                variants={cardVariants}
                className="rounded-2xl border border-white/8 bg-white p-4"
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
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Toggle the platform-wide maintenance banner used across the Eden shell.
                </p>
                <div className="mt-4">
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
                        ? "w-full border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                        : "w-full border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                    }
                  />
                </div>
              </motion.article>
            </motion.div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4 text-sm leading-6 text-white/50">
                Freeze and unfreeze actions are development-only overlays. They update the owner records, detail views, and platform shell immediately without enforcing any real backend restriction.
              </div>
              <div className="rounded-2xl border border-white/8 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{auditLogsControl.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {auditLogsControl.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
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









"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
import { formatCredits } from "@/modules/core/mock-data";
import { MockPayoutSettlementButton } from "@/modules/core/payments/mock-payout-settlement-button";
import type { EdenMockBusiness, EdenMockUser } from "@/modules/core/mock-data";
import type { EdenBusinessPayoutAccountingSummary } from "@/modules/core/services/payout-accounting-service";
import { OwnerReconciliationFilters } from "@/ui/owner/components/owner-reconciliation-filters";

type OwnerPayoutDetailPanelProps = {
  businessProfile: EdenMockBusiness;
  businessOwner: EdenMockUser | null;
  payoutAccounting: EdenBusinessPayoutAccountingSummary;
};

type OwnerPayoutFilter = "all" | "pending" | "settled" | "failed_or_canceled";

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function getSettlementStatusClasses(status: "pending" | "settled" | "canceled") {
  if (status === "settled") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "pending") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function formatSettlementStatus(status: "pending" | "settled" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPayoutFilterEmptyState(filter: OwnerPayoutFilter) {
  if (filter === "pending") {
    return "No pending payout settlement rows are currently recorded for this business.";
  }

  if (filter === "settled") {
    return "No settled payout rows are currently recorded for this business.";
  }

  if (filter === "failed_or_canceled") {
    return "No failed or canceled payout rows are currently recorded for this business.";
  }

  return "No payout settlement rows exist for this business yet.";
}

function resolveStatusTone(payoutAccounting: EdenBusinessPayoutAccountingSummary) {
  if (payoutAccounting.statusOverview.pendingCount > 0) {
    return "warning" as const;
  }

  if (
    payoutAccounting.unpaidEarningsCredits <= 0 &&
    payoutAccounting.paidOutCredits > 0
  ) {
    return "success" as const;
  }

  if (payoutAccounting.payoutReadyCredits > 0) {
    return "info" as const;
  }

  return "default" as const;
}

function getPayoutSummaryStatusClasses(
  payoutAccounting: EdenBusinessPayoutAccountingSummary,
) {
  if (payoutAccounting.statusOverview.pendingCount > 0) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (
    payoutAccounting.unpaidEarningsCredits <= 0 &&
    payoutAccounting.paidOutCredits > 0
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (payoutAccounting.payoutReadyCredits > 0) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function getOwnerActionLinkClasses() {
  return "inline-flex rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#2dd4bf]/50 hover:bg-white/[0.04]";
}

export function OwnerPayoutDetailPanel({
  businessProfile,
  businessOwner,
  payoutAccounting,
}: OwnerPayoutDetailPanelProps) {
  const [payoutFilter, setPayoutFilter] = useState<OwnerPayoutFilter>("all");
  const latestSettlement = payoutAccounting.payoutHistory[0] ?? null;
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
  const payoutSummaryCards = [
    {
      id: "payout-summary-business",
      label: "Business",
      value: businessProfile.name,
      detail: businessOwner ? `Owner ${businessOwner.displayName}` : "Owner unavailable",
    },
    {
      id: "payout-summary-earned",
      label: "Total earned",
      value: formatCredits(payoutAccounting.totalEarnedCredits),
      detail: `Eden fee share ${formatCredits(payoutAccounting.edenFeeShareCredits)}.`,
    },
    {
      id: "payout-summary-unpaid",
      label: "Unpaid total",
      value: formatCredits(payoutAccounting.unpaidEarningsCredits),
      detail: `${formatCredits(payoutAccounting.pendingSettlementCredits)} pending settlement Leaf’s.`,
    },
    {
      id: "payout-summary-internal-use",
      label: "Used internally",
      value: formatCredits(payoutAccounting.earnedLeavesUsedInternallyCredits),
      detail: `${formatCredits(payoutAccounting.availableForInternalUseCredits)} remaining for internal Eden use.`,
    },
    {
      id: "payout-summary-ready",
      label: "Payout-ready",
      value: formatCredits(payoutAccounting.payoutReadyCredits),
      detail: `${formatCredits(payoutAccounting.holdbackCredits)} currently held back.`,
    },
    {
      id: "payout-summary-paid",
      label: "Paid out",
      value: formatCredits(payoutAccounting.paidOutCredits),
      detail: `${payoutAccounting.statusOverview.settledCount} settled row${
        payoutAccounting.statusOverview.settledCount === 1 ? "" : "s"
      } recorded.`,
    },
    {
      id: "payout-summary-latest",
      label: "Latest settlement",
      value: latestSettlement
        ? formatSettlementStatus(latestSettlement.status)
        : "No settlements",
      detail:
        latestSettlement?.settledAtLabel ??
        latestSettlement?.createdAtLabel ??
        "No settlement timestamp recorded.",
      badge: latestSettlement ? formatSettlementStatus(latestSettlement.status) : null,
      badgeClasses: latestSettlement
        ? getSettlementStatusClasses(latestSettlement.status)
        : null,
    },
  ];

  return (
    <div className="space-y-5">
      <DetailPlaceholderPanel
        eyebrow="Owner Payout Detail"
        title={`${businessProfile.name} payout reconciliation`}
        description="Owner-facing payout inspection surface for business-level settlement history, current liability, and payout-ready balances."
        status={payoutAccounting.payoutStatusLabel}
        statusTone={resolveStatusTone(payoutAccounting)}
        tags={[
          businessProfile.category,
          payoutAccounting.source === "persistent" ? "Persistent usage" : "Mock fallback usage",
          payoutAccounting.historySource === "persistent"
            ? "Persistent settlements"
            : "No settlements yet",
        ]}
        summary={`This route reuses the current business payout accounting, internal earned-Leaf’s usage, and persistent settlement history for ${businessProfile.name}. Innovator earnings are still internal-only, but settlement rows and internal Eden use now adjust what Eden considers paid out, unpaid, and payout-ready.`}
        metadata={[
          { label: "Owner", value: businessOwner?.displayName ?? "Unknown owner" },
          { label: "Total earned", value: formatCredits(payoutAccounting.totalEarnedCredits) },
          { label: "Unpaid total", value: formatCredits(payoutAccounting.unpaidEarningsCredits) },
          {
            label: "Used internally",
            value: formatCredits(payoutAccounting.earnedLeavesUsedInternallyCredits),
          },
          { label: "Payout-ready", value: formatCredits(payoutAccounting.payoutReadyCredits) },
          { label: "Paid out", value: formatCredits(payoutAccounting.paidOutCredits) },
          { label: "Holdback", value: formatCredits(payoutAccounting.holdbackCredits) },
          { label: "Eden fee share", value: formatCredits(payoutAccounting.edenFeeShareCredits) },
          {
            label: "Pending settlements",
            value: formatCredits(payoutAccounting.pendingSettlementCredits),
          },
        ]}
        actions={[
          { label: "Return to Control Room", href: "/owner" },
          { label: "Inspect Business Detail", href: `/businesses/${businessProfile.id}` },
          { label: "Open Business Workspace", href: "/business", tone: "secondary" },
        ]}
        backHref="/owner"
        backLabel="Back to Control Room"
        note="Payout rails are still internal-only. Recording a settlement here only writes a persistent payout history row and adjusts accounting totals; it does not send any real payout."
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout Operational Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Compact owner reconciliation header for this business before the full payout breakdown and settlement history below.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPayoutSummaryStatusClasses(
                  payoutAccounting,
                )}`}
              >
                {payoutAccounting.payoutStatusLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {payoutSummaryCards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      {item.label}
                    </p>
                    {"badge" in item && item.badge && item.badgeClasses ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${item.badgeClasses}`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/owner#transaction-flow"
                className={getOwnerActionLinkClasses()}
              >
                View Payout Feed
              </Link>
              <Link
                href={`/businesses/${businessProfile.id}`}
                className={getOwnerActionLinkClasses()}
              >
                View Business
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Settlement status overview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Current payout state for this business after priced usage, reserve holdback, and persistent settlement rows are reconciled.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPayoutSummaryStatusClasses(
                    payoutAccounting,
                  )}`}
                >
                  {payoutAccounting.payoutStatusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Settled rows
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
                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Pending rows
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {payoutAccounting.statusOverview.pendingCount}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {formatCredits(
                      payoutAccounting.statusOverview.pendingSettlementCredits,
                    )} queued internally
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Canceled rows
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {payoutAccounting.statusOverview.canceledCount}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {formatCredits(
                      payoutAccounting.statusOverview.canceledSettlementCredits,
                    )} removed from settlement
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Internal Eden use
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {payoutAccounting.statusOverview.internalUseCount}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {formatCredits(payoutAccounting.statusOverview.internalUseCredits)} reused from earned Leaf’s
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Business detail
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {businessProfile.visibility}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {businessOwner ? `Owner ${businessOwner.displayName}` : "Owner unavailable"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Internal settlement action
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Record a persistent internal payout settlement for the current payout-ready balance. This is a reconciliation action only.
                  </p>
                </div>
                <Link
                  href="/owner#transaction-flow"
                  className={getOwnerActionLinkClasses()}
                >
                  View Payout Feed
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Total earned
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatCredits(payoutAccounting.totalEarnedCredits)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Unpaid
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatCredits(payoutAccounting.unpaidEarningsCredits)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Used internally
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatCredits(payoutAccounting.earnedLeavesUsedInternallyCredits)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    Payout-ready
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatCredits(payoutAccounting.payoutReadyCredits)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <MockPayoutSettlementButton
                  businessId={businessProfile.id}
                  amountCredits={payoutAccounting.payoutReadyCredits}
                  label="Record mock payout settlement"
                  detail={
                    payoutAccounting.payoutReadyCredits > 0
                      ? `Mark ${formatCredits(
                          payoutAccounting.payoutReadyCredits,
                        )} as paid out for ${businessProfile.name}.`
                      : "No payout-ready balance is currently available for this business."
                  }
                  reference={`owner-payout-detail-${businessProfile.id}`}
                  notes={`Owner payout detail settlement for ${businessProfile.name}`}
                  className="w-full border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300 hover:bg-emerald-500/15"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout history
                </p>
                <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs text-white/50">
                  {filteredPayoutHistory.length} of {payoutAccounting.payoutHistory.length} shown
                </span>
              </div>
              <OwnerReconciliationFilters
                ariaLabel="Filter owner payout detail history rows"
                options={payoutFilterOptions.map((option) => ({ ...option }))}
                value={payoutFilter}
                onChange={(value) => setPayoutFilter(value as OwnerPayoutFilter)}
              />
              <div className="mt-4 space-y-3">
                {filteredPayoutHistory.length ? (
                  filteredPayoutHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(item.amountCredits)}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getSettlementStatusClasses(
                                item.status,
                              )}`}
                            >
                              {formatSettlementStatus(item.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/50">
                            {item.reference ?? "No payout reference recorded."}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {item.notes ?? "Internal accounting note not provided."}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                            Created
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {item.createdAtLabel}
                          </p>
                          <p className="mt-2 text-xs text-white/50">
                            {item.settledAtLabel
                              ? `Settled ${item.settledAtLabel}`
                              : "Awaiting settlement"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
                    {payoutAccounting.payoutHistory.length
                      ? getPayoutFilterEmptyState(payoutFilter)
                      : getPayoutFilterEmptyState("all")}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Internal earned Leaf’s usage
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Persistent internal Eden-use rows for this business. These reduce remaining earned Leaf’s without creating an external payout.
                  </p>
                </div>
                <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs text-white/50">
                  {payoutAccounting.internalUseHistory.length} recorded
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {payoutAccounting.internalUseHistory.length ? (
                  payoutAccounting.internalUseHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(item.amountCredits)}
                            </p>
                            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-300">
                              {item.usageTypeLabel}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/50">
                            {item.reference ?? "No internal-use reference recorded."}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {item.actorLabel}
                            {item.notes ? ` | ${item.notes}` : ""}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                            Recorded
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {item.createdAtLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
                    No internal earned-Leaf’s usage has been recorded for this business yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Per-service payout breakdown
              </p>
              <div className="mt-4 space-y-3">
                {payoutAccounting.perService.length ? (
                  payoutAccounting.perService.map((service) => (
                    <div
                      key={service.serviceId}
                      className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {service.serviceTitle}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                            {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/50">
                            Unpaid: {formatCredits(service.unpaidEarningsCredits)}
                          </p>
                          {service.internalUseCredits > 0 ? (
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Used internally: {formatCredits(service.internalUseCredits)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm leading-6 text-white/50">
                            Paid out: {formatCredits(service.paidOutCredits)}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCredits(service.payoutReadyCredits)}
                          </p>
                          <p className="mt-1 text-xs text-white/50">Payout-ready</p>
                          <p className="mt-2 text-xs text-white/50">
                            Holdback: {formatCredits(service.holdbackCredits)}
                          </p>
                          <p className="mt-2 text-xs text-white/50">
                            {service.lastUsedAtLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
                    Service-level payout breakdown appears here once priced usage is recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </DetailPlaceholderPanel>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatLeaves } from "@/modules/core/credits/eden-currency";
import type { EdenOwnerUserCreditsTopUpHistoryItem } from "@/modules/core/services/payment-inspection-service";
import { formatCredits } from "@/modules/core/mock-data";
import { OwnerReconciliationFilters } from "@/ui/owner/components/owner-reconciliation-filters";

type OwnerUserPaymentHistoryPanelProps = {
  source: "persistent" | "mock_fallback";
  payments: EdenOwnerUserCreditsTopUpHistoryItem[];
};

type OwnerUserPaymentFilter = "all" | "pending" | "settled" | "failed_or_canceled";

function formatPaymentStatus(status: string) {
  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPaymentStatusClasses(status: string) {
  if (status === "settled") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "pending") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (status === "failed") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getOwnerActionLinkClasses() {
  return "inline-flex rounded-full border border-white/8 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]";
}

function getPaymentFilterEmptyState(filter: OwnerUserPaymentFilter) {
  if (filter === "pending") {
    return "No pending top-up payments are currently recorded for this user.";
  }

  if (filter === "settled") {
    return "No settled top-up payments are currently recorded for this user.";
  }

  if (filter === "failed_or_canceled") {
    return "No failed or canceled top-up payments are currently recorded for this user.";
  }

  return "No persistent top-up payment history is available for this user yet.";
}

export function OwnerUserPaymentHistoryPanel({
  source,
  payments,
}: OwnerUserPaymentHistoryPanelProps) {
  const [filter, setFilter] = useState<OwnerUserPaymentFilter>("all");
  const filterOptions = [
    { value: "all", label: "All", count: payments.length },
    {
      value: "pending",
      label: "Pending",
      count: payments.filter((payment) => payment.status === "pending").length,
    },
    {
      value: "settled",
      label: "Settled",
      count: payments.filter((payment) => payment.status === "settled").length,
    },
    {
      value: "failed_or_canceled",
      label: "Failed/Canceled",
      count: payments.filter(
        (payment) => payment.status === "failed" || payment.status === "canceled",
      ).length,
    },
  ] as const;
  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        if (filter === "all") {
          return true;
        }

        if (filter === "failed_or_canceled") {
          return payment.status === "failed" || payment.status === "canceled";
        }

        return payment.status === filter;
      }),
    [filter, payments],
  );

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Payments
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Persistent top-up history for this inspected user, linked back into the owner payment
            drill-down route.
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
          {source === "persistent"
            ? `${filteredPayments.length} of ${payments.length} shown`
            : "Fallback empty state"}
        </span>
      </div>
      <OwnerReconciliationFilters
        ariaLabel="Filter owner user payment rows"
        options={filterOptions.map((option) => ({ ...option }))}
        value={filter}
        onChange={(value) => setFilter(value as OwnerUserPaymentFilter)}
      />
      <div className="mt-4 space-y-3">
        {filteredPayments.length ? (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{payment.providerLabel}</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getPaymentStatusClasses(
                        payment.status,
                      )}`}
                    >
                      {formatPaymentStatus(payment.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {payment.packageInfo?.title ?? "Top-up package unavailable"} |{" "}
                    {payment.packageInfo?.chargeLabel ?? formatLeaves(payment.creditsAmount)}
                  </p>
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
                      {payment.settledAtLabel ? ` | Settled: ${payment.settledAtLabel}` : ""}
                    </p>
                    <p>Settlement: {payment.settlementResultLabel}</p>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/owner/payments/${payment.id}`}
                      className={getOwnerActionLinkClasses()}
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
                    {payment.packageInfo?.chargeLabel ?? "Charge unavailable"}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
            {payments.length ? getPaymentFilterEmptyState(filter) : getPaymentFilterEmptyState("all")}
          </div>
        )}
      </div>
    </div>
  );
}

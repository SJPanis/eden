"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
import {
  formatServicePricingLabel,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import {
  filterWalletTransactions,
  WalletActivityFilters,
  type WalletActivityFilter,
} from "@/ui/consumer/components/wallet-activity-filters";
import {
  buildCreditsTopUpReturnPath,
  buildPaymentTopUpReceipt,
  confirmPaymentBackedCreditsTopUp,
  getCreditsTopUpClientConfig,
  getTopUpCancellationMessage,
  readCreditsTopUpReturnState,
  startPaymentBackedCreditsTopUp,
} from "@/ui/consumer/components/credits-topup-client";

type ServiceUsagePanelProps = {
  serviceId?: string | null;
  businessId?: string | null;
  serviceTitle: string;
  summary?: string | null;
  currentBalanceCredits: number;
  recentTransactions: EdenConsumerTransactionHistoryItem[];
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  pricingModel?: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

type MockUsageResponse = {
  ok?: boolean;
  action?: "add_credits" | "simulate_service_usage";
  transactionTitle?: string;
  transactionTimestamp?: string;
  amountLabel?: string;
  creditsUsed?: number;
  creditsDelta?: number;
  requiredCredits?: number;
  currentBalanceCredits?: number;
  previousBalanceCredits?: number;
  nextBalanceCredits?: number;
  insufficientBalance?: boolean;
  error?: string;
};

type ActivityState = {
  kind: "usage" | "topup";
  amountCredits: number;
  amountLabel: string;
  previousBalanceCredits: number;
  nextBalanceCredits: number;
  title: string;
  timestamp: string;
  detail: string;
  source: "mock" | "payment" | "usage";
};

export function ServiceUsagePanel({
  serviceId,
  businessId,
  serviceTitle,
  summary,
  currentBalanceCredits,
  recentTransactions,
  pricePerUse,
  pricingType,
  pricingUnit,
  pricingModel,
  disabled = false,
  disabledReason,
}: ServiceUsagePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const [activeAction, setActiveAction] = useState<"usage" | "topup" | "payment_topup" | null>(null);
  const [activityFilter, setActivityFilter] = useState<WalletActivityFilter>("all");
  const [isPending, startTransition] = useTransition();
  const topUpConfig = useMemo(() => getCreditsTopUpClientConfig(), []);
  const cleanReturnPath = useMemo(
    () => buildCreditsTopUpReturnPath(pathname, searchParams),
    [pathname, searchParams],
  );
  const topUpReturnState = useMemo(
    () => readCreditsTopUpReturnState(searchParams),
    [searchParams],
  );

  const pricing = useMemo(
    () =>
      resolveServicePricing({
        pricePerUse,
        pricingType,
        pricingUnit,
        pricingModel,
      }),
    [pricePerUse, pricingModel, pricingType, pricingUnit],
  );

  const pricingLabel = useMemo(
    () =>
      formatServicePricingLabel(
        {
          pricePerUse,
          pricingType,
          pricingUnit,
          pricingModel,
        },
        {
          fallbackLabel: pricingModel
            ? `${pricingModel} pricing placeholder`
            : "Mock fallback usage rate",
          includePricingModel: true,
        },
      ),
    [pricePerUse, pricingModel, pricingType, pricingUnit],
  );

  const pricingUnitLabel =
    pricing.pricingType === "per_session"
      ? `${pricing.pricingUnit} per session`
      : `${pricing.pricingUnit} per use`;
  const requiredCredits = pricing.pricePerUseCredits ?? 40;
  const displayBalanceCredits = activity?.nextBalanceCredits ?? currentBalanceCredits;
  const hasSufficientBalance = displayBalanceCredits >= requiredCredits;
  const actionLabel = pricing.hasStoredPrice
    ? `Use Service for ${pricing.pricePerUseCredits?.toLocaleString()} ${pricing.pricingUnit}`
    : "Use Service";
  const filteredTransactions = useMemo(
    () => filterWalletTransactions(recentTransactions, activityFilter),
    [activityFilter, recentTransactions],
  );

  useEffect(() => {
    if (!topUpConfig.paymentEnabled) {
      return;
    }

    if (topUpReturnState.status === "cancelled") {
      setActivity(null);
      setError(getTopUpCancellationMessage(topUpConfig.mode));
      router.replace(cleanReturnPath, { scroll: false });
      return;
    }

    if (
      topUpReturnState.status !== "success" ||
      topUpReturnState.provider !== "stripe" ||
      !topUpReturnState.sessionId
    ) {
      return;
    }

    const topUpSessionId = topUpReturnState.sessionId;
    let isActive = true;

    void (async () => {
      setActiveAction("payment_topup");
      setError(null);

      try {
        const payload = await confirmPaymentBackedCreditsTopUp(topUpSessionId);

        if (!isActive) {
          return;
        }

        const receipt = buildPaymentTopUpReceipt(payload, displayBalanceCredits);
        setActivity({
          kind: "topup",
          amountCredits: receipt.amountCredits,
          amountLabel: receipt.amountLabel,
          previousBalanceCredits: receipt.previousBalanceCredits,
          nextBalanceCredits: receipt.nextBalanceCredits,
          title: receipt.title,
          timestamp: receipt.timestamp,
          detail: receipt.detail,
          source: receipt.source,
        });
        router.replace(cleanReturnPath, { scroll: false });
        startTransition(() => {
          router.refresh();
        });
      } catch (requestError) {
        if (!isActive) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to confirm the payment-backed top-up.",
        );
        router.replace(cleanReturnPath, { scroll: false });
      } finally {
        if (isActive) {
          setActiveAction(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    cleanReturnPath,
    displayBalanceCredits,
    router,
    searchParams,
    startTransition,
    topUpConfig.mode,
    topUpConfig.paymentEnabled,
    topUpReturnState.provider,
    topUpReturnState.sessionId,
    topUpReturnState.status,
  ]);

  async function handleUseService() {
    if (!serviceId || disabled || activeAction || isPending) {
      return;
    }

    if (!hasSufficientBalance) {
      setActivity(null);
      setError(
        `Insufficient Eden Credits. This run requires ${formatCreditsValue(requiredCredits)}, and your current balance is ${formatCreditsValue(displayBalanceCredits)}.`,
      );
      return;
    }

    setActiveAction("usage");
    setError(null);
    setActivity(null);

    try {
      const response = await fetch("/api/mock-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "simulate_service_usage",
          businessId,
          serviceId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as MockUsageResponse;

      if (!response.ok || !payload.ok) {
        if (payload.insufficientBalance) {
          throw new Error(
            `Insufficient Eden Credits. This run requires ${formatCreditsValue(payload.requiredCredits ?? requiredCredits)}, and your current balance is ${formatCreditsValue(payload.currentBalanceCredits ?? displayBalanceCredits)}.`,
          );
        }
        throw new Error(payload.error || "Unable to record mocked service usage.");
      }

      const chargedCredits =
        typeof payload.creditsUsed === "number"
          ? payload.creditsUsed
          : pricing.pricePerUseCredits ?? 0;
      const previousBalanceCredits =
        typeof payload.previousBalanceCredits === "number"
          ? payload.previousBalanceCredits
          : currentBalanceCredits;
      const nextBalanceCredits =
        typeof payload.nextBalanceCredits === "number"
          ? payload.nextBalanceCredits
          : previousBalanceCredits - chargedCredits;

      setActivity({
        kind: "usage",
        amountCredits: chargedCredits,
        amountLabel: payload.amountLabel ?? `-${chargedCredits} credits`,
        previousBalanceCredits,
        nextBalanceCredits,
        title: payload.transactionTitle ?? `${serviceTitle} usage settled`,
        timestamp: payload.transactionTimestamp ?? "Just now",
        detail: `Service charge posted for ${serviceTitle}.`,
        source: "usage",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record mocked service usage.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleAddCredits() {
    if (activeAction || isPending) {
      return;
    }

    setActiveAction("topup");
    setError(null);

    try {
      const response = await fetch("/api/mock-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_credits",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as MockUsageResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to add mocked Eden Credits.");
      }

      const addedCredits =
        typeof payload.creditsDelta === "number"
          ? Math.abs(payload.creditsDelta)
          : typeof payload.creditsUsed === "number"
            ? payload.creditsUsed
            : 250;
      const previousBalanceCredits =
        typeof payload.previousBalanceCredits === "number"
          ? payload.previousBalanceCredits
          : displayBalanceCredits;
      const nextBalanceCredits =
        typeof payload.nextBalanceCredits === "number"
          ? payload.nextBalanceCredits
          : previousBalanceCredits + addedCredits;

      setActivity({
        kind: "topup",
        amountCredits: addedCredits,
        amountLabel: payload.amountLabel ?? `+${addedCredits} credits`,
        previousBalanceCredits,
        nextBalanceCredits,
        title: payload.transactionTitle ?? "Wallet credits top-up",
        timestamp: payload.transactionTimestamp ?? "Just now",
        detail: "Mock Eden Credits top-up posted to the active wallet.",
        source: "mock",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add mocked Eden Credits.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleStartPaymentTopUp() {
    if (activeAction || isPending) {
      return;
    }

    setActiveAction("payment_topup");
    setError(null);

    try {
      await startPaymentBackedCreditsTopUp(cleanReturnPath);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the payment-backed credits top-up.",
      );
      setActiveAction(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-eden-edge bg-[linear-gradient(140deg,rgba(255,255,255,0.97),rgba(239,246,255,0.94),rgba(255,247,237,0.92))] p-4 shadow-[0_18px_38px_-28px_rgba(19,33,68,0.26)] md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Use This Service
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-eden-ink">
            {serviceTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            {summary ||
              "Run this service through Eden's mocked usage path. This records a ServiceUsage event and refreshes wallet-facing mock activity without charging any real payment rail."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleUseService}
            disabled={!serviceId || disabled || !!activeAction || isPending}
            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-eden-ring bg-eden-accent-soft px-4 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:border-eden-edge disabled:bg-white disabled:text-eden-muted"
          >
            {activeAction === "usage" ? "Recording Usage..." : actionLabel}
          </button>
          {topUpConfig.paymentEnabled ? (
            <button
              type="button"
              onClick={handleStartPaymentTopUp}
              disabled={!!activeAction || isPending}
              className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-eden-ring bg-eden-accent-soft px-4 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:border-eden-edge disabled:bg-white disabled:text-eden-muted"
            >
              {activeAction === "payment_topup"
                ? "Opening Checkout..."
                : topUpConfig.paymentLabel}
            </button>
          ) : null}
          {topUpConfig.mockEnabled ? (
            <button
              type="button"
              onClick={handleAddCredits}
              disabled={!!activeAction || isPending}
              className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm font-semibold text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction === "topup"
                ? "Adding Credits..."
                : topUpConfig.paymentEnabled
                  ? "Add 250 Credits (Mock)"
                  : "Add 250 Credits"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Price Per Use</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">{pricingLabel}</p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Required For This Run</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {formatCreditsValue(requiredCredits)}
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Current Balance</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {formatCreditsValue(displayBalanceCredits)}
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Usage Readiness</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {hasSufficientBalance
              ? pricing.hasStoredPrice
                ? `Ready at ${pricingUnitLabel}`
                : "Ready with fallback mock rate"
              : "Insufficient balance"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/65 p-4 text-sm leading-6 text-eden-muted">
        {topUpConfig.paymentEnabled
          ? "Service usage still settles through Eden Credits first. Wallet top-ups can use Stripe Checkout in this environment, while usage continues to record through the existing credits and ServiceUsage paths."
          : "No real payment is charged yet. Eden only records a mocked transaction and a persistent service-usage event for analytics."}
      </div>

      {!hasSufficientBalance ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
          Your Eden Credits balance is below the required service price. Add mocked credits to
          continue this internal wallet flow.
        </div>
      ) : null}

      {disabledReason ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
          {disabledReason}
        </div>
      ) : null}

      {activity ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
            Latest Wallet Receipt
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
              <p className="text-sm font-semibold text-emerald-900">{activity.title}</p>
              <p className="mt-2 text-sm text-emerald-800">{activity.detail}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-emerald-700">
                {activity.timestamp}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">Wallet Impact</p>
              <p className="mt-2 text-sm font-semibold text-emerald-900">{activity.amountLabel}</p>
              <p className="mt-2 text-sm text-emerald-800">
                {formatCreditsValue(activity.previousBalanceCredits)} to{" "}
                {formatCreditsValue(activity.nextBalanceCredits)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-eden-edge bg-white/82 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Recent Wallet Activity
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              Latest mocked top-ups and service charges for the active consumer wallet.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            {filteredTransactions.length} events
          </p>
        </div>
        <WalletActivityFilters value={activityFilter} onChange={setActivityFilter} />

        <div className="mt-4 space-y-3">
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-eden-ink">{transaction.title}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      {transaction.relatedServiceName
                        ? `Related service: ${transaction.relatedServiceName}. ${transaction.detail}`
                        : transaction.detail}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p
                      className={`text-sm font-semibold ${
                        transaction.creditsDelta >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {transaction.amountLabel}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                      {transaction.timestamp}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-eden-edge bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Resulting Balance
                    </p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {formatCreditsValue(transaction.resultingBalanceCredits)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Wallet Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {transaction.kind === "wallet"
                        ? "Top-up"
                        : transaction.kind === "usage"
                          ? "Service charge"
                          : transaction.kind}
                    </p>
                  </div>
                </div>
                {transaction.relatedServiceHref ? (
                  <div className="mt-3">
                    <Link
                      href={transaction.relatedServiceHref}
                      className="inline-flex rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                    >
                      View Service
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
              No wallet activity matches the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCreditsValue(value: number) {
  return `${value.toLocaleString()} credits`;
}

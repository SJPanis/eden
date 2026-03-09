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
  formatWalletEventLabel,
  getWalletEventBadgeClasses,
} from "@/ui/consumer/components/wallet-activity-shared";
import {
  buildTopUpCancellationMessage,
  buildTopUpFailureMessage,
  buildTopUpProcessingMessage,
  buildCreditsTopUpReturnPath,
  buildPaymentTopUpReceipt,
  confirmPaymentBackedCreditsTopUp,
  getCreditsTopUpActionLabel,
  getCreditsTopUpPackageById,
  getCreditsTopUpClientConfig,
  readCreditsTopUpReturnState,
  startPaymentBackedCreditsTopUp,
  type EdenTopUpStatusMessage,
} from "@/ui/consumer/components/credits-topup-client";
import { CreditsTopUpPackageSelector } from "@/ui/consumer/components/credits-topup-package-selector";

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
  availabilityLabel?: string;
  availabilityDetail?: string;
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
  availabilityLabel,
  availabilityDetail,
}: ServiceUsagePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState<EdenTopUpStatusMessage | null>(null);
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const [activeAction, setActiveAction] = useState<"usage" | "topup" | "payment_topup" | null>(null);
  const [activityFilter, setActivityFilter] = useState<WalletActivityFilter>("all");
  const [isPending, startTransition] = useTransition();
  const topUpConfig = useMemo(() => getCreditsTopUpClientConfig(), []);
  const [selectedPackageId, setSelectedPackageId] = useState(
    topUpConfig.defaultPackageId ?? "",
  );
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
  const selectedPackage = useMemo(
    () => getCreditsTopUpPackageById(selectedPackageId),
    [selectedPackageId],
  );
  const hasSufficientBalance = displayBalanceCredits >= requiredCredits;
  const actionLabel = pricing.hasStoredPrice
    ? `Use Service for ${pricing.pricePerUseCredits?.toLocaleString()} ${pricing.pricingUnit}`
    : "Use Service";
  const filteredTransactions = useMemo(
    () => filterWalletTransactions(recentTransactions, activityFilter),
    [activityFilter, recentTransactions],
  );
  const walletActivityCounts = useMemo(
    () => ({
      all: recentTransactions.length,
      topups: recentTransactions.filter((transaction) => transaction.kind === "wallet").length,
      service_charges: recentTransactions.filter((transaction) => transaction.kind === "usage")
        .length,
    }),
    [recentTransactions],
  );
  const latestVisibleTransaction = filteredTransactions[0] ?? null;
  const serviceAvailabilityLabel = availabilityLabel ?? (disabled ? "Preview only" : "Published and available");
  const serviceAvailabilityDetail =
    availabilityDetail ??
    (disabled
      ? "This service is not currently available for a consumer run."
      : "This service can be run immediately through the Eden Credits wallet flow.");

  useEffect(() => {
    if (!topUpConfig.paymentEnabled) {
      return;
    }

    if (topUpReturnState.status === "cancelled") {
      setActivity(null);
      setStatusMessage(buildTopUpCancellationMessage(topUpConfig.mode, selectedPackageId));
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
      setStatusMessage(null);

      try {
        const payload = await confirmPaymentBackedCreditsTopUp(topUpSessionId);

        if (!isActive) {
          return;
        }

        if (payload.status === "settled") {
          const receipt = buildPaymentTopUpReceipt(
            payload,
            displayBalanceCredits,
            selectedPackageId,
          );
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
          startTransition(() => {
            router.refresh();
          });
        } else if (payload.status === "processing") {
          setActivity(null);
          setStatusMessage(buildTopUpProcessingMessage(selectedPackageId, payload.message));
        } else {
          setActivity(null);
          setStatusMessage(buildTopUpFailureMessage(selectedPackageId, payload.message));
        }

        router.replace(cleanReturnPath, { scroll: false });
      } catch (requestError) {
        if (!isActive) {
          return;
        }

        setStatusMessage({
          tone: "danger",
          title: "Confirmation unavailable",
          detail:
            requestError instanceof Error
              ? requestError.message
              : "Unable to confirm the payment-backed top-up.",
        });
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
    selectedPackageId,
  ]);

  async function handleUseService() {
    if (!serviceId || disabled || activeAction || isPending) {
      return;
    }

    if (!hasSufficientBalance) {
      setActivity(null);
      setStatusMessage({
        tone: "warning",
        title: "Insufficient balance",
        detail: `This run requires ${formatCreditsValue(requiredCredits)}, and your current balance is ${formatCreditsValue(displayBalanceCredits)}.`,
      });
      return;
    }

    setActiveAction("usage");
    setStatusMessage(null);
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
      setStatusMessage({
        tone: "danger",
        title: "Usage not recorded",
        detail:
          requestError instanceof Error
            ? requestError.message
            : "Unable to record mocked service usage.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleAddCredits() {
    if (activeAction || isPending) {
      return;
    }

    setActiveAction("topup");
    setStatusMessage(null);

    try {
      const response = await fetch("/api/mock-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_credits",
          packageId: selectedPackageId,
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
        title: payload.transactionTitle ?? `Wallet credits top-up (${selectedPackage.title})`,
        timestamp: payload.transactionTimestamp ?? "Just now",
        detail: `Mock Eden Credits top-up posted to the active wallet for ${selectedPackage.title}.`,
        source: "mock",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (requestError) {
      setStatusMessage({
        tone: "danger",
        title: "Top-up not recorded",
        detail:
          requestError instanceof Error
            ? requestError.message
            : "Unable to add mocked Eden Credits.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleStartPaymentTopUp() {
    if (activeAction || isPending) {
      return;
    }

    setActiveAction("payment_topup");
    setStatusMessage({
      tone: "info",
      title: "Preparing checkout",
      detail: `${selectedPackage.title} is being prepared for Stripe Checkout. Credits will only be added after Eden receives settlement confirmation.`,
    });

    try {
      await startPaymentBackedCreditsTopUp(cleanReturnPath, selectedPackageId);
    } catch (requestError) {
      setStatusMessage({
        tone: "danger",
        title: "Checkout unavailable",
        detail:
          requestError instanceof Error
            ? requestError.message
            : "Unable to start the payment-backed credits top-up.",
      });
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
              "Run this service through Eden's mocked usage path. The visible Eden Credits price is what gets deducted, ServiceUsage is recorded, and no hidden payment rail is charged during the run."}
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
                : getCreditsTopUpActionLabel(selectedPackageId, "payment")}
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
                  ? `${getCreditsTopUpActionLabel(selectedPackageId, "mock")} (Mock)`
                  : getCreditsTopUpActionLabel(selectedPackageId, "mock")}
            </button>
          ) : null}
        </div>
      </div>

      <CreditsTopUpPackageSelector
        packages={topUpConfig.packages}
        selectedPackageId={selectedPackageId}
        onSelect={setSelectedPackageId}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Availability</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">{serviceAvailabilityLabel}</p>
          <p className="mt-2 text-sm leading-6 text-eden-muted">{serviceAvailabilityDetail}</p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Billing model</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">Eden Credits only</p>
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            Each run uses the visible credit price below. Wallet top-ups are the only time a payment-backed checkout can appear.
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">No hidden charges</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            Explicit top-up, explicit run
          </p>
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            Service use deducts credits only. Checkout is only used when you choose to add credits to the wallet.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
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
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Wallet charge</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {formatCreditsValue(requiredCredits)}
          </p>
          <p className="mt-2 text-xs text-eden-muted">
            The exact balance change applied when this service run succeeds.
          </p>
        </div>
        <div className="rounded-2xl border border-eden-ring bg-eden-accent-soft/35 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Selected Top-up</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {selectedPackage.title}
          </p>
          <p className="mt-2 text-xs text-eden-muted">{selectedPackage.chargeLabel}</p>
          <p className="mt-2 text-xs text-eden-muted">{selectedPackage.detail}</p>
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
          ? `Selected package: ${selectedPackage.title}. Service usage settles through Eden Credits first, and Stripe top-ups only add credits after webhook settlement confirms the purchase.`
          : "No real payment is charged during service use. Eden only records a wallet event plus a persistent service-usage event for analytics."}
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
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
              Latest Wallet Receipt
            </p>
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {activity.kind === "usage"
                ? "Service charge"
                : activity.source === "payment"
                  ? "Payment-backed top-up"
                  : "Mock top-up"}
            </span>
          </div>
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

      {statusMessage ? (
        <div
          className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
            statusMessage.tone === "danger"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : statusMessage.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
            {statusMessage.title}
          </p>
          <p className="mt-2">{statusMessage.detail}</p>
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
        <WalletActivityFilters
          value={activityFilter}
          onChange={setActivityFilter}
          counts={walletActivityCounts}
        />

        {latestVisibleTransaction ? (
          <div className="mt-4 rounded-2xl border border-eden-ring bg-[linear-gradient(135deg,rgba(219,234,254,0.42),rgba(255,255,255,0.98))] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Latest movement
                  </p>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getWalletEventBadgeClasses(
                      latestVisibleTransaction.kind,
                    )}`}
                  >
                    {formatWalletEventLabel(latestVisibleTransaction.kind)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-eden-ink">
                  {latestVisibleTransaction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {latestVisibleTransaction.relatedServiceName
                    ? `Related service: ${latestVisibleTransaction.relatedServiceName}. ${latestVisibleTransaction.detail}`
                    : latestVisibleTransaction.detail}
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-white/90 p-4 text-left md:min-w-[220px] md:text-right">
                <p
                  className={`text-sm font-semibold ${
                    latestVisibleTransaction.creditsDelta >= 0
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {latestVisibleTransaction.amountLabel}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Resulting balance
                </p>
                <p className="mt-1 text-sm font-semibold text-eden-ink">
                  {formatCreditsValue(latestVisibleTransaction.resultingBalanceCredits)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                  {latestVisibleTransaction.timestamp}
                </p>
              </div>
            </div>
            {latestVisibleTransaction.relatedServiceHref ? (
              <div className="mt-3">
                <Link
                  href={latestVisibleTransaction.relatedServiceHref}
                  className="inline-flex rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                >
                  View Related Service
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className={`rounded-2xl border p-4 ${
                  index === 0
                    ? "border-eden-ring bg-[linear-gradient(135deg,rgba(219,234,254,0.22),rgba(255,255,255,0.96))]"
                    : "border-eden-edge bg-eden-bg/60"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-eden-ink">{transaction.title}</p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getWalletEventBadgeClasses(
                          transaction.kind,
                        )}`}
                      >
                        {formatWalletEventLabel(transaction.kind)}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-full border border-eden-ring bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-eden-ink">
                          Latest visible
                        </span>
                      ) : null}
                    </div>
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
                    <p className="mt-2 text-xs text-eden-muted">After this wallet event</p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Wallet Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {formatWalletEventLabel(transaction.kind)}
                    </p>
                  </div>
                </div>
                {transaction.relatedServiceHref ? (
                  <div className="mt-3">
                    <Link
                      href={transaction.relatedServiceHref}
                      className="inline-flex rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                    >
                      View Related Service
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

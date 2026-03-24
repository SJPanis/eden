"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  formatDisplayPricingUnit,
  formatLeaves,
  formatLeavesAmountLabel,
} from "@/modules/core/credits/eden-currency";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
import {
  formatServicePricingLabel,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import {
  edenLaunchLabels,
  getLaunchAvailabilityLabel,
} from "@/ui/consumer/components/service-affordability-shared";
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
  usageActionDisabled?: boolean;
  usageActionDisabledReason?: string;
  availabilityLabel?: string;
  availabilityDetail?: string;
};

type MockUsageResponse = {
  ok?: boolean;
  action?: "simulate_service_usage";
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
  usageActionDisabled = false,
  usageActionDisabledReason,
  availabilityLabel,
  availabilityDetail,
}: ServiceUsagePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState<EdenTopUpStatusMessage | null>(null);
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const [activeAction, setActiveAction] = useState<"usage" | "payment_topup" | null>(null);
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
            ? `${pricingModel} pricing not finalized`
            : "Fallback usage rate",
          includePricingModel: true,
        },
      ),
    [pricePerUse, pricingModel, pricingType, pricingUnit],
  );

  const pricingUnitLabel =
    pricing.pricingType === "per_session"
      ? `${formatDisplayPricingUnit(pricing.pricingUnit)} per session`
      : `${formatDisplayPricingUnit(pricing.pricingUnit)} per use`;
  const requiredCredits = pricing.pricePerUseCredits ?? 40;
  const displayBalanceCredits = activity?.nextBalanceCredits ?? currentBalanceCredits;
  const selectedPackage = useMemo(
    () => getCreditsTopUpPackageById(selectedPackageId),
    [selectedPackageId],
  );
  const hasSufficientBalance = displayBalanceCredits >= requiredCredits;
  const balanceShortfall = Math.max(requiredCredits - displayBalanceCredits, 0);
  const actionLabel = pricing.hasStoredPrice
    ? `${edenLaunchLabels.runService} for ${formatLeaves(pricing.pricePerUseCredits ?? requiredCredits)}`
    : edenLaunchLabels.runService;
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
  const serviceAvailabilityLabel =
    availabilityLabel ?? (disabled ? getLaunchAvailabilityLabel("preview") : getLaunchAvailabilityLabel("published"));
  const serviceAvailabilityDetail =
    availabilityDetail ??
    (disabled
      ? "This service is not currently available for a consumer run."
      : "This service can be run immediately through the Eden Leaf's wallet flow.");
  const runDecisionSummary = disabled
    ? {
        toneClass: "border-amber-500/25 bg-amber-500/10",
        title: "Service run unavailable",
        detail:
          disabledReason ??
          "This service cannot be run from the current route state.",
        cue: "Review availability first",
      }
    : usageActionDisabled
      ? {
          toneClass: "border-sky-500/25 bg-sky-500/10",
          title: "Use the live runner above",
          detail:
            usageActionDisabledReason ??
            "This published service now has a dedicated paid execution panel above so output and accounting stay in one flow.",
          cue: "Run through the live execution panel",
        }
    : hasSufficientBalance
      ? {
          toneClass: "border-emerald-500/30 bg-emerald-500/10",
          title: "Ready now with visible pricing",
          detail: `Press ${edenLaunchLabels.runService} to deduct ${formatCreditsValue(requiredCredits)} from your Eden Wallet and record usage for ${serviceTitle}.`,
          cue: `${edenLaunchLabels.runService} now`,
        }
    : {
        toneClass: "border-amber-500/25 bg-amber-500/10",
        title: "Top up before you run",
        detail: `This service needs ${formatCreditsValue(requiredCredits)}. Your wallet is short by ${formatCreditsValue(balanceShortfall)}.`,
        cue: `${edenLaunchLabels.addCredits} first, then ${edenLaunchLabels.runService}.`,
      };

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
              : "Unable to confirm the payment-backed Leaf's top-up.",
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
            `Insufficient Eden Leaf's. This run requires ${formatCreditsValue(payload.requiredCredits ?? requiredCredits)}, and your current balance is ${formatCreditsValue(payload.currentBalanceCredits ?? displayBalanceCredits)}.`,
          );
        }
        throw new Error(payload.error || "Unable to record service usage through the current wallet overlay.");
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
        amountLabel: formatLeavesAmountLabel(payload.amountLabel ?? `-${chargedCredits} Leaves`),
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
            : "Unable to record service usage through the current wallet overlay.",
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
      detail: `${selectedPackage.title} is being prepared for Stripe Checkout. Leaves will only be added after Eden receives settlement confirmation.`,
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
            : "Unable to start the payment-backed Leaf's top-up.",
      });
      setActiveAction(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.05] p-4 shadow-[0_18px_38px_-28px_rgba(19,33,68,0.26)] md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Use This Service
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            {serviceTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {summary ||
              "Run this service through Eden's current wallet-overlay path. The visible Eden Leaf's price is what gets deducted, ServiceUsage is recorded, and no hidden payment rail is charged during the run."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleUseService}
            disabled={
              !serviceId ||
              disabled ||
              usageActionDisabled ||
              !!activeAction ||
              isPending ||
              !hasSufficientBalance
            }
            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white disabled:text-white/50"
          >
            {usageActionDisabled
              ? "Use Live Runner Above"
              : activeAction === "usage"
                ? "Recording Usage..."
                : actionLabel}
          </button>
          {topUpConfig.paymentEnabled ? (
            <button
              type="button"
              onClick={handleStartPaymentTopUp}
              disabled={!!activeAction || isPending}
              className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white disabled:text-white/50"
            >
              {activeAction === "payment_topup"
                ? "Opening Checkout..."
                : getCreditsTopUpActionLabel(selectedPackageId, "payment")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        Honest state: this lower panel is still the wallet-overlay fallback for priced service
        usage. If a dedicated live runner exists above, use that path for the real execution
        record.
      </div>

      <CreditsTopUpPackageSelector
        packages={topUpConfig.packages}
        selectedPackageId={selectedPackageId}
        onSelect={setSelectedPackageId}
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                First-time run flow
              </p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                The same decision sequence applies every time: check the visible price, compare it to your wallet, Add Leaf's only if needed, then run the service.
              </p>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
              Price first, then run
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-sm font-semibold text-white">1. Check price</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {pricingLabel} is the exact Eden Leaf's amount used for the run.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-sm font-semibold text-white">2. Compare wallet</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Current balance is {formatCreditsValue(displayBalanceCredits)} and required price is {formatCreditsValue(requiredCredits)}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-sm font-semibold text-white">3. Add Leaf's only if needed</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Checkout appears only during Add Leaf's. Service runs never trigger a hidden payment.
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${runDecisionSummary.toneClass}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Run decision
          </p>
          <p className="mt-3 text-base font-semibold text-white">{runDecisionSummary.title}</p>
          <p className="mt-2 text-sm leading-6 text-white/50">{runDecisionSummary.detail}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Wallet balance</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatCreditsValue(displayBalanceCredits)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Required price</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatCreditsValue(requiredCredits)}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.06] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Next action</p>
            <p className="mt-2 text-sm font-semibold text-white">{runDecisionSummary.cue}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Availability</p>
          <p className="mt-2 text-sm font-semibold text-white">{serviceAvailabilityLabel}</p>
          <p className="mt-2 text-sm leading-6 text-white/50">{serviceAvailabilityDetail}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Billing model</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {edenLaunchLabels.creditsOnlyBilling}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Each run uses the visible Leaves price below. Wallet top-ups are the only time a payment-backed checkout can appear.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">No hidden charges</p>
          <p className="mt-2 text-sm font-semibold text-white">
            Explicit top-up, explicit run
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Service use deducts Leaves only. Checkout is only used when you choose to Add Leaf's to the wallet.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Price Per Use</p>
          <p className="mt-2 text-sm font-semibold text-white">{pricingLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Required For This Run</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatCreditsValue(requiredCredits)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Current Balance</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatCreditsValue(displayBalanceCredits)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Wallet charge</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatCreditsValue(requiredCredits)}
          </p>
          <p className="mt-2 text-xs text-white/50">
            The exact balance change applied when this service run succeeds.
          </p>
        </div>
        <div className="rounded-2xl border border-[#14989a]/50 bg-[#14989a]/10 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Selected Top-up</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {selectedPackage.title}
          </p>
          <p className="mt-2 text-xs text-white/50">{selectedPackage.chargeLabel}</p>
          <p className="mt-2 text-xs text-white/50">{selectedPackage.detail}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Usage Readiness</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {hasSufficientBalance
              ? pricing.hasStoredPrice
                ? `Ready at ${pricingUnitLabel}`
                : "Ready with fallback rate"
              : "Insufficient balance"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04]/65 p-4 text-sm leading-6 text-white/50">
        {topUpConfig.paymentEnabled
          ? `Selected package: ${selectedPackage.title}. Service usage settles through Eden Leaf's first, and Stripe top-ups only Add Leaf's after webhook settlement confirms the purchase.`
          : "Stripe Checkout is not available in this environment, so Leaf's cannot be purchased from this service route."}
      </div>

      {!hasSufficientBalance ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-300">
          Your Eden Leaf's balance is below the required service price. {edenLaunchLabels.addCredits} first, then return to the visible {edenLaunchLabels.runService} action to complete the Leaves-only flow.
        </div>
      ) : null}

      {disabledReason ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-300">
          {disabledReason}
        </div>
      ) : null}

      {usageActionDisabledReason && !disabled ? (
        <div className="mt-4 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4 text-sm leading-6 text-sky-300">
          {usageActionDisabledReason}
        </div>
      ) : null}

      {activity ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-400">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
              Latest Wallet Receipt
            </p>
            <span className="rounded-full border border-emerald-500/30 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
              {activity.kind === "usage"
                ? "Service charge"
                : activity.source === "payment"
                  ? "Payment-backed top-up"
                  : "Top-up"}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.05] p-4">
              <p className="text-sm font-semibold text-emerald-300">{activity.title}</p>
              <p className="mt-2 text-sm text-emerald-300">{activity.detail}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-emerald-400">
                {activity.timestamp}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-400">Wallet Impact</p>
              <p className="mt-2 text-sm font-semibold text-emerald-300">{activity.amountLabel}</p>
              <p className="mt-2 text-sm text-emerald-300">
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
              ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
              : statusMessage.tone === "warning"
                ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                : "border-sky-500/25 bg-sky-500/10 text-sky-300"
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
            {statusMessage.title}
          </p>
          <p className="mt-2">{statusMessage.detail}</p>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Recent Wallet Activity
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Latest top-ups and service charges for the active consumer wallet path.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
            {filteredTransactions.length} events
          </p>
        </div>
        <WalletActivityFilters
          value={activityFilter}
          onChange={setActivityFilter}
          counts={walletActivityCounts}
        />

        {latestVisibleTransaction ? (
          <div className="mt-4 rounded-2xl border border-[#14989a]/50 bg-white/[0.05] p-4">
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
                <p className="mt-3 text-sm font-semibold text-white">
                  {latestVisibleTransaction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {latestVisibleTransaction.relatedServiceName
                    ? `Related service: ${latestVisibleTransaction.relatedServiceName}. ${latestVisibleTransaction.detail}`
                    : latestVisibleTransaction.detail}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4 text-left md:min-w-[220px] md:text-right">
                <p
                  className={`text-sm font-semibold ${
                    latestVisibleTransaction.creditsDelta >= 0
                      ? "text-emerald-400"
                      : "text-rose-300"
                  }`}
                >
                  {formatLeavesAmountLabel(latestVisibleTransaction.amountLabel)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                  Resulting balance
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCreditsValue(latestVisibleTransaction.resultingBalanceCredits)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                  {latestVisibleTransaction.timestamp}
                </p>
              </div>
            </div>
            {latestVisibleTransaction.relatedServiceHref ? (
              <div className="mt-3">
                <Link
                  href={latestVisibleTransaction.relatedServiceHref}
                  className="inline-flex rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
                >
                  Open Related Service
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
                    ? "border-[#14989a]/50 bg-white/[0.05]"
                    : "border-white/8 bg-white/[0.04]"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{transaction.title}</p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getWalletEventBadgeClasses(
                          transaction.kind,
                        )}`}
                      >
                        {formatWalletEventLabel(transaction.kind)}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-full border border-[#14989a]/50 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          Latest visible
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {transaction.relatedServiceName
                        ? `Related service: ${transaction.relatedServiceName}. ${transaction.detail}`
                        : transaction.detail}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p
                      className={`text-sm font-semibold ${
                        transaction.creditsDelta >= 0 ? "text-emerald-400" : "text-rose-300"
                      }`}
                    >
                      {formatLeavesAmountLabel(transaction.amountLabel)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                      {transaction.timestamp}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Resulting Balance
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatCreditsValue(transaction.resultingBalanceCredits)}
                    </p>
                    <p className="mt-2 text-xs text-white/50">After this wallet event</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Wallet Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatWalletEventLabel(transaction.kind)}
                    </p>
                  </div>
                </div>
                {transaction.relatedServiceHref ? (
                  <div className="mt-3">
                    <Link
                      href={transaction.relatedServiceHref}
                      className="inline-flex rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
                    >
                      Open Related Service
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
              No wallet activity matches the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCreditsValue(value: number) {
  return formatLeaves(value);
}





"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  edenSpendableLeavesLabel,
  formatLeaves,
  formatLeavesAmountLabel,
} from "@/modules/core/credits/eden-currency";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
import {
  filterWalletTransactions,
  WalletActivityFilters,
  type WalletActivityFilter,
} from "@/ui/consumer/components/wallet-activity-filters";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";
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
  type EdenWalletTopUpReceipt,
} from "@/ui/consumer/components/credits-topup-client";
import { CreditsTopUpPackageSelector } from "@/ui/consumer/components/credits-topup-package-selector";

type ConsumerWalletPanelProps = {
  currentBalanceCredits: number;
  recentTransactions: EdenConsumerTransactionHistoryItem[];
};

export function ConsumerWalletPanel({
  currentBalanceCredits,
  recentTransactions,
}: ConsumerWalletPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [receipt, setReceipt] = useState<EdenWalletTopUpReceipt | null>(null);
  const [statusMessage, setStatusMessage] = useState<EdenTopUpStatusMessage | null>(null);
  const [activityFilter, setActivityFilter] = useState<WalletActivityFilter>("all");
  const [activeTopUpAction, setActiveTopUpAction] = useState<"payment" | null>(null);
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

  const displayBalanceCredits = receipt?.nextBalanceCredits ?? currentBalanceCredits;
  const hasSelectedPackage = selectedPackageId.trim().length > 0;
  const selectedPackage = useMemo(
    () => getCreditsTopUpPackageById(selectedPackageId),
    [selectedPackageId],
  );
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

  useEffect(() => {
    if (!topUpConfig.paymentEnabled) {
      return;
    }

    if (topUpReturnState.status === "cancelled") {
      setReceipt(null);
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
      setActiveTopUpAction("payment");
      setStatusMessage(null);

      try {
        const payload = await confirmPaymentBackedCreditsTopUp(topUpSessionId);

        if (!isActive) {
          return;
        }

        if (payload.status === "settled") {
          setReceipt(
            buildPaymentTopUpReceipt(
              payload,
              displayBalanceCredits,
              selectedPackageId,
            ),
          );
          startTransition(() => {
            router.refresh();
          });
        } else if (payload.status === "processing") {
          setReceipt(null);
          setStatusMessage(buildTopUpProcessingMessage(selectedPackageId, payload.message));
        } else {
          setReceipt(null);
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
              : "Unable to confirm the payment-backed Leafs top-up.",
        });
        router.replace(cleanReturnPath, { scroll: false });
      } finally {
        if (isActive) {
          setActiveTopUpAction(null);
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

  async function handleStartPaymentTopUp() {
    if (isPending || activeTopUpAction) {
      return;
    }

    setActiveTopUpAction("payment");
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
            : "Unable to start the payment-backed Leafs top-up.",
      });
      setActiveTopUpAction(null);
    }
  }

  return (
    <div className="rounded-[30px] border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-5 shadow-[0_22px_45px_-30px_rgba(19,33,68,0.28)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
            Eden Wallet
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Spendable Leaves ready for discovery
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/50 md:text-base">
            Stripe checkout and webhook settlement can be live when configured, but the wallet
            balance and recent activity shown here still run through Eden&apos;s current development
            ledger overlay.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row" />
      </div>

      <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        Honest state: top-up checkout can be real in this environment, but the wallet ledger shown
        below is still the current overlay until a fully persistent consumer wallet replaces it.
      </div>

      <CreditsTopUpPackageSelector
        packages={topUpConfig.packages}
        selectedPackageId={selectedPackageId}
        onSelect={setSelectedPackageId}
      />

      <div className="mt-4 rounded-2xl border border-[#2dd4bf]/50 bg-white/[0.05] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Checkout action
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {selectedPackage.packLabel} Pack selected
            </p>
            <p className="mt-1 text-sm text-white/50">
              {selectedPackage.chargeLabel}. Leaves are added only after Stripe webhook settlement confirms the purchase.
            </p>
          </div>
          {topUpConfig.paymentEnabled ? (
            <button
              type="button"
              onClick={handleStartPaymentTopUp}
              disabled={!hasSelectedPackage || isPending || !!activeTopUpAction}
              className="inline-flex min-w-[260px] items-center justify-center rounded-2xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.04] disabled:text-white/30"
            >
              {activeTopUpAction === "payment"
                ? "Opening Checkout..."
                : getCreditsTopUpActionLabel(selectedPackageId, "payment")}
            </button>
          ) : (
            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-3 text-sm text-white/50">
              Stripe Checkout is unavailable in this environment.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                First-time wallet flow
              </p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {edenLaunchLabels.addCredits} here first, then {edenLaunchLabels.openService.toLowerCase()} and compare its visible price to your wallet before you run it.
              </p>
            </div>
            <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs text-white/50">
              Add Leafs only when needed
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
              <p className="text-sm font-semibold text-white">1. Pick a package</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Choose the amount of Eden Leafs you want to add to the wallet.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
              <p className="text-sm font-semibold text-white">2. Add Leafs</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Continue to checkout for the selected pack. Leaves appear only after the settlement flow completes.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
              <p className="text-sm font-semibold text-white">3. Open Service</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Service cards and detail pages show the exact visible price before any run happens.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2dd4bf]/50 bg-white/[0.05] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Current wallet position
          </p>
          <p className="mt-3 text-base font-semibold text-white">
            {formatCreditsValue(displayBalanceCredits)} of {edenSpendableLeavesLabel.toLowerCase()} ready for service runs
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            After you Add Leafs here, open a service card and confirm the visible Eden Leafs price before you run it.
          </p>
          <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Next action</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {displayBalanceCredits > 0
                ? edenLaunchLabels.openService
                : `${edenLaunchLabels.addCredits}, then ${edenLaunchLabels.openService}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Current Balance</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatCreditsValue(displayBalanceCredits)}
          </p>
          <p className="mt-2 text-xs text-white/50">{edenSpendableLeavesLabel}</p>
        </div>
        <div className="rounded-2xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/10 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Selected Package</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {selectedPackage.title}
          </p>
          <p className="mt-2 text-xs text-white/50">{selectedPackage.chargeLabel}</p>
          <p className="mt-2 text-xs text-white/50">{selectedPackage.detail}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Wallet Flow</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {recentTransactions.length} wallet events
          </p>
          <p className="mt-2 text-xs text-white/50">Top-ups and service charges only</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
        {topUpConfig.paymentEnabled
          ? `Selected package: ${selectedPackage.title}. Stripe Checkout remains available for a one-time Leaves purchase here, and Leaves are added only after webhook settlement.`
          : "Stripe Checkout is not available in this environment, so Leafs cannot be purchased from this wallet surface."}
      </div>

      {receipt ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-400">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
              Latest Wallet Receipt
            </p>
            <span className="rounded-full border border-emerald-500/30 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
              {receipt.source === "payment" ? "Payment-backed" : "Top-up"}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.06] p-4">
              <p className="text-sm font-semibold text-emerald-300">{receipt.title}</p>
              <p className="mt-2 text-sm text-emerald-300">{receipt.detail}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-emerald-400">
                {receipt.timestamp}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-400">Wallet Impact</p>
              <p className="mt-2 text-sm font-semibold text-emerald-300">{receipt.amountLabel}</p>
              <p className="mt-2 text-sm text-emerald-300">
                {formatCreditsValue(receipt.previousBalanceCredits)} to{" "}
                {formatCreditsValue(receipt.nextBalanceCredits)}
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

      <div className="mt-5 rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Recent Wallet Activity
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Recent consumer top-ups and service charges from the current wallet overlay.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
            {filteredTransactions.length} visible
          </p>
        </div>
        <WalletActivityFilters
          value={activityFilter}
          onChange={setActivityFilter}
          counts={walletActivityCounts}
        />

        {latestVisibleTransaction ? (
          <div className="mt-4 rounded-2xl border border-[#2dd4bf]/50 bg-white/[0.05] p-4">
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
              <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4 text-left md:min-w-[220px] md:text-right">
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
                  className="inline-flex rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white"
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
                    ? "border-[#2dd4bf]/50 bg-white/[0.05]"
                    : "border-[rgba(45,212,191,0.07)] bg-white/[0.025]"
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
                        <span className="rounded-full border border-[#2dd4bf]/50 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
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
                  <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Resulting Balance
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatCreditsValue(transaction.resultingBalanceCredits)}
                    </p>
                    <p className="mt-2 text-xs text-white/50">After this wallet event</p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
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
                      className="inline-flex rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white"
                    >
                      Open Related Service
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
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







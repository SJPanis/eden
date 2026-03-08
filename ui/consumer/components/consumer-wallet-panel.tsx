"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
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
  type EdenWalletTopUpReceipt,
} from "@/ui/consumer/components/credits-topup-client";

type ConsumerWalletPanelProps = {
  currentBalanceCredits: number;
  recentTransactions: EdenConsumerTransactionHistoryItem[];
};

type MockTopUpResponse = {
  ok?: boolean;
  transactionTitle?: string;
  transactionTimestamp?: string;
  amountLabel?: string;
  creditsDelta?: number;
  previousBalanceCredits?: number;
  nextBalanceCredits?: number;
  error?: string;
};

export function ConsumerWalletPanel({
  currentBalanceCredits,
  recentTransactions,
}: ConsumerWalletPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [receipt, setReceipt] = useState<EdenWalletTopUpReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<WalletActivityFilter>("all");
  const [activeTopUpAction, setActiveTopUpAction] = useState<"mock" | "payment" | null>(null);
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

  const displayBalanceCredits = receipt?.nextBalanceCredits ?? currentBalanceCredits;
  const filteredTransactions = useMemo(
    () => filterWalletTransactions(recentTransactions, activityFilter),
    [activityFilter, recentTransactions],
  );

  useEffect(() => {
    if (!topUpConfig.paymentEnabled) {
      return;
    }

    if (topUpReturnState.status === "cancelled") {
      setReceipt(null);
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
      setActiveTopUpAction("payment");
      setError(null);

      try {
        const payload = await confirmPaymentBackedCreditsTopUp(topUpSessionId);

        if (!isActive) {
          return;
        }

        setReceipt(buildPaymentTopUpReceipt(payload, displayBalanceCredits));
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
  ]);

  async function handleAddMockCredits() {
    if (isPending || activeTopUpAction) {
      return;
    }

    setActiveTopUpAction("mock");
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
      const payload = (await response.json().catch(() => ({}))) as MockTopUpResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to add mocked Eden Credits.");
      }

      const addedCredits =
        typeof payload.creditsDelta === "number" ? Math.abs(payload.creditsDelta) : 250;
      const previousBalanceCredits =
        typeof payload.previousBalanceCredits === "number"
          ? payload.previousBalanceCredits
          : displayBalanceCredits;
      const nextBalanceCredits =
        typeof payload.nextBalanceCredits === "number"
          ? payload.nextBalanceCredits
          : previousBalanceCredits + addedCredits;

      setReceipt({
        amountCredits: addedCredits,
        amountLabel: payload.amountLabel ?? `+${addedCredits} credits`,
        previousBalanceCredits,
        nextBalanceCredits,
        title: payload.transactionTitle ?? "Wallet credits top-up",
        timestamp: payload.transactionTimestamp ?? "Just now",
        detail: "Mock top-up recorded through the Eden Credits transaction flow.",
        source: "mock",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to add mocked Eden Credits.",
      );
    } finally {
      setActiveTopUpAction(null);
    }
  }

  async function handleStartPaymentTopUp() {
    if (isPending || activeTopUpAction) {
      return;
    }

    setActiveTopUpAction("payment");
    setError(null);

    try {
      await startPaymentBackedCreditsTopUp(cleanReturnPath);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the payment-backed credits top-up.",
      );
      setActiveTopUpAction(null);
    }
  }

  return (
    <div className="rounded-[30px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(237,242,255,0.96),rgba(255,255,255,0.98)_52%,rgba(255,247,237,0.88))] p-5 shadow-[0_22px_45px_-30px_rgba(19,33,68,0.28)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
            Eden Wallet
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-eden-ink md:text-3xl">
            Credits ready for discovery
          </h2>
          <p className="mt-3 text-sm leading-7 text-eden-muted md:text-base">
            Wallet activity on the consumer layer stays fully mocked, but it uses the same Eden
            Credits transaction path that powers service charges and top-ups across the platform.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {topUpConfig.paymentEnabled ? (
            <button
              type="button"
              onClick={handleStartPaymentTopUp}
              disabled={isPending || !!activeTopUpAction}
              className="inline-flex min-w-[210px] items-center justify-center rounded-2xl border border-eden-ring bg-eden-accent-soft px-4 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:border-eden-edge disabled:bg-white disabled:text-eden-muted"
            >
              {activeTopUpAction === "payment"
                ? "Opening Checkout..."
                : topUpConfig.paymentLabel}
            </button>
          ) : null}
          {topUpConfig.mockEnabled ? (
            <button
              type="button"
              onClick={handleAddMockCredits}
              disabled={isPending || !!activeTopUpAction}
              className="inline-flex min-w-[190px] items-center justify-center rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm font-semibold text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink disabled:cursor-not-allowed disabled:border-eden-edge disabled:bg-white disabled:text-eden-muted"
            >
              {activeTopUpAction === "mock"
                ? "Adding Credits..."
                : topUpConfig.paymentEnabled
                  ? "Add 250 Credits (Mock)"
                  : "Add 250 Credits"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Current Balance</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {formatCreditsValue(displayBalanceCredits)}
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Recent Activity</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            {recentTransactions.length} wallet events
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Wallet Flow</p>
          <p className="mt-2 text-sm font-semibold text-eden-ink">
            Top-ups and service charges only
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
        {topUpConfig.paymentEnabled
          ? "Stripe Checkout is available for a one-time credits purchase here, while the mock wallet path remains available based on the current environment mode."
          : "No external payments are connected yet. This wallet surface records internal mock credits events only."}
      </div>

      {receipt ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
            Latest Wallet Receipt
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-2xl border border-emerald-200 bg-white/82 p-4">
              <p className="text-sm font-semibold text-emerald-900">{receipt.title}</p>
              <p className="mt-2 text-sm text-emerald-800">{receipt.detail}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-emerald-700">
                {receipt.timestamp}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">Wallet Impact</p>
              <p className="mt-2 text-sm font-semibold text-emerald-900">{receipt.amountLabel}</p>
              <p className="mt-2 text-sm text-emerald-800">
                {formatCreditsValue(receipt.previousBalanceCredits)} to{" "}
                {formatCreditsValue(receipt.nextBalanceCredits)}
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

      <div className="mt-5 rounded-2xl border border-eden-edge bg-white/84 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Recent Wallet Activity
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              Recent consumer top-ups and service charges from the mocked internal wallet.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            {filteredTransactions.length} visible
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

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  formatDisplayPricingUnit,
  formatLeaves,
  formatLeavesAmountLabel,
} from "@/modules/core/credits/eden-currency";
import type {
  EdenLiveServiceExecutionDefinition,
  EdenLiveServiceExecutionResult,
} from "@/modules/core/services/live-service-execution";
import {
  resolveEffectiveUsageChargeLeaves,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";

type LiveServiceExecutionPanelProps = {
  definition: EdenLiveServiceExecutionDefinition;
  serviceId: string;
  serviceTitle: string;
  currentBalanceCredits: number;
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  pricingModel?: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

type LiveServiceExecutionResponse = {
  ok?: boolean;
  error?: string;
  insufficientBalance?: boolean;
  requiredCredits?: number;
  currentBalanceCredits?: number;
  shortfallCredits?: number;
  previousBalanceCredits?: number;
  nextBalanceCredits?: number;
  amountLabel?: string;
  transactionTitle?: string;
  transactionTimestamp?: string;
  grossCredits?: number;
  platformFeeCredits?: number;
  builderEarningsCredits?: number;
  result?: EdenLiveServiceExecutionResult;
};

type ExecutionReceipt = {
  previousBalanceCredits: number;
  nextBalanceCredits: number;
  amountLabel: string;
  transactionTitle: string;
  transactionTimestamp: string;
  grossCredits: number;
  platformFeeCredits: number;
  builderEarningsCredits: number;
};

export function LiveServiceExecutionPanel({
  definition,
  serviceId,
  serviceTitle,
  currentBalanceCredits,
  pricePerUse,
  pricingType,
  pricingUnit,
  pricingModel,
  disabled = false,
  disabledReason,
}: LiveServiceExecutionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [result, setResult] = useState<EdenLiveServiceExecutionResult | null>(null);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [executionKey, setExecutionKey] = useState(() => crypto.randomUUID());

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
  const requiredCredits = resolveEffectiveUsageChargeLeaves(
    {
      pricePerUse,
      pricingType,
      pricingUnit,
      pricingModel,
    },
    pricing.pricePerUseCredits ?? definition.metering.minimumChargeLeaves,
    definition.metering,
  );
  const displayBalanceCredits = receipt
    ? Math.max(receipt.nextBalanceCredits, currentBalanceCredits)
    : currentBalanceCredits;
  const hasSufficientBalance = displayBalanceCredits >= requiredCredits;
  const shortfallCredits = Math.max(requiredCredits - displayBalanceCredits, 0);
  const pricingUnitLabel =
    pricing.pricingType === "per_session"
      ? `${formatDisplayPricingUnit(pricing.pricingUnit)} per session`
      : `${formatDisplayPricingUnit(pricing.pricingUnit)} per use`;

  async function handleRun() {
    if (disabled || isPending) {
      return;
    }

    setErrorMessage(null);
    setSuccessNote(null);

    try {
      const response = await fetch("/api/services/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          input,
          executionKey,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as LiveServiceExecutionResponse;

      if (!response.ok || !payload.ok || !payload.result) {
        if (payload.insufficientBalance) {
          setErrorMessage(
            `This run needs ${formatLeaves(payload.requiredCredits ?? requiredCredits)}. Your wallet is short by ${formatLeaves(payload.shortfallCredits ?? shortfallCredits)}.`,
          );
          return;
        }

        throw new Error(
          payload.error ?? "Eden could not complete this service run.",
        );
      }

      setResult(payload.result);
      setReceipt({
        previousBalanceCredits:
          payload.previousBalanceCredits ?? currentBalanceCredits,
        nextBalanceCredits: payload.nextBalanceCredits ?? currentBalanceCredits,
        amountLabel: formatLeavesAmountLabel(
          payload.amountLabel ?? `-${requiredCredits} Leaves`,
        ),
        transactionTitle:
          payload.transactionTitle ?? `${serviceTitle} run completed`,
        transactionTimestamp: payload.transactionTimestamp ?? "Just now",
        grossCredits: payload.grossCredits ?? requiredCredits,
        platformFeeCredits: payload.platformFeeCredits ?? 0,
        builderEarningsCredits:
          payload.builderEarningsCredits ?? requiredCredits,
      });
      setSuccessNote(
        `Paid run completed. ${formatLeaves(requiredCredits)} was deducted and Eden recorded the builder and platform split.`,
      );
      startTransition(() => {
        router.refresh();
      });
      setExecutionKey(crypto.randomUUID());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eden could not complete this service run.",
      );
    }
  }

  return (
    <div className="rounded-[24px] border border-eden-edge bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94),rgba(255,247,237,0.9))] p-4 shadow-[0_18px_38px_-28px_rgba(19,33,68,0.26)] md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {definition.badgeLabel}
            </span>
            <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-eden-muted">
              {edenLaunchLabels.visiblePricing}
            </span>
            <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-eden-muted">
              {edenLaunchLabels.creditsOnlyBilling}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-eden-ink">
            {definition.runnerTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            {definition.runnerDescription}
          </p>
        </div>

        <div className="rounded-2xl border border-eden-edge bg-white/90 p-4 lg:min-w-[280px]">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Live run summary
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Visible price
              </p>
              <p className="mt-1 text-sm font-semibold text-eden-ink">
                {formatLeaves(requiredCredits)}
              </p>
              <p className="mt-1 text-xs text-eden-muted">{pricingUnitLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Wallet check
              </p>
              <p className="mt-1 text-sm font-semibold text-eden-ink">
                {hasSufficientBalance
                  ? "Ready now"
                  : `Needs ${formatLeaves(shortfallCredits)} more`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Balance after run
              </p>
              <p className="mt-1 text-sm font-semibold text-eden-ink">
                {hasSufficientBalance
                  ? formatLeaves(displayBalanceCredits - requiredCredits)
                  : "Top up first"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-eden-edge bg-white/92 p-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              {definition.inputLabel}
            </span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={definition.inputPlaceholder}
              disabled={disabled || isPending}
              rows={7}
              className="mt-3 w-full rounded-2xl border border-eden-edge bg-eden-bg/50 px-4 py-3 text-sm leading-6 text-eden-ink outline-none transition-colors placeholder:text-eden-muted/80 focus:border-eden-ring disabled:cursor-not-allowed disabled:bg-white"
            />
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-eden-muted">
              Eden validates the wallet first, runs the service, then records one paid usage event and one accounting split.
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={
                disabled ||
                isPending ||
                input.trim().length < definition.minimumInputLength ||
                !hasSufficientBalance
              }
              className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-eden-ring bg-eden-accent-soft px-4 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:border-eden-edge disabled:bg-white disabled:text-eden-muted"
            >
              {isPending
                ? "Running service..."
                : `${edenLaunchLabels.runService} for ${formatLeaves(requiredCredits)}`}
            </button>
          </div>
          {disabledReason ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
              {disabledReason}
            </div>
          ) : null}
          {!disabled && !hasSufficientBalance ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
              This live run needs {formatLeaves(requiredCredits)}. Add Leaves first, then return here to run the service once the wallet is ready.
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          {successNote ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
              {successNote}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-eden-edge bg-white/92 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              What this run records
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Spendable Leaves
                </p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  {formatLeaves(requiredCredits)} debited on success
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Accounting trail
                </p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  Builder earnings and Eden fee recorded
                </p>
              </div>
            </div>
          </div>

          {receipt ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                Latest paid run
              </p>
              <p className="mt-3 text-sm font-semibold text-emerald-900">
                {receipt.transactionTitle}
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                {receipt.amountLabel} | {receipt.transactionTimestamp}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">
                    Wallet change
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {formatLeaves(receipt.previousBalanceCredits)} to{" "}
                    {formatLeaves(receipt.nextBalanceCredits)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">
                    Split
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    Builder {formatLeaves(receipt.builderEarningsCredits)} and Eden{" "}
                    {formatLeaves(receipt.platformFeeCredits)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {result ? (
        <div className="mt-4 rounded-2xl border border-eden-edge bg-white/92 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Live service output
          </p>
          <h3 className="mt-3 text-lg font-semibold text-eden-ink">{result.title}</h3>
          <p className="mt-2 text-sm leading-6 text-eden-muted">{result.summary}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {result.sections.map((section) => (
              <div
                key={section.label}
                className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  {section.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-ink">{section.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Tonight&apos;s checklist
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-eden-ink">
              {result.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-eden-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

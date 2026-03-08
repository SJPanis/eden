"use client";

import {
  formatCreditsTopUpChargeLabel,
  getCreditsTopUpOffer,
  isMockCreditsTopUpEnabled,
  isPaymentBackedCreditsTopUpEnabled,
  resolveCreditsTopUpMode,
  type EdenCreditsTopUpMode,
} from "@/modules/core/payments/payment-runtime";

export type EdenWalletTopUpReceipt = {
  amountCredits: number;
  amountLabel: string;
  previousBalanceCredits: number;
  nextBalanceCredits: number;
  title: string;
  timestamp: string;
  detail: string;
  source: "mock" | "payment";
};

export type EdenTopUpCheckoutResponse = {
  ok?: boolean;
  checkoutUrl?: string;
  creditsAmount?: number;
  amountCents?: number;
  currency?: string;
  providerLabel?: string;
  error?: string;
};

export type EdenTopUpConfirmationResponse = {
  ok?: boolean;
  alreadyApplied?: boolean;
  transactionTitle?: string;
  transactionTimestamp?: string;
  amountLabel?: string;
  creditsUsed?: number;
  creditsDelta?: number;
  previousBalanceCredits?: number;
  nextBalanceCredits?: number;
  providerLabel?: string;
  settlementSummary?: string;
  error?: string;
};

const topUpQueryKeys = [
  "eden_topup",
  "eden_topup_provider",
  "eden_topup_session_id",
] as const;

type SearchParamsLike = {
  toString(): string;
  get(name: string): string | null;
};

export function getCreditsTopUpClientConfig() {
  const mode = resolveCreditsTopUpMode();
  const offer = getCreditsTopUpOffer();

  return {
    mode,
    offer,
    mockEnabled: isMockCreditsTopUpEnabled(mode),
    paymentEnabled: isPaymentBackedCreditsTopUpEnabled(mode),
    paymentLabel: `${formatCreditsTopUpChargeLabel()} via ${offer.providerLabel}`,
  };
}

export function buildCreditsTopUpReturnPath(
  pathname: string,
  searchParams: SearchParamsLike,
) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  topUpQueryKeys.forEach((key) => {
    nextSearchParams.delete(key);
  });

  const nextQuery = nextSearchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function readCreditsTopUpReturnState(
  searchParams: SearchParamsLike,
) {
  return {
    status: searchParams.get("eden_topup"),
    provider: searchParams.get("eden_topup_provider"),
    sessionId: searchParams.get("eden_topup_session_id"),
  };
}

export async function startPaymentBackedCreditsTopUp(returnPath: string) {
  const response = await fetch("/api/credits/top-up/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      returnPath,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as EdenTopUpCheckoutResponse;

  if (!response.ok || !payload.ok || !payload.checkoutUrl) {
    throw new Error(payload.error || "Unable to start the payment-backed credits top-up.");
  }

  window.location.assign(payload.checkoutUrl);
}

export async function confirmPaymentBackedCreditsTopUp(sessionId: string) {
  const response = await fetch("/api/credits/top-up/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as EdenTopUpConfirmationResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to confirm the payment-backed credits top-up.");
  }

  return payload;
}

export function buildPaymentTopUpReceipt(
  payload: EdenTopUpConfirmationResponse,
  fallbackPreviousBalanceCredits: number,
) {
  const amountCredits =
    typeof payload.creditsUsed === "number"
      ? payload.creditsUsed
      : typeof payload.creditsDelta === "number"
        ? Math.abs(payload.creditsDelta)
        : getCreditsTopUpOffer().creditsAmount;
  const previousBalanceCredits =
    typeof payload.previousBalanceCredits === "number"
      ? payload.previousBalanceCredits
      : fallbackPreviousBalanceCredits;
  const nextBalanceCredits =
    typeof payload.nextBalanceCredits === "number"
      ? payload.nextBalanceCredits
      : previousBalanceCredits + amountCredits;

  return {
    amountCredits,
    amountLabel: payload.amountLabel ?? `+${amountCredits} credits`,
    previousBalanceCredits,
    nextBalanceCredits,
    title: payload.transactionTitle ?? "Stripe Checkout top-up settled",
    timestamp: payload.transactionTimestamp ?? "Just now",
    detail:
      payload.settlementSummary ??
      "Payment-backed top-up recorded through Eden Credits.",
    source: "payment" as const,
  } satisfies EdenWalletTopUpReceipt;
}

export function getTopUpCancellationMessage(mode: EdenCreditsTopUpMode) {
  if (mode === "payment_only") {
    return "Payment-backed top-up was cancelled before credits were added.";
  }

  return "Payment-backed top-up was cancelled. Mock top-up remains available in this environment.";
}

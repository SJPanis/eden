"use client";

import {
  formatCreditsTopUpChargeLabel,
  getCreditsTopUpPackages,
  isMockCreditsTopUpEnabled,
  isPaymentBackedCreditsTopUpEnabled,
  resolveCreditsTopUpPackage,
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

export type EdenTopUpStatusMessage = {
  tone: "info" | "warning" | "danger";
  title: string;
  detail: string;
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
  status?: "settled" | "processing" | "failed" | "canceled";
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
  message?: string;
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
  const packages = getCreditsTopUpPackages();
  const defaultPackage = packages[0];

  return {
    mode,
    packages,
    defaultPackage,
    defaultPackageId: defaultPackage?.id ?? null,
    mockEnabled: isMockCreditsTopUpEnabled(mode),
    paymentEnabled: isPaymentBackedCreditsTopUpEnabled(mode),
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

export async function startPaymentBackedCreditsTopUp(
  returnPath: string,
  packageId?: string | null,
) {
  const response = await fetch("/api/credits/top-up/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      returnPath,
      packageId,
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
  packageId?: string | null,
) {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);
  const amountCredits =
    typeof payload.creditsUsed === "number"
      ? payload.creditsUsed
      : typeof payload.creditsDelta === "number"
        ? Math.abs(payload.creditsDelta)
        : selectedPackage.creditsAmount;
  const previousBalanceCredits =
    typeof payload.previousBalanceCredits === "number"
      ? payload.previousBalanceCredits
      : fallbackPreviousBalanceCredits;
  const nextBalanceCredits =
    typeof payload.nextBalanceCredits === "number"
      ? payload.nextBalanceCredits
      : previousBalanceCredits + amountCredits;

  const receiptTitle = payload.alreadyApplied
    ? `${selectedPackage.providerLabel} top-up already settled`
    : payload.transactionTitle ?? `${selectedPackage.providerLabel} top-up settled`;
  const receiptDetail = payload.alreadyApplied
    ? payload.settlementSummary ??
      `Stripe already settled ${selectedPackage.title}. Eden Credits were previously added to this wallet through the webhook-authoritative top-up flow.`
    : payload.settlementSummary ??
      `Stripe settlement confirmed for ${selectedPackage.title}. Eden Credits were added through the webhook-authoritative top-up flow.`;

  return {
    amountCredits,
    amountLabel: payload.amountLabel ?? `+${amountCredits} credits`,
    previousBalanceCredits,
    nextBalanceCredits,
    title: receiptTitle,
    timestamp: payload.transactionTimestamp ?? "Just now",
    detail: receiptDetail,
    source: "payment" as const,
  } satisfies EdenWalletTopUpReceipt;
}

export function getCreditsTopUpPackageLabel(packageId?: string | null) {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);
  return `${formatCreditsTopUpChargeLabel(packageId)} via ${selectedPackage.providerLabel}`;
}

export function getCreditsTopUpActionLabel(
  packageId: string | null | undefined,
  action: "payment" | "mock",
) {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);
  const baseLabel = `${selectedPackage.creditsAmount.toLocaleString()} credits`;

  return action === "payment" ? `Buy ${baseLabel}` : `Add ${baseLabel}`;
}

export function getCreditsTopUpPackageById(packageId?: string | null) {
  return resolveCreditsTopUpPackage(packageId);
}

export function buildTopUpCancellationMessage(
  mode: EdenCreditsTopUpMode,
  packageId?: string | null,
): EdenTopUpStatusMessage {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);

  if (mode === "payment_only") {
    return {
      tone: "warning",
      title: "Checkout cancelled",
      detail: `${selectedPackage.title} was not purchased. Eden Credits were not added to the wallet.`,
    };
  }

  return {
    tone: "warning",
    title: "Checkout cancelled",
    detail: `${selectedPackage.title} was not purchased. Mock top-up remains available in this environment.`,
  };
}

export function buildTopUpProcessingMessage(
  packageId: string | null | undefined,
  message?: string | null,
): EdenTopUpStatusMessage {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);

  return {
    tone: "info",
    title: "Payment processing",
    detail:
      message ??
      `${selectedPackage.title} has been submitted. Eden is waiting for Stripe webhook settlement before credits are added.`,
  };
}

export function buildTopUpFailureMessage(
  packageId: string | null | undefined,
  message?: string | null,
): EdenTopUpStatusMessage {
  const selectedPackage = resolveCreditsTopUpPackage(packageId);

  return {
    tone: "danger",
    title: "Top-up not settled",
    detail:
      message ??
      `${selectedPackage.title} did not settle successfully. No Eden Credits were added.`,
  };
}

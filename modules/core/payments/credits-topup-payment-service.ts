import "server-only";

import type Stripe from "stripe";
import {
  buildPaymentTopUpTransaction,
  getUserCreditsBalance,
  mergeWalletTransactions,
} from "@/modules/core/credits/mock-credits";
import { formatCredits } from "@/modules/core/mock-data";
import {
  findCreditsTopUpPackage,
  formatCurrencyAmount,
} from "@/modules/core/payments/payment-runtime";
import { createPrismaCreditsTopUpPaymentRepo } from "@/modules/core/repos/prisma-credits-topup-payment-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoCreditsTopUpPaymentRecord } from "@/modules/core/repos/repo-types";

export type EdenCreditsTopUpConfirmationResult =
  | {
      status: "settled";
      payment: EdenRepoCreditsTopUpPaymentRecord;
      transaction: ReturnType<typeof buildPaymentTopUpTransaction>;
      creditsAdded: number;
      previousBalanceCredits: number;
      nextBalanceCredits: number;
      amountCents: number;
      currency: string;
      providerLabel: string;
      settlementSummary: string;
    }
  | {
      status: "processing" | "failed" | "canceled";
      payment: EdenRepoCreditsTopUpPaymentRecord | null;
      message: string;
    };

export async function persistPendingCreditsTopUpPayment(input: {
  provider: string;
  providerSessionId: string;
  providerPaymentIntentId?: string | null;
  userId?: string | null;
  creditsAmount: number;
  amountCents: number;
  currency: string;
}) {
  const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());

  return repo.upsertPending({
    provider: input.provider,
    providerSessionId: input.providerSessionId,
    providerPaymentIntentId: input.providerPaymentIntentId ?? null,
    userId: input.userId ?? null,
    creditsAmount: input.creditsAmount,
    amountCents: input.amountCents,
    currency: input.currency,
  });
}

export async function loadSettledCreditsTopUpTransactions(options: {
  userId?: string | null;
  limit?: number;
} = {}) {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    const payments = await repo.listSettled({
      userId: options.userId ?? undefined,
      limit: options.limit,
    });

    return payments.map(mapPaymentRecordToTransaction);
  } catch (error) {
    logCreditsTopUpPaymentFailure("load_settled_transactions", error);
    return [];
  }
}

export async function loadCreditsTopUpConfirmationResult(input: {
  providerSessionId: string;
  userId: string;
  currentTransactions: ReturnType<typeof mergeWalletTransactions>;
}) {
  const payment = await loadCreditsTopUpPaymentBySessionId(input.providerSessionId);

  if (!payment) {
    return {
      status: "processing",
      payment: null,
      message:
        "Payment submitted. Eden is waiting for Stripe webhook settlement before Leaves are added.",
    } satisfies EdenCreditsTopUpConfirmationResult;
  }

  if (payment.userId && payment.userId !== input.userId) {
    throw new Error("This checkout session belongs to a different Eden user.");
  }

  if (payment.status === "failed") {
    return {
      status: "failed",
      payment,
      message:
        payment.failureReason ??
        "Stripe did not settle this top-up. No Eden Leaves were added.",
    } satisfies EdenCreditsTopUpConfirmationResult;
  }

  if (payment.status === "canceled") {
    return {
      status: "canceled",
      payment,
      message:
        payment.failureReason ??
        "This Stripe Checkout session was canceled before Eden Leaves were added.",
    } satisfies EdenCreditsTopUpConfirmationResult;
  }

  if (payment.status !== "settled") {
    return {
      status: "processing",
      payment,
      message:
        "Payment submitted. Eden is waiting for Stripe webhook settlement before Leaves are added.",
    } satisfies EdenCreditsTopUpConfirmationResult;
  }

  const transaction = mapPaymentRecordToTransaction(payment);
  const mergedTransactions = mergeWalletTransactions(input.currentTransactions, [transaction]);
  const nextBalanceCredits = getUserCreditsBalance(input.userId, mergedTransactions);
  const previousBalanceCredits = nextBalanceCredits - payment.creditsAmount;
  const providerLabel = getProviderLabel(payment.provider);

  return {
    status: "settled",
    payment,
    transaction,
    creditsAdded: payment.creditsAmount,
    previousBalanceCredits,
    nextBalanceCredits,
    amountCents: payment.amountCents,
    currency: payment.currency,
    providerLabel,
    settlementSummary: `${formatCurrencyAmount(
      payment.amountCents,
      payment.currency,
    )} settled for ${formatCredits(payment.creditsAmount)}.`,
  } satisfies EdenCreditsTopUpConfirmationResult;
}

export async function settleCreditsTopUpPaymentFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
  const existingPayment = await repo.findByProviderSessionId(session.id);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (existingPayment?.status === "settled") {
    return {
      payment: existingPayment,
      settlementResult: "already_settled" as const,
    };
  }

  const selectedPackage = resolveAndValidateSettledTopUpPackage(
    session,
    existingPayment,
  );
  const checkoutUserId = resolveCheckoutSessionUserId(session);
  const payment = await repo.markSettled({
    providerSessionId: session.id,
    providerPaymentIntentId: paymentIntentId,
    userId: checkoutUserId,
    creditsAmount: selectedPackage.creditsAmount,
    amountCents: selectedPackage.amountCents,
    currency: selectedPackage.currency,
    settledAt: new Date(),
  });

  return {
    payment,
    settlementResult: "settled" as const,
  };
}

export async function markCreditsTopUpPaymentCanceled(input: {
  providerSessionId: string;
  failureReason?: string | null;
}) {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    return await repo.markCanceled(input);
  } catch (error) {
    logCreditsTopUpPaymentFailure("mark_canceled", error);
    return null;
  }
}

export async function markCreditsTopUpPaymentFailed(input: {
  providerSessionId: string;
  failureReason?: string | null;
}) {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    return await repo.markFailed(input);
  } catch (error) {
    logCreditsTopUpPaymentFailure("mark_failed", error);
    return null;
  }
}

export function mapPaymentRecordToTransaction(
  payment: EdenRepoCreditsTopUpPaymentRecord,
) {
  return buildPaymentTopUpTransaction({
    sessionId: payment.providerSessionId,
    userId: payment.userId ?? undefined,
    creditsAmount: payment.creditsAmount,
    amountCents: payment.amountCents,
    currency: payment.currency,
    providerLabel: getProviderLabel(payment.provider),
    timestampLabel: formatPaymentTimestamp(payment.settledAt ?? payment.createdAt),
  });
}

async function loadCreditsTopUpPaymentBySessionId(providerSessionId: string) {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    return await repo.findByProviderSessionId(providerSessionId);
  } catch (error) {
    logCreditsTopUpPaymentFailure("load_payment_by_session", error);
    return null;
  }
}

function resolveAndValidateSettledTopUpPackage(
  session: Stripe.Checkout.Session,
  existingPayment?: EdenRepoCreditsTopUpPaymentRecord | null,
) {
  const packageId = session.metadata?.edenTopUpPackageId ?? null;
  const selectedPackage = findCreditsTopUpPackage(packageId);

  if (!selectedPackage) {
    throw new Error("Stripe Checkout session does not reference a valid Eden Leaves package.");
  }

  const rawCredits = session.metadata?.edenTopUpCredits;
  const parsedCredits = rawCredits ? Number.parseInt(rawCredits, 10) : NaN;

  if (Number.isFinite(parsedCredits) && parsedCredits !== selectedPackage.creditsAmount) {
    throw new Error("Stripe Checkout metadata credits do not match the selected Eden Leaves package.");
  }

  if (
    typeof session.amount_total === "number" &&
    session.amount_total > 0 &&
    session.amount_total !== selectedPackage.amountCents
  ) {
    throw new Error("Stripe Checkout amount does not match the selected Eden Leaves package.");
  }

  if (
    typeof session.currency === "string" &&
    session.currency.trim().length > 0 &&
    session.currency.toLowerCase() !== selectedPackage.currency
  ) {
    throw new Error("Stripe Checkout currency does not match the selected Eden Leaves package.");
  }

  if (existingPayment) {
    if (
      existingPayment.creditsAmount !== selectedPackage.creditsAmount ||
      existingPayment.amountCents !== selectedPackage.amountCents ||
      existingPayment.currency !== selectedPackage.currency
    ) {
      throw new Error(
        "The persisted Eden payment record does not match the Stripe Checkout package details.",
      );
    }

    const checkoutUserId = resolveCheckoutSessionUserId(session);
    if (existingPayment.userId && checkoutUserId && existingPayment.userId !== checkoutUserId) {
      throw new Error(
        "The persisted Eden payment record belongs to a different user than the Stripe Checkout session.",
      );
    }
  }

  return selectedPackage;
}

function resolveCheckoutSessionUserId(session: Stripe.Checkout.Session) {
  const metadataUserId =
    typeof session.metadata?.edenUserId === "string" &&
    session.metadata.edenUserId.trim().length > 0
      ? session.metadata.edenUserId
      : null;
  const clientReferenceUserId =
    typeof session.client_reference_id === "string" &&
    session.client_reference_id.trim().length > 0
      ? session.client_reference_id
      : null;

  if (!metadataUserId && !clientReferenceUserId) {
    return null;
  }

  if (metadataUserId && clientReferenceUserId && metadataUserId !== clientReferenceUserId) {
    throw new Error("Stripe Checkout user references are inconsistent for this Eden payment.");
  }

  return metadataUserId ?? clientReferenceUserId;
}

function getProviderLabel(provider: string) {
  return provider === "stripe" ? "Stripe Checkout" : provider;
}

function formatPaymentTimestamp(date: Date) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function logCreditsTopUpPaymentFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown credits top-up persistence error";
  console.warn(`[eden][credits-topup][${operation}] ${detail}`);
}

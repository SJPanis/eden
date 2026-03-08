import "server-only";

import type Stripe from "stripe";
import {
  buildPaymentTopUpTransaction,
  getUserCreditsBalance,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
  serializeMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import { formatCredits } from "@/modules/core/mock-data";
import {
  formatCurrencyAmount,
  getCreditsTopUpOffer,
  isPaymentBackedCreditsTopUpEnabled,
  resolveCreditsTopUpMode,
} from "@/modules/core/payments/payment-runtime";
import { getStripeClient } from "@/modules/core/payments/stripe-client";

export const creditsTopUpCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export type EdenCreditsCheckoutSession = {
  checkoutUrl: string;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
};

export type EdenConfirmedCreditsTopUp = {
  nextTransactions: ReturnType<typeof parseMockTransactionsCookie>;
  transaction: ReturnType<typeof buildPaymentTopUpTransaction>;
  creditsAdded: number;
  previousBalanceCredits: number;
  nextBalanceCredits: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
  alreadyApplied: boolean;
};

export async function createCreditsTopUpCheckoutSession(input: {
  userId: string;
  username: string;
  displayName: string;
  origin: string;
  returnPath: string;
}) {
  ensurePaymentBackedTopUpEnabled();

  const stripe = requireStripeClient();
  const offer = getCreditsTopUpOffer();
  const successUrl = buildReturnUrl(input.origin, input.returnPath, {
    eden_topup: "success",
    eden_topup_provider: "stripe",
    eden_topup_session_id: "{CHECKOUT_SESSION_ID}",
  });
  const cancelUrl = buildReturnUrl(input.origin, input.returnPath, {
    eden_topup: "cancelled",
    eden_topup_provider: "stripe",
  });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: offer.currency,
          unit_amount: offer.amountCents,
          product_data: {
            name: `Eden Credits Top-up (${offer.creditsAmount.toLocaleString()} credits)`,
            description: "One-time wallet top-up for Eden Credits.",
          },
        },
      },
    ],
    metadata: {
      edenUserId: input.userId,
      edenUsername: input.username,
      edenDisplayName: input.displayName,
      edenTopUpCredits: String(offer.creditsAmount),
      edenTopUpMode: resolveCreditsTopUpMode(),
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session did not return a redirect URL.");
  }

  return {
    checkoutUrl: session.url,
    creditsAmount: offer.creditsAmount,
    amountCents: offer.amountCents,
    currency: offer.currency,
    providerLabel: offer.providerLabel,
  } satisfies EdenCreditsCheckoutSession;
}

export async function confirmCreditsTopUpCheckout(input: {
  sessionId: string;
  userId: string;
  currentTransactions: ReturnType<typeof parseMockTransactionsCookie>;
}) {
  ensurePaymentBackedTopUpEnabled();

  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);
  const previousBalanceCredits = getUserCreditsBalance(
    input.userId,
    input.currentTransactions,
  );
  const existingTransaction = input.currentTransactions.find(
    (transaction) => transaction.id === buildPaymentTransactionId(input.sessionId),
  );

  validateCheckoutSession(session, input.userId);

  const creditsAdded = getCreditsAmountFromSession(session);
  const amountCents = session.amount_total ?? getCreditsTopUpOffer().amountCents;
  const currency = (session.currency ?? getCreditsTopUpOffer().currency).toLowerCase();

  if (existingTransaction) {
    return {
      nextTransactions: input.currentTransactions,
      transaction: existingTransaction,
      creditsAdded,
      previousBalanceCredits,
      nextBalanceCredits: previousBalanceCredits,
      amountCents,
      currency,
      providerLabel: "Stripe Checkout",
      alreadyApplied: true,
    } satisfies EdenConfirmedCreditsTopUp;
  }

  const transaction = buildPaymentTopUpTransaction({
    sessionId: input.sessionId,
    userId: input.userId,
    creditsAmount: creditsAdded,
    amountCents,
    currency,
    providerLabel: "Stripe Checkout",
    timestampLabel: formatTopUpTimestamp(session),
  });
  const nextTransactions = [transaction, ...input.currentTransactions].slice(0, 40);
  const nextBalanceCredits = getUserCreditsBalance(input.userId, nextTransactions);

  return {
    nextTransactions,
    transaction,
    creditsAdded,
    previousBalanceCredits,
    nextBalanceCredits,
    amountCents,
    currency,
    providerLabel: "Stripe Checkout",
    alreadyApplied: false,
  } satisfies EdenConfirmedCreditsTopUp;
}

export function getCreditsTopUpCookieValue(transactions: ReturnType<typeof parseMockTransactionsCookie>) {
  return serializeMockTransactionsCookie(transactions);
}

export function getCreditsTopUpCookieName() {
  return mockTransactionsCookieName;
}

export function getCreditsTopUpSuccessMessage(input: {
  creditsAmount: number;
  amountCents: number;
  currency: string;
}) {
  return `${formatCurrencyAmount(input.amountCents, input.currency)} settled for ${formatCredits(input.creditsAmount)}.`;
}

function buildReturnUrl(
  origin: string,
  returnPath: string,
  query: Record<string, string>,
) {
  const normalizedReturnPath = normalizeReturnPath(returnPath);
  const url = new URL(normalizedReturnPath, origin);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

function normalizeReturnPath(returnPath: string) {
  if (!returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/consumer";
  }

  return returnPath;
}

function requireStripeClient() {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe Checkout is not configured. Set STRIPE_SECRET_KEY to enable real credits top-ups.");
  }

  return stripe;
}

function ensurePaymentBackedTopUpEnabled() {
  if (!isPaymentBackedCreditsTopUpEnabled()) {
    throw new Error("Payment-backed top-ups are disabled. Use mock top-ups or enable hybrid/payment mode.");
  }
}

function validateCheckoutSession(session: Stripe.Checkout.Session, userId: string) {
  if (session.mode !== "payment") {
    throw new Error("This checkout session is not a one-time payment.");
  }

  if (session.payment_status !== "paid") {
    throw new Error("The checkout session has not completed payment.");
  }

  const sessionUserId = session.metadata?.edenUserId;

  if (sessionUserId && sessionUserId !== userId) {
    throw new Error("This checkout session belongs to a different Eden user.");
  }
}

function getCreditsAmountFromSession(session: Stripe.Checkout.Session) {
  const rawCredits = session.metadata?.edenTopUpCredits;
  const parsedCredits = rawCredits ? Number.parseInt(rawCredits, 10) : NaN;

  if (Number.isFinite(parsedCredits) && parsedCredits > 0) {
    return parsedCredits;
  }

  return getCreditsTopUpOffer().creditsAmount;
}

function formatTopUpTimestamp(session: Stripe.Checkout.Session) {
  if (!session.created) {
    return "Just now";
  }

  return new Date(session.created * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildPaymentTransactionId(sessionId: string) {
  return `payment-topup-${sessionId}`;
}

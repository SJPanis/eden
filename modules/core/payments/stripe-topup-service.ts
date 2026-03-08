import "server-only";

import type Stripe from "stripe";
import {
  persistPendingCreditsTopUpPayment,
  settleCreditsTopUpPaymentFromCheckoutSession,
  markCreditsTopUpPaymentCanceled,
  markCreditsTopUpPaymentFailed,
} from "@/modules/core/payments/credits-topup-payment-service";
import {
  getCreditsTopUpOffer,
  isPaymentBackedCreditsTopUpEnabled,
  resolveCreditsTopUpMode,
} from "@/modules/core/payments/payment-runtime";
import { getStripeClient } from "@/modules/core/payments/stripe-client";

export type EdenCreditsCheckoutSession = {
  checkoutUrl: string;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
  sessionId: string;
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

  await persistPendingCreditsTopUpPayment({
    provider: "stripe",
    providerSessionId: session.id,
    providerPaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    userId: input.userId,
    creditsAmount: offer.creditsAmount,
    amountCents: offer.amountCents,
    currency: offer.currency,
  });

  return {
    checkoutUrl: session.url,
    creditsAmount: offer.creditsAmount,
    amountCents: offer.amountCents,
    currency: offer.currency,
    providerLabel: offer.providerLabel,
    sessionId: session.id,
  } satisfies EdenCreditsCheckoutSession;
}

export function constructStripeWebhookEvent(input: {
  payload: string;
  signature: string;
}) {
  const stripe = requireStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error(
      "Stripe webhook verification is not configured. Set STRIPE_WEBHOOK_SECRET to enable webhook settlement.",
    );
  }

  return stripe.webhooks.constructEvent(
    input.payload,
    input.signature,
    webhookSecret,
  );
}

export async function handleStripeTopUpWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    case "checkout.session.expired":
      return handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
    case "checkout.session.async_payment_failed":
      return handleCheckoutSessionAsyncFailed(event.data.object as Stripe.Checkout.Session);
    default:
      return {
        handled: false,
        status: "ignored" as const,
      };
  }
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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  validateCompletedCheckoutSession(session);
  const payment = await settleCreditsTopUpPaymentFromCheckoutSession(session);

  return {
    handled: true,
    status: "settled" as const,
    providerSessionId: payment.providerSessionId,
  };
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  await markCreditsTopUpPaymentCanceled({
    providerSessionId: session.id,
    failureReason: "Stripe Checkout session expired before payment completed.",
  });

  return {
    handled: true,
    status: "canceled" as const,
    providerSessionId: session.id,
  };
}

async function handleCheckoutSessionAsyncFailed(session: Stripe.Checkout.Session) {
  await markCreditsTopUpPaymentFailed({
    providerSessionId: session.id,
    failureReason: "Stripe reported an asynchronous payment failure for this checkout session.",
  });

  return {
    handled: true,
    status: "failed" as const,
    providerSessionId: session.id,
  };
}

function validateCompletedCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") {
    throw new Error("This checkout session is not a one-time payment.");
  }

  if (session.payment_status !== "paid") {
    throw new Error("The checkout session has not completed payment.");
  }
}

import "server-only";

import type Stripe from "stripe";
import {
  persistPendingCreditsTopUpPayment,
  settleCreditsTopUpPaymentFromCheckoutSession,
  markCreditsTopUpPaymentCanceled,
  markCreditsTopUpPaymentFailed,
} from "@/modules/core/payments/credits-topup-payment-service";
import { recordPaymentEventLog } from "@/modules/core/services/payment-event-log-service";
import {
  hasStripeTopUpRuntimeConfig,
  isPaymentBackedCreditsTopUpEnabled,
  resolveCreditsTopUpPackage,
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
  packageId?: string | null;
}) {
  ensurePaymentBackedTopUpEnabled();

  const stripe = requireStripeClient();
  const selectedPackage = resolveCreditsTopUpPackage(input.packageId);
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
    client_reference_id: input.userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: selectedPackage.currency,
          unit_amount: selectedPackage.amountCents,
          product_data: {
            name: `Eden Leaves Top-up (${selectedPackage.title})`,
            description: selectedPackage.detail,
          },
        },
      },
    ],
    metadata: {
      edenUserId: input.userId,
      edenUsername: input.username,
      edenDisplayName: input.displayName,
      edenTopUpPackageId: selectedPackage.id,
      edenTopUpCredits: String(selectedPackage.creditsAmount),
      edenTopUpMode: resolveCreditsTopUpMode(),
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session did not return a redirect URL.");
  }

  const payment = await persistPendingCreditsTopUpPayment({
    provider: "stripe",
    providerSessionId: session.id,
    providerPaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    userId: input.userId,
    creditsAmount: selectedPackage.creditsAmount,
    amountCents: selectedPackage.amountCents,
    currency: selectedPackage.currency,
  });
  await recordPaymentEventLog({
    provider: "stripe",
    eventType: "checkout_session_created",
    creditsTopUpPaymentId: payment.id,
    providerSessionId: session.id,
    status: "success",
    metadata: {
      packageId: selectedPackage.id,
      creditsAmount: selectedPackage.creditsAmount,
      amountCents: selectedPackage.amountCents,
      currency: selectedPackage.currency,
      username: input.username,
    },
  });

  return {
    checkoutUrl: session.url,
    creditsAmount: selectedPackage.creditsAmount,
    amountCents: selectedPackage.amountCents,
    currency: selectedPackage.currency,
    providerLabel: selectedPackage.providerLabel,
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
  const checkoutSession = getCheckoutSessionFromStripeEvent(event);
  await recordPaymentEventLog({
    provider: "stripe",
    eventType: "webhook_received",
    providerEventId: event.id,
    providerSessionId: checkoutSession?.id ?? null,
    status: "info",
    metadata: {
      eventType: event.type,
      livemode: event.livemode,
      checkoutStatus:
        typeof checkoutSession?.status === "string" ? checkoutSession.status : null,
      paymentStatus:
        typeof checkoutSession?.payment_status === "string"
          ? checkoutSession.payment_status
          : null,
    },
  });

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        event.id,
      );
    case "checkout.session.expired":
      return handleCheckoutSessionExpired(
        event.data.object as Stripe.Checkout.Session,
        event.id,
      );
    case "checkout.session.async_payment_failed":
      return handleCheckoutSessionAsyncFailed(
        event.data.object as Stripe.Checkout.Session,
        event.id,
      );
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
    throw new Error("Stripe Checkout is not configured. Set STRIPE_SECRET_KEY to enable real Leaves top-ups.");
  }

  return stripe;
}

function ensurePaymentBackedTopUpEnabled() {
  if (!isPaymentBackedCreditsTopUpEnabled()) {
    throw new Error("Payment-backed top-ups are disabled. Use mock top-ups or enable hybrid/payment mode.");
  }

  if (!hasStripeTopUpRuntimeConfig()) {
    throw new Error(
      "Stripe Checkout is not fully configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable real Leaves top-ups.",
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  providerEventId?: string,
) {
  try {
    validateCompletedCheckoutSession(session);
    const settlement = await settleCreditsTopUpPaymentFromCheckoutSession(session);
    const settledEventType =
      settlement.settlementResult === "already_settled"
        ? "settlement_skipped_already_settled"
        : "checkout_session_settled";

    await recordPaymentEventLog({
      provider: "stripe",
      eventType: settledEventType,
      providerEventId: providerEventId ?? null,
      creditsTopUpPaymentId: settlement.payment.id,
      providerSessionId: settlement.payment.providerSessionId,
      status:
        settlement.settlementResult === "already_settled" ? "skipped" : "success",
      metadata: {
        settlementResult: settlement.settlementResult,
        checkoutStatus:
          typeof session.status === "string" ? session.status : null,
        paymentStatus:
          typeof session.payment_status === "string" ? session.payment_status : null,
        creditsAmount: settlement.payment.creditsAmount,
        amountCents: settlement.payment.amountCents,
        currency: settlement.payment.currency,
      },
    });

    return {
      handled: true,
      status:
        settlement.settlementResult === "already_settled"
          ? ("already_settled" as const)
          : ("settled" as const),
      providerSessionId: settlement.payment.providerSessionId,
    };
  } catch (error) {
    await recordPaymentEventLog({
      provider: "stripe",
      eventType: "checkout_session_settlement_failed",
      providerEventId: providerEventId ?? null,
      providerSessionId: session.id,
      status: "failed",
      metadata: {
        checkoutStatus:
          typeof session.status === "string" ? session.status : null,
        paymentStatus:
          typeof session.payment_status === "string" ? session.payment_status : null,
        reason: error instanceof Error ? error.message : "Unknown settlement error",
      },
    });
    throw error;
  }
}

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  providerEventId?: string,
) {
  await markCreditsTopUpPaymentCanceled({
    providerSessionId: session.id,
    failureReason: "Stripe Checkout session expired before payment completed.",
  });
  await recordPaymentEventLog({
    provider: "stripe",
    eventType: "checkout_session_expired",
    providerEventId: providerEventId ?? null,
    providerSessionId: session.id,
    status: "skipped",
    metadata: {
      checkoutStatus:
        typeof session.status === "string" ? session.status : null,
      paymentStatus:
        typeof session.payment_status === "string" ? session.payment_status : null,
      reason: "Stripe Checkout session expired before payment completed.",
    },
  });

  return {
    handled: true,
    status: "canceled" as const,
    providerSessionId: session.id,
  };
}

async function handleCheckoutSessionAsyncFailed(
  session: Stripe.Checkout.Session,
  providerEventId?: string,
) {
  await markCreditsTopUpPaymentFailed({
    providerSessionId: session.id,
    failureReason: "Stripe reported an asynchronous payment failure for this checkout session.",
  });
  await recordPaymentEventLog({
    provider: "stripe",
    eventType: "checkout_session_async_payment_failed",
    providerEventId: providerEventId ?? null,
    providerSessionId: session.id,
    status: "failed",
    metadata: {
      checkoutStatus:
        typeof session.status === "string" ? session.status : null,
      paymentStatus:
        typeof session.payment_status === "string" ? session.payment_status : null,
      reason: "Stripe reported an asynchronous payment failure for this checkout session.",
    },
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

  if (
    typeof session.metadata?.edenUserId !== "string" ||
    session.metadata.edenUserId.trim().length === 0
  ) {
    throw new Error("The checkout session is missing the required Eden user reference.");
  }

  if (
    typeof session.client_reference_id === "string" &&
    session.client_reference_id.trim().length > 0 &&
    session.client_reference_id !== session.metadata.edenUserId
  ) {
    throw new Error("The checkout session user reference does not match the Eden metadata.");
  }
}

function getCheckoutSessionFromStripeEvent(event: Stripe.Event) {
  if (!event.type.startsWith("checkout.session.")) {
    return null;
  }

  return event.data.object as Stripe.Checkout.Session;
}

import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

export function getStripeClient() {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    stripeClient = null;
    return stripeClient;
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

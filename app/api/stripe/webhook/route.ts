import { NextResponse } from "next/server";
import {
  constructStripeWebhookEvent,
  handleStripeTopUpWebhookEvent,
} from "@/modules/core/payments/stripe-topup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        ok: false,
        error: "Stripe signature header is required.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await request.text();
    const event = constructStripeWebhookEvent({
      payload,
      signature,
    });
    const result = await handleStripeTopUpWebhookEvent(event);

    return NextResponse.json({
      ok: true,
      received: true,
      handled: result.handled,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process the Stripe webhook event.",
      },
      { status: 400 },
    );
  }
}

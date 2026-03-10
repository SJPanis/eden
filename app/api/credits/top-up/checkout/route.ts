import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createCreditsTopUpCheckoutSession,
} from "@/modules/core/payments/stripe-topup-service";
import { getServerSession } from "@/modules/core/session/server";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    returnPath?: string;
    packageId?: string;
  };
  const headerStore = await headers();
  const session = await getServerSession();

  try {
    const checkoutSession = await createCreditsTopUpCheckoutSession({
      userId: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      origin: resolveOrigin(headerStore),
      returnPath: requestBody.returnPath ?? "/consumer",
      packageId: requestBody.packageId,
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: checkoutSession.checkoutUrl,
      creditsAmount: checkoutSession.creditsAmount,
      amountCents: checkoutSession.amountCents,
      currency: checkoutSession.currency,
      providerLabel: checkoutSession.providerLabel,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create a payment-backed Leaves checkout session.",
      },
      { status: 400 },
    );
  }
}

function resolveOrigin(headerStore: Headers) {
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = headerStore.get("host");

  if (host) {
    return `http://${host}`;
  }

  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

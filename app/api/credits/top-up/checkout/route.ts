import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession as getNextAuthServerSession } from "next-auth";
import {
  createCreditsTopUpCheckoutSession,
} from "@/modules/core/payments/stripe-topup-service";
import { buildEdenAuthJsOptions } from "@/modules/core/session/authjs-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    returnPath?: string;
    packageId?: string;
  };
  const headerStore = await headers();
  const authSession = (await getNextAuthServerSession(
    buildEdenAuthJsOptions(),
  )) as
    | {
        user?: {
          id?: string;
          username?: string;
          name?: string | null;
        };
      }
    | null;

  if (!authSession?.user?.id || !authSession.user.username) {
    console.error("[eden][payments][checkout_create] missing_authenticated_session");
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication is required before Eden can create a Leaves checkout session.",
      },
      { status: 401 },
    );
  }

  try {
    const checkoutSession = await createCreditsTopUpCheckoutSession({
      userId: authSession.user.id,
      username: authSession.user.username,
      displayName: authSession.user.name ?? authSession.user.username,
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
    const detail =
      error instanceof Error
        ? error.message
        : "Unknown checkout session creation error";
    console.error(`[eden][payments][checkout_create] ${detail}`);

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

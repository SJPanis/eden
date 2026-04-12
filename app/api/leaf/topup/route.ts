import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { createCreditsTopUpCheckoutSession } from "@/modules/core/payments/stripe-topup-service";
import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

// POST /api/leaf/topup
// Contract: docs/PHASE_01_API_CONTRACT.md §5.2
//
// Unity-facing Stripe Checkout initiation. Thin wrapper around
// stripe-topup-service.createCreditsTopUpCheckoutSession — the heavy lifting
// (package resolution, session creation, persistence, event log) lives in
// that service and is already exercised by the web app's /api/credits/top-up
// /checkout route.

export const runtime = "nodejs";

type TopupBody = {
  packageId?: unknown;
  returnPath?: unknown;
};

export async function POST(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  let body: TopupBody = {};
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as TopupBody) : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const packageId = typeof body.packageId === "string" ? body.packageId : undefined;
  const returnPath = typeof body.returnPath === "string" ? body.returnPath : "/consumer";

  // stripe-topup-service.createCreditsTopUpCheckoutSession needs displayName
  // for the Stripe metadata. Pull it via Prisma since the JWT doesn't carry it.
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { username: true, displayName: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "USER_NOT_FOUND", message: "User no longer exists." } },
      { status: 404 },
    );
  }

  const headerStore = await headers();
  const origin = resolveOrigin(headerStore);

  try {
    const checkoutSession = await createCreditsTopUpCheckoutSession({
      userId: identity.userId,
      username: user.username,
      displayName: user.displayName,
      origin,
      returnPath,
      packageId,
    });

    return NextResponse.json({
      ok: true,
      data: {
        checkoutUrl: checkoutSession.checkoutUrl,
        sessionId: checkoutSession.sessionId,
        expectedLeafs: checkoutSession.creditsAmount,
        amountCents: checkoutSession.amountCents,
        currency: checkoutSession.currency,
        providerLabel: checkoutSession.providerLabel,
        // expiresAt is not returned by the Stripe SDK wrapper today. Clients
        // should treat the checkout as ephemeral and not hang on the value.
        expiresAt: null,
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown checkout session creation error";
    console.error(`[api/leaf/topup] ${detail}`);
    const message = error instanceof Error ? error.message : "Failed to create checkout session.";
    const code = /not configured|disabled/i.test(message)
      ? "STRIPE_NOT_CONFIGURED"
      : /package/i.test(message)
        ? "UNKNOWN_PACKAGE"
        : "STRIPE_ERROR";
    const status = code === "UNKNOWN_PACKAGE" ? 400 : 502;
    return NextResponse.json(
      { ok: false, error: { code, message } },
      { status },
    );
  }
}

function resolveOrigin(headerStore: Headers) {
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  const host = headerStore.get("host");
  if (host) return `https://${host}`;
  return process.env.NEXTAUTH_URL ?? "https://edencloud.app";
}

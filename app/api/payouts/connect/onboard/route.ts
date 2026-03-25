import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getStripeClient } from "@/modules/core/payments/stripe-client";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Payment provider is not configured." },
      { status: 503 },
    );
  }

  const prisma = getPrismaClient();
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }

    let accountId = user.stripeConnectAccountId;

    // Create a new Connect Express account if the user doesn't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { edenUserId: userId, edenUsername: session.user.username },
      });
      accountId = account.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Build the onboarding link
    const headerStore = await headers();
    const origin = resolveOrigin(headerStore);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/payouts/connect/onboard?refresh=1`,
      return_url: `${origin}/api/payouts/connect/return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ ok: true, onboardingUrl: accountLink.url });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown onboarding error";
    console.error(`[eden][payouts][connect_onboard] ${detail}`);

    return NextResponse.json(
      { ok: false, error: "Unable to start payout onboarding." },
      { status: 500 },
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

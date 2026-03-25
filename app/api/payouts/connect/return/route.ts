import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getStripeClient } from "@/modules/core/payments/stripe-client";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.redirect(new URL("/auth", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.redirect(
      new URL("/consumer?payout_error=provider_unavailable", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }

  const prisma = getPrismaClient();
  const userId = session.user.id;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeConnectAccountId) {
      return NextResponse.redirect(new URL("/consumer?payout_error=no_account", baseUrl));
    }

    // Check if onboarding is complete
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const isReady = account.charges_enabled && account.details_submitted;

    if (isReady && !user.payoutEnabled) {
      await prisma.user.update({
        where: { id: userId },
        data: { payoutEnabled: true },
      });
    }

    const redirectPath = isReady
      ? "/consumer?payout_connected=true"
      : "/consumer?payout_error=onboarding_incomplete";

    return NextResponse.redirect(new URL(redirectPath, baseUrl));
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown return handler error";
    console.error(`[eden][payouts][connect_return] ${detail}`);

    return NextResponse.redirect(new URL("/consumer?payout_error=unknown", baseUrl));
  }
}

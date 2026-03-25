import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getStripeClient } from "@/modules/core/payments/stripe-client";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

const MIN_PAYOUT_LEAFS = 1000; // 1000 Leafs = $10 USD
const LEAFS_TO_CENTS = 1; // 1 Leaf = 1 cent

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as {
    leafsAmount?: number;
  };

  const leafsAmount = body.leafsAmount;
  if (!leafsAmount || !Number.isInteger(leafsAmount) || leafsAmount < MIN_PAYOUT_LEAFS) {
    return NextResponse.json(
      { ok: false, error: `Minimum payout is ${MIN_PAYOUT_LEAFS} Leafs ($${MIN_PAYOUT_LEAFS / 100} USD).` },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const userId = session.user.id;

  try {
    // Validate user is connected and enabled
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }
    if (!user.stripeConnectAccountId) {
      return NextResponse.json(
        { ok: false, error: "No payout account connected. Complete Stripe onboarding first." },
        { status: 400 },
      );
    }
    if (!user.payoutEnabled) {
      return NextResponse.json(
        { ok: false, error: "Payout account onboarding is incomplete." },
        { status: 400 },
      );
    }

    // Validate wallet balance
    const wallet = await prisma.edenWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.leafsBalance < leafsAmount) {
      return NextResponse.json(
        { ok: false, error: "Insufficient Leaf balance.", available: wallet?.leafsBalance ?? 0 },
        { status: 400 },
      );
    }

    const cashAmountCents = leafsAmount * LEAFS_TO_CENTS;

    // Create PayoutRecord as PENDING
    const payoutRecord = await prisma.payoutRecord.create({
      data: {
        userId,
        leafsAmount,
        cashAmountCents,
        currency: "usd",
        status: "PENDING",
      },
    });

    try {
      // Create Stripe transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: cashAmountCents,
        currency: "usd",
        destination: user.stripeConnectAccountId,
        metadata: {
          edenPayoutId: payoutRecord.id,
          edenUserId: userId,
          leafsAmount: String(leafsAmount),
        },
      });

      // Deduct Leafs and mark payout completed — atomic update
      await prisma.$transaction([
        prisma.edenWallet.update({
          where: { userId },
          data: {
            leafsBalance: { decrement: leafsAmount },
            totalSpentLeafs: { increment: leafsAmount },
          },
        }),
        prisma.payoutRecord.update({
          where: { id: payoutRecord.id },
          data: {
            status: "COMPLETED",
            stripeTransferId: transfer.id,
            completedAt: new Date(),
          },
        }),
      ]);

      const completed = await prisma.payoutRecord.findUnique({
        where: { id: payoutRecord.id },
      });

      return NextResponse.json({ ok: true, payoutRecord: completed });
    } catch (stripeError) {
      // Stripe transfer failed — mark payout as FAILED but don't deduct Leafs
      const detail =
        stripeError instanceof Error ? stripeError.message : "Stripe transfer failed";

      await prisma.payoutRecord.update({
        where: { id: payoutRecord.id },
        data: { status: "FAILED", failureReason: detail },
      });

      console.error(`[eden][payouts][request] stripe_transfer_failed: ${detail}`);
      return NextResponse.json(
        { ok: false, error: "Payout transfer failed. Your balance has not been deducted." },
        { status: 502 },
      );
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown payout error";
    console.error(`[eden][payouts][request] ${detail}`);

    return NextResponse.json(
      { ok: false, error: "Unable to process payout request." },
      { status: 500 },
    );
  }
}

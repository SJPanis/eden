import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  const unswept = await prisma.platformRevenue.findMany({
    where: { swept: false },
  });

  const totalLeafs = unswept.reduce((sum: number, r: { amountLeafs: number }) => sum + r.amountLeafs, 0);
  const totalUSD = totalLeafs / 25;

  return NextResponse.json({
    ok: true,
    totalLeafs,
    totalUSD: Math.round(totalUSD * 100) / 100,
    recordsCount: unswept.length,
  });
}

export async function POST() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const prisma = getPrismaClient();

  const unswept = await prisma.platformRevenue.findMany({
    where: { swept: false },
  });

  if (unswept.length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to sweep", totalLeafs: 0, totalUSD: 0 });
  }

  const totalLeafs = unswept.reduce((sum: number, r: { amountLeafs: number }) => sum + r.amountLeafs, 0);
  const totalUSD = totalLeafs / 25;

  // Only transfer if we have a platform Stripe account configured
  let stripeTransferId: string | null = null;
  const platformAccountId = process.env.EDEN_PLATFORM_STRIPE_ACCOUNT_ID;
  const platformSecretKey = process.env.STRIPE_SECRET_KEY;

  if (platformAccountId && platformSecretKey && totalUSD >= 1) {
    const stripe = new Stripe(platformSecretKey);
    const transfer = await stripe.transfers.create({
      amount: Math.floor(totalUSD * 100), // cents
      currency: "usd",
      destination: platformAccountId,
      description: `EdenOS LLC platform revenue sweep — ${totalLeafs} Leafs`,
    });
    stripeTransferId = transfer.id;
  }

  await prisma.platformRevenue.updateMany({
    where: { swept: false },
    data: { swept: true, stripeTransferId },
  });

  return NextResponse.json({
    ok: true,
    totalLeafs,
    totalUSD: Math.round(totalUSD * 100) / 100,
    stripeTransferId,
    recordsSwept: unswept.length,
  });
}

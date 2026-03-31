import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : null;
  const description =
    typeof body?.description === "string" ? body.description : "Service run";

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, edenBalanceCredits: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 },
    );
  }

  if (user.edenBalanceCredits < amount) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Leaf balance",
        balance: user.edenBalanceCredits,
        required: amount,
      },
      { status: 402 },
    );
  }

  const serviceId =
    typeof body?.serviceId === "string" ? body.serviceId : "unknown";

  // Revenue split: 70% creator, 15% platform, 15% contribution pool
  const creatorCut = Math.floor(amount * 0.70);
  const platformCut = Math.floor(amount * 0.15);
  const contributionCut = Math.floor(amount * 0.15);

  try {
    // Atomic transaction — all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct from spender
      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: { edenBalanceCredits: { decrement: amount } },
        select: { edenBalanceCredits: true },
      });

      // 2. Credit 70% to service creator
      const service = await tx.edenService.findUnique({
        where: { slug: serviceId },
        select: { creatorId: true, id: true },
      });

      if (service && service.creatorId !== session.user.id) {
        await tx.user.update({
          where: { id: service.creatorId },
          data: { edenBalanceCredits: { increment: creatorCut } },
        });
        await tx.edenService.update({
          where: { id: service.id },
          data: { totalEarned: { increment: creatorCut } },
        });
      } else if (!service) {
        // Unknown service — creator cut goes to platform pool
        await tx.platformRevenue.create({
          data: {
            amountLeafs: creatorCut,
            usdValue: creatorCut / 25,
            sourceService: serviceId,
            userId: session.user.id,
          },
        });
      }

      // 3. Platform revenue record (15%)
      await tx.platformRevenue.create({
        data: {
          amountLeafs: platformCut,
          usdValue: platformCut / 25,
          sourceService: serviceId,
          userId: session.user.id,
        },
      });

      // 4. Contribution pool record (15%)
      await tx.contributionPool.create({
        data: {
          amountLeafs: contributionCut,
          sourceService: serviceId,
          userId: session.user.id,
        },
      });

      // 5. Referral commission — 1% of spend to referrer
      const referral = await tx.referral.findUnique({
        where: { referredId: session.user.id },
        select: { referrerId: true, commissionRate: true, id: true },
      });

      if (referral) {
        const commission = Math.floor(amount * referral.commissionRate);
        if (commission > 0) {
          await tx.user.update({
            where: { id: referral.referrerId },
            data: { edenBalanceCredits: { increment: commission } },
          });
          await tx.referral.update({
            where: { id: referral.id },
            data: { totalEarned: { increment: commission } },
          });
        }
      }

      return { newBalance: updated.edenBalanceCredits };
    });

    return NextResponse.json({
      ok: true,
      spent: amount,
      description,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("[spend] Transaction failed:", error);
    return NextResponse.json(
      { ok: false, error: "Transaction failed. No Leafs were charged." },
      { status: 500 },
    );
  }
}

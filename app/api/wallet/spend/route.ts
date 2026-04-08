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
    select: {
      id: true,
      edenBalanceCredits: true,
      promoBalance: true,
      realBalance: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 },
    );
  }

  // Anti-bot rate limit: new accounts (under 7 days old) capped at 20 runs/hour
  const accountAgeDays =
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 7) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRuns = await prisma.serviceUsage.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentRuns >= 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded for new accounts. Try again in an hour.",
        },
        { status: 429 },
      );
    }
  }

  const totalSpendable = user.promoBalance + user.realBalance;
  if (totalSpendable < amount) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Leaf balance",
        balance: totalSpendable,
        required: amount,
      },
      { status: 402 },
    );
  }

  // Deduct promo first, then real
  const promoSpent = Math.min(amount, user.promoBalance);
  const realSpent = amount - promoSpent;

  const serviceId =
    typeof body?.serviceId === "string" ? body.serviceId : "unknown";

  // Revenue split: 70% creator, 15% platform, 15% contribution pool
  const creatorCutPromo = Math.floor(promoSpent * 0.7);
  const creatorCutReal = Math.floor(realSpent * 0.7);
  const platformCut = Math.floor(amount * 0.15);
  const contributionCut = Math.floor(amount * 0.15);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct from spender — promo first, then real
      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: {
          promoBalance: { decrement: promoSpent },
          realBalance: { decrement: realSpent },
          edenBalanceCredits: { decrement: amount },
          lifetimePromoSpent: { increment: promoSpent },
          lifetimeRealSpent: { increment: realSpent },
        },
        select: { edenBalanceCredits: true, promoBalance: true, realBalance: true },
      });

      // 2. Credit creator — promo earnings stay as promo (not withdrawable),
      //    real earnings become withdrawable
      const service = await tx.edenService.findUnique({
        where: { slug: serviceId },
        select: { creatorId: true, id: true },
      });

      if (service && service.creatorId !== session.user.id) {
        await tx.user.update({
          where: { id: service.creatorId },
          data: {
            promoBalance: { increment: creatorCutPromo },
            withdrawableBalance: { increment: creatorCutReal },
            edenBalanceCredits: { increment: creatorCutPromo + creatorCutReal },
          },
        });
        await tx.edenService.update({
          where: { id: service.id },
          data: { totalEarned: { increment: creatorCutPromo + creatorCutReal } },
        });
      } else if (!service) {
        await tx.platformRevenue.create({
          data: {
            amountLeafs: creatorCutPromo + creatorCutReal,
            usdValue: (creatorCutPromo + creatorCutReal) / 25,
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

      // 5. Referral commission — bucket-aware
      const referral = await tx.referral.findUnique({
        where: { referredId: session.user.id },
        select: { referrerId: true, commissionRate: true, id: true },
      });

      if (referral) {
        const commissionPromo = Math.floor(promoSpent * referral.commissionRate);
        const commissionReal = Math.floor(realSpent * referral.commissionRate);
        const totalCommission = commissionPromo + commissionReal;
        if (totalCommission > 0) {
          await tx.user.update({
            where: { id: referral.referrerId },
            data: {
              promoBalance: { increment: commissionPromo },
              withdrawableBalance: { increment: commissionReal },
              edenBalanceCredits: { increment: totalCommission },
            },
          });
          await tx.referral.update({
            where: { id: referral.id },
            data: { totalEarned: { increment: totalCommission } },
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

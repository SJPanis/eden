import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const userInput = typeof body?.input === "string" ? body.input.trim() : "";

  if (!userInput) {
    return NextResponse.json({ ok: false, error: "Input required" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  try {
    const service = await prisma.edenService.findUnique({ where: { slug } });
    if (!service || !service.isActive) {
      return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    }

    // Check balance + bucket split
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        edenBalanceCredits: true,
        promoBalance: true,
        realBalance: true,
        createdAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Anti-bot rate limit: new accounts (under 7 days) capped at 20 runs/hour
    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentRuns = await prisma.serviceUsage.count({
        where: { userId: session.user.id, createdAt: { gte: oneHourAgo } },
      });
      if (recentRuns >= 20) {
        return NextResponse.json({
          ok: false,
          error: "Rate limit exceeded for new accounts. Try again in an hour.",
        }, { status: 429 });
      }
    }

    const totalSpendable = user.promoBalance + user.realBalance;
    if (totalSpendable < service.leafCost) {
      return NextResponse.json({
        ok: false,
        error: "Insufficient Leafs",
        balance: totalSpendable,
        required: service.leafCost,
      }, { status: 402 });
    }

    const promoSpent = Math.min(service.leafCost, user.promoBalance);
    const realSpent = service.leafCost - promoSpent;

    // Call Claude with the service's system prompt
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      ...(service.systemPrompt ? { system: service.systemPrompt } : {}),
      messages: [{ role: "user", content: userInput }],
    });

    const result = message.content[0]?.type === "text" ? message.content[0].text : "";

    // Promo/real proportion — used to route earnings to correct buckets
    const promoRatio = service.leafCost > 0 ? promoSpent / service.leafCost : 0;
    const realRatio = service.leafCost > 0 ? realSpent / service.leafCost : 0;

    // Deduct Leafs atomically
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          promoBalance: { decrement: promoSpent },
          realBalance: { decrement: realSpent },
          edenBalanceCredits: { decrement: service.leafCost },
          lifetimePromoSpent: { increment: promoSpent },
          lifetimeRealSpent: { increment: realSpent },
        },
      });

      // Contributor share (accepted contributions, capped at 30%)
      let contributorShare = 0;
      try {
        const acceptedContribs = await tx.contribution.findMany({
          where: { serviceId: service.id, status: "accepted" },
          select: { id: true, contributorId: true, rewardPercent: true },
        });
        const totalContribPct = Math.min(30, acceptedContribs.reduce((s, c) => s + c.rewardPercent, 0));
        if (totalContribPct > 0 && acceptedContribs.length > 0) {
          for (const contrib of acceptedContribs) {
            const share = Math.floor(service.leafCost * 0.70 * (contrib.rewardPercent / totalContribPct) * (totalContribPct / 100));
            if (share > 0) {
              contributorShare += share;
              const sharePromo = Math.floor(share * promoRatio);
              const shareReal = share - sharePromo;
              await tx.user.update({
                where: { id: contrib.contributorId },
                data: {
                  promoBalance: { increment: sharePromo },
                  withdrawableBalance: { increment: shareReal },
                  edenBalanceCredits: { increment: share },
                },
              });
              await tx.contribution.update({ where: { id: contrib.id }, data: { totalEarned: { increment: share } } });
            }
          }
        }
      } catch { /* contributions table may not exist yet */ }

      // Creator cut (70% minus contributor share)
      if (service.creatorId !== session.user.id) {
        const creatorCut = Math.floor(service.leafCost * 0.70) - contributorShare;
        if (creatorCut > 0) {
          const creatorCutPromo = Math.floor(creatorCut * promoRatio);
          const creatorCutReal = creatorCut - creatorCutPromo;
          await tx.user.update({
            where: { id: service.creatorId },
            data: {
              promoBalance: { increment: creatorCutPromo },
              withdrawableBalance: { increment: creatorCutReal },
              edenBalanceCredits: { increment: creatorCut },
            },
          });
        }
        await tx.edenService.update({
          where: { id: service.id },
          data: { totalEarned: { increment: Math.floor(service.leafCost * 0.70) } },
        });
      }

      // Platform + pool
      const platformCut = Math.floor(service.leafCost * 0.15);
      const poolCut = Math.floor(service.leafCost * 0.15);
      await tx.platformRevenue.create({
        data: { amountLeafs: platformCut, usdValue: platformCut / 25, sourceService: slug, userId: session.user.id },
      });
      await tx.contributionPool.create({
        data: { amountLeafs: poolCut, sourceService: slug, userId: session.user.id },
      });
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { edenBalanceCredits: true },
    });

    return NextResponse.json({
      ok: true,
      result,
      newBalance: updatedUser?.edenBalanceCredits ?? 0,
      leafCost: service.leafCost,
    });
  } catch (error) {
    console.error("[service/run] Error:", error);
    return NextResponse.json({ ok: false, error: "Service run failed" }, { status: 500 });
  }
}

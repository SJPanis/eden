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

    // Check balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { edenBalanceCredits: true },
    });
    if (!user || user.edenBalanceCredits < service.leafCost) {
      return NextResponse.json({
        ok: false,
        error: "Insufficient Leafs",
        balance: user?.edenBalanceCredits ?? 0,
        required: service.leafCost,
      }, { status: 402 });
    }

    // Call Claude with the service's system prompt
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      ...(service.systemPrompt ? { system: service.systemPrompt } : {}),
      messages: [{ role: "user", content: userInput }],
    });

    const result = message.content[0]?.type === "text" ? message.content[0].text : "";

    // Deduct Leafs atomically
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { edenBalanceCredits: { decrement: service.leafCost } },
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
              await tx.user.update({ where: { id: contrib.contributorId }, data: { edenBalanceCredits: { increment: share } } });
              await tx.contribution.update({ where: { id: contrib.id }, data: { totalEarned: { increment: share } } });
            }
          }
        }
      } catch { /* contributions table may not exist yet */ }

      // Creator cut (70% minus contributor share)
      if (service.creatorId !== session.user.id) {
        const creatorCut = Math.floor(service.leafCost * 0.70) - contributorShare;
        if (creatorCut > 0) {
          await tx.user.update({
            where: { id: service.creatorId },
            data: { edenBalanceCredits: { increment: creatorCut } },
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

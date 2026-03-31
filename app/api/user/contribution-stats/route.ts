import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const userId = session.user.id;

  // Adam pool — revenue-based
  const [userRevenue, totalRevenue] = await Promise.all([
    prisma.platformRevenue.aggregate({
      where: { userId },
      _sum: { amountLeafs: true },
    }),
    prisma.platformRevenue.aggregate({
      _sum: { amountLeafs: true },
    }),
  ]);

  const userLeafs = userRevenue._sum.amountLeafs ?? 0;
  const totalLeafs = totalRevenue._sum.amountLeafs ?? 0;

  // Eve pool — usage-based (actions count)
  const [userActions, totalActions] = await Promise.all([
    prisma.contributionPool.count({ where: { userId } }),
    prisma.contributionPool.count(),
  ]);

  // Leaf flow — earned = current balance + total spent, spent = sum from PlatformRevenue for this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { edenBalanceCredits: true },
  });

  // Spent = sum of PlatformRevenue sourced from this user's service usage
  const userSpentAgg = await prisma.platformRevenue.aggregate({
    where: { userId },
    _sum: { amountLeafs: true },
  });
  const spent = userSpentAgg._sum.amountLeafs ?? 0;

  // Earned = total earnings from services this user created
  let earned = 0;
  try {
    const serviceEarnings = await prisma.edenService.aggregate({
      where: { creatorId: userId },
      _sum: { totalEarned: true },
    });
    earned = serviceEarnings._sum.totalEarned ?? 0;
  } catch {
    // EdenService table may not exist yet
    earned = 0;
  }

  return NextResponse.json({
    ok: true,
    adam: {
      userLeafs,
      totalLeafs,
      percentage: totalLeafs > 0 ? Math.round((userLeafs / totalLeafs) * 10000) / 100 : 0,
    },
    eve: {
      userActions,
      totalActions,
      percentage: totalActions > 0 ? Math.round((userActions / totalActions) * 10000) / 100 : 0,
    },
    leafFlow: {
      earned,
      spent,
      net: earned - spent,
    },
  });
}

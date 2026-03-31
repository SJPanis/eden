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
  const services = await prisma.edenService.findMany({
    where: { creatorId: session.user.id },
    orderBy: { totalEarned: "desc" },
    select: {
      slug: true,
      name: true,
      totalEarned: true,
      leafCost: true,
      isActive: true,
    },
  });

  const totalEarnedAllTime = services.reduce((sum, s) => sum + s.totalEarned, 0);

  return NextResponse.json({
    ok: true,
    services: services.map((s) => ({
      ...s,
      earningsUSD: Math.round((s.totalEarned / 25) * 100) / 100,
    })),
    totalEarnedAllTime,
    totalEarnedUSD: Math.round((totalEarnedAllTime / 25) * 100) / 100,
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") return NextResponse.json({ ok: false }, { status: 401 });

  const prisma = getPrismaClient();
  const contributions = await prisma.contribution.findMany({
    where: { contributorId: session.user.id, status: "accepted" },
    include: { service: { select: { slug: true, name: true } } },
  });

  const totalEarned = contributions.reduce((sum, c) => sum + c.totalEarned, 0);
  return NextResponse.json({
    ok: true,
    contributions: contributions.map((c) => ({
      serviceSlug: c.service.slug,
      serviceName: c.service.name,
      rewardPercent: c.rewardPercent,
      totalEarned: c.totalEarned,
      title: c.title,
    })),
    totalEarned,
    totalEarnedUSD: Math.round((totalEarned / 25) * 100) / 100,
  });
}

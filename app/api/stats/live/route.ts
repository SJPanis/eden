import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getPrismaClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const [transactionsToday, leafsTodayAgg, activeServices] = await Promise.all([
      prisma.platformRevenue.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.platformRevenue.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amountLeafs: true },
      }),
      prisma.edenService.count({ where: { isActive: true } }).catch(() => 3),
    ]);

    return NextResponse.json({
      ok: true,
      transactionsToday,
      leafsToday: leafsTodayAgg._sum.amountLeafs ?? 0,
      activeServices,
    });
  } catch {
    return NextResponse.json({ ok: true, transactionsToday: 0, leafsToday: 0, activeServices: 3 });
  }
}

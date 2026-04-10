import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [recentServices, recentRuns] = await Promise.all([
      prisma.edenService.findMany({
        where: { createdAt: { gte: since }, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          thumbnailColor: true,
          createdAt: true,
          creator: { select: { displayName: true, username: true } },
        },
      }),
      prisma.serviceUsage.findMany({
        where: { createdAt: { gte: since }, usageType: "service_run" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          creditsUsed: true,
          createdAt: true,
          service: { select: { title: true } },
        },
      }),
    ]);

    type Event = {
      id: string;
      type: "publish" | "run";
      createdAt: Date;
      title: string;
      subtitle: string;
      color: string;
    };

    const events: Event[] = [
      ...recentServices.map((s): Event => ({
        id: `pub-${s.id}`,
        type: "publish",
        createdAt: s.createdAt,
        title: `${s.creator.displayName || s.creator.username} published`,
        subtitle: s.name,
        color: s.thumbnailColor || "#2dd4bf",
      })),
      ...recentRuns.map((r): Event => ({
        id: `run-${r.id}`,
        type: "run",
        createdAt: r.createdAt,
        title: r.service?.title ? `${r.service.title} was run` : "A service was run",
        subtitle: `${r.creditsUsed} Leafs spent`,
        color: "#2dd4bf",
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return NextResponse.json({ ok: true, events });
  } catch (error) {
    console.error("[activity/feed] failed:", error);
    return NextResponse.json({ ok: true, events: [] });
  }
}

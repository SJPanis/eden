import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Slug required" }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const service = await prisma.edenService.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        description: true,
        leafCost: true,
        totalEarned: true,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...service });
  } catch {
    // EdenService table may not exist yet — return fallback
    return NextResponse.json({ ok: false, error: "Service registry unavailable" }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    const services = await prisma.edenService.findMany({
      where: { OR: [{ status: "published" }, { isActive: true }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        leafCost: true,
        thumbnailColor: true,
        serviceType: true,
        totalEarned: true,
      },
    });
    return NextResponse.json({ ok: true, services });
  } catch {
    return NextResponse.json({ ok: true, services: [] });
  }
}

import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    const count = await prisma.edenService.count();
    console.log("[services/list] total services in DB:", count);

    const services = await prisma.edenService.findMany({
      where: {
        OR: [
          { status: "published" },
          { isActive: true },
        ],
      },
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
    console.log("[services/list] returned:", services.length, "services");
    return NextResponse.json({ ok: true, services, total: count });
  } catch (err) {
    console.error("[services/list] Error:", err);
    return NextResponse.json({ ok: true, services: [], error: String(err) });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true, totpVerifiedAt: true },
  });

  return NextResponse.json({
    ok: true,
    totpEnabled: user?.totpEnabled ?? false,
    lastVerifiedAt: user?.totpVerifiedAt?.toISOString() ?? null,
  });
}

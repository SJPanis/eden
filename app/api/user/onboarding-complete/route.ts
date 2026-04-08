import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  await getPrismaClient().user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

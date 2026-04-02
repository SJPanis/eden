import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") return NextResponse.json({ ok: false }, { status: 401 });
  const { id: contributionId } = await params;
  const body = await req.json().catch(() => null);
  const decision = body?.decision as "accept" | "reject" | undefined;
  const rewardPercent = typeof body?.rewardPercent === "number" ? Math.max(0, Math.min(20, body.rewardPercent)) : 0;

  if (!decision || !["accept", "reject"].includes(decision)) {
    return NextResponse.json({ ok: false, error: "decision required" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { request: true },
  });
  if (!contribution || contribution.request.creatorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Not found or not your service" }, { status: 403 });
  }

  if (decision === "accept") {
    await prisma.contribution.update({
      where: { id: contributionId },
      data: { status: "accepted", rewardPercent: rewardPercent || contribution.request.rewardPercent },
    });
    if (contribution.proposedSystemPrompt) {
      await prisma.edenService.update({
        where: { id: contribution.serviceId },
        data: { systemPrompt: contribution.proposedSystemPrompt },
      });
    }
    return NextResponse.json({ ok: true, action: "accepted" });
  } else {
    await prisma.contribution.update({ where: { id: contributionId }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true, action: "rejected" });
  }
}

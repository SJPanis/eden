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
  const pending = await prisma.agentBuild.findMany({
    where: { status: "pending_approval" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      request: true,
      context: true,
      createdAt: true,
    },
  });

  const submissions = pending.map((b) => {
    let ctx: Record<string, unknown> = {};
    try { ctx = JSON.parse(b.context ?? "{}"); } catch { /* ignore */ }
    const sub = ctx.layer2Submission as { summary?: string; confidence?: number; submittedAt?: string } | undefined;
    return {
      id: b.id,
      request: b.request,
      summary: sub?.summary ?? b.request,
      confidence: sub?.confidence ?? 50,
      submittedAt: sub?.submittedAt ?? b.createdAt.toISOString(),
      prUrl: "",
    };
  });

  return NextResponse.json({ ok: true, submissions });
}

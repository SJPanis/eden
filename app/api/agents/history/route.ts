import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const builds = await prisma.agentBuild.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tasks: { orderBy: { index: "asc" } } },
  });

  const entries = builds.flatMap((b) =>
    b.tasks.map((t) => ({
      id: t.id,
      text: t.description,
      status: t.status === "complete" ? "complete" : t.status === "running" ? "active" : t.status === "failed" ? "failed" : "queued",
      time: t.completedAt
        ? new Date(t.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      leafCost: t.leafCost,
    })),
  );

  return NextResponse.json({ ok: true, entries: entries.slice(0, 30) });
}

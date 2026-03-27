import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const buildId = req.nextUrl.searchParams.get("buildId");

  if (!buildId) {
    return NextResponse.json(
      { ok: false, error: "buildId required" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  const build = await prisma.agentBuild.findUnique({
    where: { id: buildId },
    include: {
      tasks: { orderBy: { index: "asc" } },
    },
  });

  if (!build || build.userId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Build not found" },
      { status: 404 },
    );
  }

  const completedTasks = build.tasks.filter((t) => t.status === "complete").length;
  const totalTasks = build.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return NextResponse.json({
    ok: true,
    build: {
      id: build.id,
      status: build.status,
      request: build.request,
      totalLeafs: build.totalLeafs,
      createdAt: build.createdAt,
    },
    tasks: build.tasks.map((t) => ({
      id: t.id,
      index: t.index,
      type: t.type,
      description: t.description,
      status: t.status,
      result: t.result,
      leafCost: t.leafCost,
    })),
    progress,
    completedTasks,
    totalTasks,
  });
}

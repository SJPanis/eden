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

  // Count pending approval builds (status = 'pending_approval')
  const pendingApprovals = await prisma.agentBuild.count({
    where: { status: "pending_approval" },
  });

  // Find the most recent running build as current simulation
  const runningBuild = await prisma.agentBuild.findFirst({
    where: { status: "running" },
    orderBy: { createdAt: "desc" },
    select: { request: true, createdAt: true },
  });

  // Last completed simulation
  const lastCompleted = await prisma.agentBuild.findFirst({
    where: { status: { in: ["complete", "pending_approval"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    active: !!runningBuild,
    currentSimulation: runningBuild?.request ?? null,
    pendingApprovals,
    lastSimulationAt: lastCompleted?.createdAt?.toISOString() ?? null,
    simulationHealth: runningBuild ? "healthy" : pendingApprovals > 0 ? "healthy" : "offline",
  });
}

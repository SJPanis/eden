import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const buildId = typeof body?.buildId === "string" ? body.buildId : "";
  const prUrl = typeof body?.prUrl === "string" ? body.prUrl : "";
  const summary = typeof body?.summary === "string" ? body.summary : "";
  const confidence = typeof body?.confidence === "number" ? body.confidence : 0;

  if (!buildId) {
    return NextResponse.json({ ok: false, error: "buildId required" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  // Verify build exists
  const build = await prisma.agentBuild.findUnique({ where: { id: buildId } });
  if (!build) {
    return NextResponse.json({ ok: false, error: "Build not found" }, { status: 404 });
  }

  // Mark as pending approval and store submission metadata in context
  const existingContext = build.context ? JSON.parse(build.context) : {};
  const updatedContext = {
    ...existingContext,
    layer2Submission: {
      prUrl,
      summary,
      confidence,
      submittedAt: new Date().toISOString(),
    },
  };

  await prisma.agentBuild.update({
    where: { id: buildId },
    data: {
      status: "pending_approval",
      context: JSON.stringify(updatedContext),
    },
  });

  return NextResponse.json({
    ok: true,
    approvalId: buildId,
    status: "pending_approval",
  });
}

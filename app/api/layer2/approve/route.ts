import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { Octokit } from "@octokit/rest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const approvalId = typeof body?.approvalId === "string" ? body.approvalId
    : typeof body?.buildId === "string" ? body.buildId : "";
  const decision = body?.decision as "approve" | "deny" | undefined;
  const note = typeof body?.note === "string" ? body.note : "";

  if (!approvalId || !decision || !["approve", "deny"].includes(decision)) {
    return NextResponse.json(
      { ok: false, error: "approvalId and decision (approve|deny) required" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const build = await prisma.agentBuild.findUnique({ where: { id: approvalId } });

  if (!build || build.status !== "pending_approval") {
    return NextResponse.json({ ok: false, error: "No pending approval found" }, { status: 404 });
  }

  const context = build.context ? JSON.parse(build.context) : {};
  const prUrl = context.layer2Submission?.prUrl;

  // Check if there's a real GitHub PR to merge/close
  const hasPR = prUrl && typeof prUrl === "string" && prUrl.includes("/pull/") && process.env.GITHUB_TOKEN;

  try {
    if (decision === "approve") {
      // If there's a real PR, merge it
      if (hasPR) {
        const prMatch = prUrl.match(/\/pull\/(\d+)/);
        if (prMatch) {
          const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
          await octokit.pulls.merge({
            owner: "SJPanis",
            repo: "eden",
            pull_number: parseInt(prMatch[1], 10),
            merge_method: "merge",
          });
        }
      }

      await prisma.agentBuild.update({
        where: { id: approvalId },
        data: {
          status: "complete",
          context: JSON.stringify({
            ...context,
            layer2Approval: {
              decision: "approve",
              note,
              approvedAt: new Date().toISOString(),
              approvedBy: session.user.id,
            },
          }),
        },
      });

      return NextResponse.json({ ok: true, action: "approved", buildId: approvalId });
    } else {
      // Deny — close PR if exists
      if (hasPR) {
        const prMatch = prUrl.match(/\/pull\/(\d+)/);
        if (prMatch) {
          const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
          const prNumber = parseInt(prMatch[1], 10);
          await octokit.pulls.update({ owner: "SJPanis", repo: "eden", pull_number: prNumber, state: "closed" });
          if (note) {
            await octokit.issues.createComment({ owner: "SJPanis", repo: "eden", issue_number: prNumber, body: `**Denied:** ${note}` });
          }
        }
      }

      await prisma.agentBuild.update({
        where: { id: approvalId },
        data: {
          status: "failed",
          context: JSON.stringify({
            ...context,
            layer2Approval: {
              decision: "deny",
              note,
              deniedAt: new Date().toISOString(),
              deniedBy: session.user.id,
            },
          }),
        },
      });

      return NextResponse.json({ ok: true, action: "denied", buildId: approvalId });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error processing decision";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

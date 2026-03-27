import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { Octokit } from "@octokit/rest";
import { validateCommandToken } from "@/lib/command-tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  // Require command token from TOTP-gated command center
  const cmdToken = req.headers.get("X-Command-Token") ?? "";
  if (!cmdToken || !validateCommandToken(session.user.id, cmdToken)) {
    return NextResponse.json(
      { ok: false, error: "Command token required. Open Eden Command and verify TOTP." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const approvalId = typeof body?.approvalId === "string" ? body.approvalId : "";
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

  if (!prUrl || !process.env.GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, error: "Missing PR URL or GitHub token" }, { status: 500 });
  }

  // Extract PR number from URL: https://github.com/owner/repo/pull/123
  const prMatch = prUrl.match(/\/pull\/(\d+)/);
  if (!prMatch) {
    return NextResponse.json({ ok: false, error: "Invalid PR URL format" }, { status: 400 });
  }

  const prNumber = parseInt(prMatch[1], 10);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = "SJPanis";
  const repo = "eden";

  try {
    if (decision === "approve") {
      await octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        merge_method: "merge",
      });

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

      return NextResponse.json({ ok: true, action: "merged", prNumber });
    } else {
      await octokit.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: "closed",
      });

      if (note) {
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: `**Denied by Sonny:** ${note}`,
        });
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

      return NextResponse.json({ ok: true, action: "denied", prNumber });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "GitHub API error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

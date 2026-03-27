import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { GitHubService } from "@/lib/github-service";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const PROTECTED_FILES = [
  "app/api/agents/execute/route.ts",
  "app/api/agents/orchestrate/route.ts",
  "app/api/agents/commit/route.ts",
  "app/api/agents/status/route.ts",
  "app/api/wallet/spend/route.ts",
  "app/api/wallet/balance/route.ts",
  "app/api/admin/sweep-revenue/route.ts",
  "app/api/auth/sign-up/route.ts",
  "lib/github-service.ts",
  "prisma/schema.prisma",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
];

function sanitizeCode(raw: string): string {
  // Strip markdown code fences (typed)
  const fenceMatch = raw.match(
    /```(?:typescript|tsx|ts|javascript|js|jsx|prisma|json|css)?\n?([\s\S]*?)```/,
  );
  if (fenceMatch) return fenceMatch[1].trim();

  // Strip plain ``` fences
  const plainFence = raw.match(/```\n?([\s\S]*?)```/);
  if (plainFence) return plainFence[1].trim();

  // If it looks like JSON (starts with { or [), skip it — not code
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "";

  // If it starts with import/export/const/function/class or a comment, it's probably real code
  if (/^(import|export|const|function|class|\/\/|\/\*)/.test(trimmed)) return trimmed;

  // Otherwise skip — not real code
  return "";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const buildId = typeof body?.buildId === "string" ? body.buildId : "";
  if (!buildId) {
    return NextResponse.json({ ok: false, error: "No buildId" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const build = await prisma.agentBuild.findUnique({
    where: { id: buildId },
    include: { tasks: { orderBy: { index: "asc" } } },
  });

  if (!build || build.userId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Build not found" }, { status: 404 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }

  const github = new GitHubService();
  const branchName = `eden-build-${buildId.slice(-8)}-${Date.now()}`;
  const client = new Anthropic();

  try {
    // Create branch from main
    await github.createBranch(branchName);

    const completedTasks = build.tasks.filter((t) => t.status === "complete" && t.result);
    const committedFiles: string[] = [];

    for (const task of completedTasks) {
      if (!task.result) continue;

      // Ask Claude to determine the file path for this task's output
      const pathMsg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Given this task: "${task.description}"
And this output:
${task.result.slice(0, 200)}

What is the most appropriate file path for this code in a Next.js 16 App Router project?
Return ONLY the file path like: app/api/hello/route.ts
No explanation. Just the path.`,
          },
        ],
      });

      const rawPath =
        pathMsg.content[0].type === "text" ? pathMsg.content[0].text.trim() : null;
      if (!rawPath) continue;

      // Clean the path
      const filePath = rawPath.replace(/^\/+/, "").replace(/[^a-zA-Z0-9/_.\-]/g, "");
      if (!filePath || filePath.length > 200) continue;

      // Never overwrite critical files
      if (PROTECTED_FILES.some((f) => filePath.endsWith(f))) {
        console.log(`[eden-commit] Skipping protected file: ${filePath}`);
        continue;
      }

      // Sanitize: strip markdown fences, skip non-code output
      const code = sanitizeCode(task.result);
      if (!code || code.length < 20) continue;

      // Commit the sanitized code
      await github.commitFile(
        branchName,
        filePath,
        code,
        `feat: ${task.description.slice(0, 72)} [eden-build-${buildId.slice(-6)}]`,
      );
      committedFiles.push(filePath);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    // Open PR with summary
    const prBody = `## Eden Autonomous Build

**Build ID:** ${buildId}
**Request:** ${build.request}
**Tasks completed:** ${completedTasks.length}

### Files committed
${committedFiles.map((f) => `- \`${f}\``).join("\n")}

### Task summary
${build.tasks.map((t) => `- [${t.status === "complete" ? "x" : " "}] ${t.description}`).join("\n")}

---
> **Warning**: These files were generated autonomously by Eden's agentic build system.
> Please review carefully before merging. Code has been sanitized (markdown fences stripped,
> non-code output filtered) but may still contain issues.`;

    const prUrl = await github.openPR(
      branchName,
      `feat: ${build.request.slice(0, 72)} [eden-auto]`,
      prBody,
    );

    // Update build status
    await prisma.agentBuild.update({
      where: { id: buildId },
      data: { status: "complete" },
    });

    return NextResponse.json({
      ok: true,
      branchName,
      prUrl,
      filesCommitted: committedFiles.length,
      files: committedFiles,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

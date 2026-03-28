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
  ".env.local",
  ".env",
  "railway.json",
];

// Allowed outbound domains — any fetch/http call to other domains is rejected
const ALLOWED_DOMAINS = [
  "edencloud.app",
  "api.anthropic.com",
  "api.stripe.com",
  "github.com/SJPanis/eden",
  "googleapis.com",
];

// Patterns that agents must never generate
const FORBIDDEN_PATTERNS = [
  { pattern: /process\.env/g, reason: "process.env access (agents cannot read secrets)" },
  { pattern: /\beval\s*\(/g, reason: "eval() call" },
  { pattern: /\bFunction\s*\(/g, reason: "Function() constructor" },
  { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/g, reason: "child_process access" },
  { pattern: /\bexec\s*\(/g, reason: "exec() call" },
  { pattern: /\bexecSync\s*\(/g, reason: "execSync() call" },
  { pattern: /\bspawn\s*\(/g, reason: "spawn() call" },
  { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, reason: "filesystem access via require('fs')" },
  { pattern: /from\s+['"]fs['"]/g, reason: "filesystem access via import from 'fs'" },
  { pattern: /from\s+['"]node:fs['"]/g, reason: "filesystem access via import from 'node:fs'" },
  { pattern: /\breadFileSync\b/g, reason: "readFileSync access" },
  { pattern: /\bwriteFileSync\b/g, reason: "writeFileSync access" },
  { pattern: /\breadFile\b/g, reason: "readFile access" },
  { pattern: /\bwriteFile\b/g, reason: "writeFile access" },
];

function enforceCodeSandbox(code: string): { safe: boolean; reason?: string } {
  // Check forbidden patterns
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(code)) {
      return { safe: false, reason: `Forbidden: ${reason}` };
    }
  }

  // Check outbound URLs — find all fetch/axios/http calls with URLs
  const urlMatches = code.matchAll(
    /(?:fetch|axios\.(?:get|post|put|delete|patch)|http\.(?:get|request)|https\.(?:get|request))\s*\(\s*['"`]([^'"`]+)['"`]/g,
  );
  for (const match of urlMatches) {
    const url = match[1];
    // Relative URLs are fine (internal API calls)
    if (url.startsWith("/") || url.startsWith("${")) continue;
    // Check against allowlist
    const isAllowed = ALLOWED_DOMAINS.some((domain) => url.includes(domain));
    if (!isAllowed) {
      return { safe: false, reason: `Unauthorized outbound URL: ${url}` };
    }
  }

  return { safe: true };
}

function sanitizeCode(raw: string): string {
  // Strip markdown code fences (typed)
  const fenceMatch = raw.match(
    /```(?:typescript|tsx|ts|javascript|js|jsx|prisma|json|css)?\n?([\s\S]*?)```/,
  );
  if (fenceMatch) return fenceMatch[1].trim();

  // Strip plain ``` fences
  const plainFence = raw.match(/```\n?([\s\S]*?)```/);
  if (plainFence) return plainFence[1].trim();

  // Strip leading non-code preamble lines (e.g. "on\n{...}" pattern from Claude)
  // Collapse to the first line that looks like it matters
  const lines = raw.split("\n");
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    // Skip short non-code preamble words (e.g. "on", "Here:", "Output:", etc.)
    if (line.length > 0 && line.length < 20 && !/^(import|export|const|function|class|\/\/|\/\*|<)/.test(line)) {
      startIdx = i + 1;
      continue;
    }
    break;
  }
  const cleaned = lines.slice(startIdx).join("\n").trim();

  // Reject assemble summary JSON wrapped in "on\n{...}" or bare "on"
  const trimmed = cleaned || raw.trim();
  if (trimmed === "on" || trimmed.startsWith("on\n") || trimmed.startsWith("on\r\n")) return "";

  // If it looks like JSON (starts with { or [), skip it — not code
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "";

  // Detect JSON blobs disguised with a preamble: if the content is mostly JSON, reject it
  const jsonBlockMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonBlockMatch && jsonBlockMatch[0].length > trimmed.length * 0.8) {
    try {
      JSON.parse(jsonBlockMatch[0]);
      return ""; // Valid JSON blob, not code
    } catch {
      // Not valid JSON, continue
    }
  }

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

      // Sandbox enforcement — reject forbidden patterns and unauthorized URLs
      const sandboxResult = enforceCodeSandbox(code);
      if (!sandboxResult.safe) {
        console.log(`[eden-commit] Sandbox violation in ${filePath}: ${sandboxResult.reason}`);
        continue;
      }

      // Security check before committing
      const secCheck = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Security check. Does this code contain:
- Hardcoded secrets or API keys?
- SQL injection vulnerabilities?
- Eval() or Function() calls?
- Raw user input without sanitization?
- Calls to external URLs not in the approved list?

Code: ${code.slice(0, 400)}

Return ONLY: {"safe": true} or {"safe": false, "reason": "..."}`,
          },
        ],
      });

      let secSafe = true;
      try {
        const secText =
          secCheck.content[0].type === "text" ? secCheck.content[0].text : '{"safe":true}';
        const secMatch = secText.match(/\{[\s\S]*\}/);
        const secResult = secMatch ? JSON.parse(secMatch[0]) : { safe: true };
        if (!secResult.safe) {
          console.log(
            `[eden-commit] Security check failed for ${filePath}: ${secResult.reason}`,
          );
          secSafe = false;
        }
      } catch {
        // If parsing fails, allow the commit (conservative toward not blocking)
      }

      if (!secSafe) continue;

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

    // Validation: don't open PR if no files were committed
    if (committedFiles.length === 0) {
      console.log(`[eden-commit] No valid files to commit for build ${buildId}`);
      await prisma.agentBuild.update({
        where: { id: buildId },
        data: { status: "failed" },
      });
      return NextResponse.json({
        ok: false,
        error: "No valid code files to commit — all output was filtered by sanitizer",
        filesCommitted: 0,
      });
    }

    // Open PR with summary + validation status
    const prBody = `## Eden Autonomous Build

**Build ID:** ${buildId}
**Request:** ${build.request}
**Tasks completed:** ${completedTasks.length}
**Validation:** ${committedFiles.length} files committed, all passed security check

### Files committed
${committedFiles.map((f) => `- \`${f}\``).join("\n")}

### Task summary
${build.tasks.map((t) => `- [${t.status === "complete" ? "x" : " "}] ${t.description}`).join("\n")}

---
> **Warning**: These files were generated autonomously by Eden's agentic build system.
> Please review carefully before merging. Code has been sanitized (markdown fences stripped,
> non-code output filtered, JSON blobs rejected) but may still contain issues.`;

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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SONNET = "claude-sonnet-4-20250514";
const HAIKU = "claude-haiku-4-5-20251001";

function callClaude(
  client: Anthropic,
  model: string,
  maxTokens: number,
  system: string,
  user: string,
) {
  return client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: user }],
  });
}

function extractText(msg: Anthropic.Message): string {
  return msg.content[0]?.type === "text" ? msg.content[0].text : "";
}

function safeParse(raw: string, fallback: Record<string, unknown> = {}) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
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

  const client = new Anthropic();
  let context: Record<string, unknown> = safeParse(build.context ?? "{}");
  let tasksCompleted = 0;

  const incompleteTasks = build.tasks.filter((t) => t.status !== "complete");

  for (const task of incompleteTasks) {
    try {
      // ── a. DESIGN PHASE — Architect designs this task ──────────────────
      const designMsg = await callClaude(
        client,
        SONNET,
        600,
        "You are an Architect agent. You maintain context across a build. Your job is to design ONE specific task with full context awareness. Return a JSON spec: { description, approach, dependencies, securityNotes }",
        `Design task: ${task.description}\nBuild context: ${JSON.stringify(context)}\nOriginal request: ${build.request}`,
      );
      const architectDesign = safeParse(extractText(designMsg), {
        description: task.description,
        approach: "direct implementation",
        dependencies: [],
        securityNotes: "none",
      });

      // ── b. Inject design into context ──────────────────────────────────
      context[`task_${task.index}_design`] = architectDesign;

      // ── c. Update build context in DB ──────────────────────────────────
      await prisma.agentBuild.update({
        where: { id: buildId },
        data: { context: JSON.stringify(context) },
      });

      // ── d. EXECUTE PHASE — Builder (Agent 2) ──────────────────────────
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "running", startedAt: new Date() },
      });

      const contextStr = JSON.stringify(context, null, 2);
      const builderPrompt = `You are a Builder agent with ONE job.

TASK: ${task.description}
TYPE: ${task.type}

ARCHITECT CONTEXT (what has been built so far):
${contextStr}

ORIGINAL REQUEST: ${build.request}

ARCHITECT DESIGN FOR THIS TASK:
${JSON.stringify(architectDesign, null, 2)}

Rules:
- Return ONLY valid ${task.type === "ui" ? "TSX" : "TypeScript"} code
- No markdown fences, no explanation, no preamble
- Your output will be committed directly to GitHub
- Make it production-ready and secure
- If type is 'assemble', return a JSON summary:
  {"summary":"...","filesBuilt":[],"nextStep":"..."}`;

      const builderMsg = await callClaude(client, HAIKU, 800, "", builderPrompt);
      const result = extractText(builderMsg);

      // ── Store result, mark complete ────────────────────────────────────
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "complete", result, completedAt: new Date() },
      });

      // ── e. ABSORB PHASE — Architect absorbs Builder output ────────────
      const absorbMsg = await callClaude(
        client,
        SONNET,
        600,
        "",
        `Given the original context and this new output, update the build context JSON.
Add what was built, what decisions were made, what the next agent needs to know.
Return ONLY the updated context JSON.

Current context: ${JSON.stringify(context)}
Task completed: ${task.description} (type: ${task.type})
Builder output (first 500 chars): ${result.slice(0, 500)}`,
      );

      const updatedContext = safeParse(extractText(absorbMsg), context);
      context = updatedContext as Record<string, unknown>;

      await prisma.agentBuild.update({
        where: { id: buildId },
        data: { context: JSON.stringify(context) },
      });

      // ── f. SECURITY CHECK ─────────────────────────────────────────────
      const secMsg = await callClaude(
        client,
        HAIKU,
        200,
        "",
        `Review this code output for security issues.
Return JSON: { "secure": true, "issues": [], "approved": true } or { "secure": false, "issues": ["..."], "approved": false }
Code: ${result.slice(0, 500)}`,
      );

      const secResult = safeParse(extractText(secMsg), { secure: true, issues: [], approved: true });

      if (!secResult.approved) {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { status: "failed" },
        });
        context[`securityIssues_task_${task.index}`] = secResult.issues;
        await prisma.agentBuild.update({
          where: { id: buildId },
          data: { context: JSON.stringify(context) },
        });
        continue;
      }

      tasksCompleted++;
    } catch (error) {
      console.error(`[architect] Task ${task.index} failed:`, error);
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "failed" },
      });
    }
  }

  // ── After all tasks → trigger commit ────────────────────────────────────
  const allTasks = await prisma.agentTask.findMany({
    where: { buildId },
    orderBy: { index: "asc" },
  });
  const allComplete = allTasks.every((t) => t.status === "complete" || t.status === "failed");
  const anyComplete = allTasks.some((t) => t.status === "complete");

  if (allComplete && anyComplete) {
    // Trigger commit internally
    try {
      const origin = req.nextUrl.origin;
      const commitRes = await fetch(`${origin}/api/agents/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ buildId }),
      });
      const commitData = await commitRes.json();

      await prisma.agentBuild.update({
        where: { id: buildId },
        data: { status: "complete" },
      });

      return NextResponse.json({
        ok: true,
        buildId,
        context,
        tasksCompleted,
        totalTasks: allTasks.length,
        commit: commitData,
      });
    } catch (commitErr) {
      console.error("[architect] Commit failed:", commitErr);
    }
  }

  await prisma.agentBuild.update({
    where: { id: buildId },
    data: { status: allComplete ? "complete" : "running" },
  });

  return NextResponse.json({
    ok: true,
    buildId,
    context,
    tasksCompleted,
    totalTasks: allTasks.length,
  });
}

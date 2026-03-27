import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";


export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const buildId = typeof body?.buildId === "string" ? body.buildId : "";
  const taskId = typeof body?.taskId === "string" ? body.taskId : "";

  if (!buildId || !taskId) {
    return NextResponse.json(
      { ok: false, error: "buildId and taskId required" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  // 1. Load task and build
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    include: { build: true },
  });

  if (!task || task.buildId !== buildId || task.build.userId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found" },
      { status: 404 },
    );
  }

  // 2. Mark as running
  await prisma.agentTask.update({
    where: { id: taskId },
    data: { status: "running", startedAt: new Date() },
  });

  // 3. Build context from Architect's accumulated context + previous tasks
  const buildContext = task.build.context ?? "{}";
  const contextStr = JSON.stringify(JSON.parse(buildContext || "{}"), null, 2);

  const previousTasks = await prisma.agentTask.findMany({
    where: { buildId, status: "complete", index: { lt: task.index } },
    orderBy: { index: "asc" },
  });

  const prevTaskContext = previousTasks.length > 0
    ? previousTasks.map((t) => `[${t.type}] ${t.description}:\n${t.result ?? "(no output)"}`).join("\n\n")
    : "(first task — no previous context)";

  // 4. Build task-specific prompt with full Architect context injected
  const prompt = `You are a Builder agent with ONE job.

TASK: ${task.description}
TYPE: ${task.type}

ARCHITECT CONTEXT (what has been built so far):
${contextStr}

PREVIOUS TASK OUTPUTS:
${prevTaskContext}

ORIGINAL REQUEST: ${task.build.request}

Rules:
- Return ONLY valid ${task.type === "ui" ? "TSX" : "TypeScript"} code
- No markdown fences, no explanation, no preamble
- Your output will be committed directly to GitHub
- Make it production-ready and secure
- If type is 'assemble', return a JSON summary:
  {"summary":"...","filesBuilt":[],"nextStep":"..."}`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const result = message.content[0].type === "text" ? message.content[0].text : "";

    // 5. Store result, mark complete
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: "complete", result, completedAt: new Date() },
    });

    // 6. Check if all tasks are complete → mark build complete
    const remaining = await prisma.agentTask.count({
      where: { buildId, status: { not: "complete" } },
    });

    if (remaining === 0) {
      await prisma.agentBuild.update({
        where: { id: buildId },
        data: { status: "complete" },
      });
    }

    return NextResponse.json({
      ok: true,
      taskId,
      result,
      buildStatus: remaining === 0 ? "complete" : "running",
    });
  } catch (error) {
    console.error("[agents/execute] worker failed:", error);

    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: "failed" },
    });

    return NextResponse.json(
      { ok: false, error: "Worker agent failed" },
      { status: 500 },
    );
  }
}

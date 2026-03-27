import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const TASK_PROMPTS: Record<string, (desc: string, context: string) => string> = {
  schema: (desc, ctx) =>
    `You are a database architect. Create a Prisma schema model for: ${desc}\nContext from previous tasks:\n${ctx}\nReturn ONLY the Prisma model definition, no other text.`,
  api: (desc, ctx) =>
    `You are a Next.js API developer. Create a Next.js API route for: ${desc}\nContext from previous tasks:\n${ctx}\nReturn ONLY the TypeScript code, no other text.`,
  ui: (desc, ctx) =>
    `You are a React developer using Tailwind. Create a React component for: ${desc}\nContext from previous tasks:\n${ctx}\nReturn ONLY the TSX component code, no other text.`,
  copy: (desc, _ctx) =>
    `Write the UI copy for: ${desc}\nReturn ONLY the copy text, formatted as JSON keys.`,
  config: (desc, ctx) =>
    `You are a DevOps engineer. Create the configuration for: ${desc}\nContext from previous tasks:\n${ctx}\nReturn ONLY the configuration code, no other text.`,
  test: (desc, ctx) =>
    `You are a QA engineer. Write tests for: ${desc}\nContext from previous tasks:\n${ctx}\nReturn ONLY the test code, no other text.`,
  assemble: (_desc, ctx) =>
    `You are a senior engineer reviewing a build. Given these completed tasks:\n${ctx}\nWrite a summary of what was built and what the next step should be.\nReturn as JSON: {"summary":"...","nextStep":"...","status":"complete"}`,
};

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

  // 3. Build context from previous completed tasks
  const previousTasks = await prisma.agentTask.findMany({
    where: { buildId, status: "complete", index: { lt: task.index } },
    orderBy: { index: "asc" },
  });

  const context = previousTasks.length > 0
    ? previousTasks.map((t) => `[${t.type}] ${t.description}:\n${t.result ?? "(no output)"}`).join("\n\n")
    : "(first task — no previous context)";

  // 4. Call Claude Haiku with task-specific prompt
  const promptBuilder = TASK_PROMPTS[task.type] ?? TASK_PROMPTS.api;
  const prompt = promptBuilder(task.description, context);

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

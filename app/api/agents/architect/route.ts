import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const HAIKU = "claude-haiku-4-5-20251001";

// GET — scan for maintenance tasks
export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const client = new Anthropic();

  // Ask Haiku to identify maintenance priorities based on recent builds
  const prisma = getPrismaClient();
  const recentBuilds = await prisma.agentBuild.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { tasks: { where: { status: "failed" } } },
  });

  const failedSummary = recentBuilds
    .filter((b) => b.tasks.length > 0)
    .map((b) => `Build "${b.request}": ${b.tasks.map((t) => t.description).join(", ")}`)
    .join("\n");

  const scanMsg = await client.messages.create({
    model: HAIKU,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are the Architect, Eden's maintenance and evaluation agent. Scan these recent build failures and identify maintenance tasks.

Recent failures:
${failedSummary || "(no recent failures)"}

Return a JSON array of maintenance tasks:
[{ "priority": "high"|"medium"|"low", "description": "...", "type": "fix"|"cleanup"|"optimize" }]

If no issues found, return an empty array: []
Return ONLY the JSON array.`,
      },
    ],
  });

  const raw = scanMsg.content[0]?.type === "text" ? scanMsg.content[0].text : "[]";
  let tasks: Array<{ priority: string; description: string; type: string }> = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) tasks = JSON.parse(match[0]);
  } catch {
    tasks = [];
  }

  return NextResponse.json({ ok: true, maintenanceTasks: tasks });
}

// POST — create and execute a maintenance build
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ ok: false, error: "No description provided" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const client = new Anthropic();

  // Create build tagged as Architect (maintenance)
  const build = await prisma.agentBuild.create({
    data: {
      userId: session.user.id,
      request: `[eden-architect] ${description}`,
      status: "running",
    },
  });

  // Architect uses Haiku only — lightweight maintenance tasks
  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are the Architect, Eden's maintenance agent. Break this maintenance task into 2-4 small tasks: "${description}"

Return ONLY a JSON array:
[{ "index": 0, "type": "api", "description": "...", "leafCost": 2, "agentType": "api" }]

Task types: api, config, test, assemble
Keep tasks small and focused. leafCost: 2-5.
Last task is always "assemble".
Return ONLY the JSON array.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    await prisma.agentBuild.update({ where: { id: build.id }, data: { status: "failed" } });
    return NextResponse.json({ ok: false, error: "Architect returned unexpected format" }, { status: 500 });
  }

  let taskList: Array<{ index: number; type: string; description: string; leafCost: number }>;
  try {
    taskList = JSON.parse(jsonMatch[0]);
  } catch {
    await prisma.agentBuild.update({ where: { id: build.id }, data: { status: "failed" } });
    return NextResponse.json({ ok: false, error: "Failed to parse Architect response" }, { status: 500 });
  }

  const totalLeafs = taskList.reduce((sum, t) => sum + (t.leafCost ?? 2), 0);

  const tasks = await Promise.all(
    taskList.map((t) =>
      prisma.agentTask.create({
        data: {
          buildId: build.id,
          index: t.index,
          type: t.type,
          description: t.description,
          leafCost: t.leafCost ?? 2,
          status: "pending",
        },
      }),
    ),
  );

  await prisma.agentBuild.update({
    where: { id: build.id },
    data: { totalLeafs },
  });

  // Trigger build orchestrator for the maintenance build
  try {
    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/agents/build-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ buildId: build.id }),
    }).catch((err) => console.error("[architect] Build orchestrator trigger failed:", err));
  } catch {
    // Non-blocking
  }

  return NextResponse.json({
    ok: true,
    buildId: build.id,
    totalLeafs,
    tasks: tasks.map((t) => ({
      id: t.id,
      index: t.index,
      type: t.type,
      description: t.description,
      leafCost: t.leafCost,
      status: t.status,
    })),
  });
}

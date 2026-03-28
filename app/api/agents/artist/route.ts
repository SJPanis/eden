import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const request = typeof body?.request === "string" ? body.request.trim() : "";
  if (!request) {
    return NextResponse.json({ ok: false, error: "No request provided" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  // Create the build record tagged as Artist (innovation)
  const build = await prisma.agentBuild.create({
    data: {
      userId: session.user.id,
      request: `[eden-artist] ${request}`,
      status: "running",
    },
  });

  // Accept optional Architect context to shape Artist's builds
  const architectContext = typeof body?.context === "string" ? body.context : "";
  const systemPrompt = architectContext
    ? `You are the Artist, Eden's innovation agent. You break down creative feature requests into executable tasks. Tag everything with [eden-artist]. Focus on novel, user-facing features.\n\nCONTEXT FROM ARCHITECT:\n${architectContext}`
    : "You are the Artist, Eden's innovation agent. You break down creative feature requests into executable tasks. Tag everything with [eden-artist]. Focus on novel, user-facing features.";

  // Use Sonnet to break down the innovation request
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Break this innovation request into 5-8 specific tasks: "${request}"

Return ONLY a JSON array:
[
  {
    "index": 0,
    "type": "schema",
    "description": "...",
    "leafCost": 5,
    "agentType": "schema"
  }
]

Task types: schema, api, ui, copy, config, test, assemble
Each task should be atomic and specific.
leafCost: 2-10 Leafs per task based on complexity.
Last task is always type "assemble".

Return ONLY the JSON array.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    await prisma.agentBuild.update({ where: { id: build.id }, data: { status: "failed" } });
    return NextResponse.json({ ok: false, error: "Artist returned unexpected format" }, { status: 500 });
  }

  let taskList: Array<{ index: number; type: string; description: string; leafCost: number }>;
  try {
    taskList = JSON.parse(jsonMatch[0]);
  } catch {
    await prisma.agentBuild.update({ where: { id: build.id }, data: { status: "failed" } });
    return NextResponse.json({ ok: false, error: "Failed to parse Artist response" }, { status: 500 });
  }

  const totalLeafs = taskList.reduce((sum, t) => sum + (t.leafCost ?? 5), 0);

  const tasks = await Promise.all(
    taskList.map((t) =>
      prisma.agentTask.create({
        data: {
          buildId: build.id,
          index: t.index,
          type: t.type,
          description: t.description,
          leafCost: t.leafCost ?? 5,
          status: "pending",
        },
      }),
    ),
  );

  await prisma.agentBuild.update({
    where: { id: build.id },
    data: { totalLeafs },
  });

  // Trigger build orchestrator to handle the full build
  try {
    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/agents/build-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ buildId: build.id }),
    }).catch((err) => console.error("[artist] Build orchestrator trigger failed:", err));
  } catch {
    // Non-blocking — client can poll status
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

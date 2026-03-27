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
  const request = typeof body?.request === "string" ? body.request.trim() : "";

  if (!request) {
    return NextResponse.json(
      { ok: false, error: "No build request provided" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  // 1. Create the build record
  const build = await prisma.agentBuild.create({
    data: {
      userId: session.user.id,
      request,
      status: "running",
    },
  });

  // 2. Call Claude Sonnet to break down the request
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system:
      "You are Eden's build orchestrator. Break down build requests into specific executable tasks for AI worker agents.",
    messages: [
      {
        role: "user",
        content: `Break this request into 5-8 specific tasks: "${request}"

Return ONLY a JSON array:
[
  {
    "index": 0,
    "type": "schema",
    "description": "Create the database schema for [feature]",
    "leafCost": 5,
    "agentType": "schema"
  }
]

Task types: schema, api, ui, copy, config, test, assemble
Each task should be atomic and specific.
leafCost: 2-10 Leafs per task based on complexity.
Last task is always type "assemble" with description "Combine all outputs into working checkpoint".

Return ONLY the JSON array. No other text.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  // 3. Parse the task list
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    await prisma.agentBuild.update({
      where: { id: build.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { ok: false, error: "Orchestrator returned unexpected format" },
      { status: 500 },
    );
  }

  let taskList: Array<{
    index: number;
    type: string;
    description: string;
    leafCost: number;
    agentType?: string;
  }>;
  try {
    taskList = JSON.parse(jsonMatch[0]);
  } catch {
    await prisma.agentBuild.update({
      where: { id: build.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { ok: false, error: "Failed to parse orchestrator response" },
      { status: 500 },
    );
  }

  // 4. Create AgentTask records
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

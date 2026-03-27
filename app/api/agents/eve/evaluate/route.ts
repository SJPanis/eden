import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";
import { setEveFeedback } from "@/lib/adam-eve-loop";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const adamRuns = Array.isArray(body?.adamRuns) ? body.adamRuns : [];

  const prisma = getPrismaClient();

  // Load recent Adam builds
  const recentBuilds = await prisma.agentBuild.findMany({
    where: { request: { startsWith: "[eden-adam]" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, request: true, status: true, createdAt: true },
  });

  if (recentBuilds.length === 0) {
    return NextResponse.json({ ok: true, feedback: null, message: "No Adam builds to evaluate" });
  }

  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are Eve, Eden's evaluation agent.

Adam has been building services in the sandbox. Evaluate his work.

Recent Adam builds:
${JSON.stringify(recentBuilds.map((b) => ({ request: b.request, status: b.status })))}

Eden's economy:
- Services are rated by how useful they are to users
- Leaf cost should be 1-5 Leafs for simple tasks
- Services should solve one clear problem
- Users want fast, specific, reliable tools

Return ONLY this JSON:
{
  "promoted": ["brief description of ideas worth pursuing"],
  "rejected": ["brief description of ideas that didn't work and why"],
  "pattern": "one sentence about what types of services work best right now",
  "encouragement": "one directive for Adam's next builds — be specific",
  "adamRunsSinceLastEval": ${adamRuns.length},
  "evaluatedAt": "${new Date().toISOString()}"
}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return NextResponse.json({ ok: false, error: "Eve returned unexpected format" }, { status: 500 });
  }

  let feedback;
  try {
    feedback = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to parse Eve response" }, { status: 500 });
  }

  // Store feedback for Adam's next run
  setEveFeedback(feedback);

  // Submit promoted ideas to Layer 2
  if (feedback.promoted && feedback.promoted.length > 0) {
    for (const idea of feedback.promoted) {
      // Find the matching build if possible
      const matchingBuild = recentBuilds.find(
        (b) => b.status === "complete" && b.request.toLowerCase().includes(idea.toLowerCase().slice(0, 20)),
      );
      if (matchingBuild) {
        try {
          await fetch(`${req.nextUrl.origin}/api/layer2/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              buildId: matchingBuild.id,
              prUrl: "",
              summary: `Eve promoted: ${idea}`,
              confidence: 70,
            }),
          });
        } catch {
          // Non-blocking
        }
      }
    }
  }

  return NextResponse.json({ ok: true, feedback });
}

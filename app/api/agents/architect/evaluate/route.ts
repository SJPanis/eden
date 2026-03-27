import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";
import { setArchitectFeedback } from "@/lib/artist-architect-loop";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const artistRuns = Array.isArray(body?.artistRuns) ? body.artistRuns : [];

  const prisma = getPrismaClient();

  // Load recent Artist builds
  const recentBuilds = await prisma.agentBuild.findMany({
    where: { request: { startsWith: "[eden-artist]" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, request: true, status: true, createdAt: true },
  });

  if (recentBuilds.length === 0) {
    return NextResponse.json({ ok: true, feedback: null, message: "No Artist builds to evaluate" });
  }

  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are the Architect, Eden's evaluation agent.

The Artist has been building services in the sandbox. Evaluate their work.

Recent Artist builds:
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
  "encouragement": "one directive for the Artist's next builds — be specific",
  "artistRunsSinceLastEval": ${artistRuns.length},
  "evaluatedAt": "${new Date().toISOString()}"
}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return NextResponse.json({ ok: false, error: "Architect returned unexpected format" }, { status: 500 });
  }

  let feedback;
  try {
    feedback = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to parse Architect response" }, { status: 500 });
  }

  // Store feedback for Artist's next run
  setArchitectFeedback(feedback);

  // Submit promoted ideas to Layer 2
  if (feedback.promoted && feedback.promoted.length > 0) {
    for (const idea of feedback.promoted) {
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
              summary: `Architect promoted: ${idea}`,
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

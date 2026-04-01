import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import Anthropic from "@anthropic-ai/sdk";
import { getEveFeedback, recordAdamRun } from "@/lib/adam-eve-loop";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  const client = new Anthropic();

  try {
    console.log("[LOOP] Starting manual trigger cycle");

    // Step 1: Artist generates a service concept
    const feedback = getEveFeedback();
    const context = feedback
      ? `Previous evaluation:\nPattern: ${feedback.pattern}\nEncouragement: ${feedback.encouragement}\nBuild services that match this pattern.`
      : "Build a useful, specific AI service for Eden users. Something that solves one clear problem. Keep it simple — 1-5 Leafs per use.";

    console.log("[LOOP] Step 1: Artist generating concept...");
    const artistMsg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are the Artist agent for Eden, an AI service platform. Generate ONE new service concept.

Context: ${context}

Return ONLY this JSON:
{
  "name": "service name (2-3 words)",
  "slug": "kebab-case-slug",
  "description": "one sentence describing what it does",
  "leafCost": 5,
  "approach": "brief technical approach"
}`,
      }],
    });

    const artistRaw = artistMsg.content[0]?.type === "text" ? artistMsg.content[0].text : "";
    const conceptMatch = artistRaw.match(/\{[\s\S]*\}/);
    if (!conceptMatch) {
      console.error("[LOOP] Artist returned no JSON:", artistRaw.slice(0, 200));
      return NextResponse.json({ ok: false, error: "Artist failed to generate concept" });
    }

    const concept = JSON.parse(conceptMatch[0]);
    console.log("[LOOP] Step 1 complete:", concept.name);

    // Step 2: Architect reviews
    console.log("[LOOP] Step 2: Architect reviewing...");
    const architectMsg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Review this service concept for Eden:
${JSON.stringify(concept)}

Is this worth building? Return ONLY JSON:
{
  "approved": true/false,
  "confidence": 0-100,
  "reason": "one sentence",
  "refinedDescription": "improved description if approved"
}`,
      }],
    });

    const archRaw = architectMsg.content[0]?.type === "text" ? architectMsg.content[0].text : "";
    const reviewMatch = archRaw.match(/\{[\s\S]*\}/);
    const review = reviewMatch ? JSON.parse(reviewMatch[0]) : { approved: true, confidence: 50, reason: "Default approval" };
    console.log("[LOOP] Step 2 complete:", review.approved ? "APPROVED" : "REJECTED", review.confidence + "%");

    // Step 3: Create AgentBuild record
    console.log("[LOOP] Step 3: Creating build record...");
    const build = await prisma.agentBuild.create({
      data: {
        userId: session.user.id,
        request: `[eden-artist] ${concept.name}: ${concept.description}`,
        status: review.approved ? "pending_approval" : "failed",
        context: JSON.stringify({
          concept,
          review,
          layer2Submission: review.approved ? {
            summary: `Artist proposed: ${concept.name} — ${review.refinedDescription || concept.description}`,
            confidence: review.confidence,
            submittedAt: new Date().toISOString(),
          } : undefined,
        }),
      },
    });
    console.log("[LOOP] Step 3 complete: build", build.id, "status:", build.status);

    // Record the run
    recordAdamRun({
      runAt: new Date().toISOString(),
      ideas: [concept.name],
      buildIds: [build.id],
    });

    return NextResponse.json({
      ok: true,
      buildId: build.id,
      concept,
      review,
      status: build.status,
    });
  } catch (error) {
    console.error("[LOOP] Trigger failed:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

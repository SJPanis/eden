import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const year = typeof body?.year === "string" ? body.year.trim() : "";
  const make = typeof body?.make === "string" ? body.make.trim() : "";
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!description) {
    return NextResponse.json({ ok: false, error: "Description required" }, { status: 400 });
  }

  const client = new Anthropic();
  const vehicle = [year, make, model].filter(Boolean).join(" ");

  try {
    // Generate a detailed image prompt
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate a detailed, photorealistic image prompt for:
${vehicle ? `${vehicle} with ` : ""}${description}
The prompt should describe: lighting, angle, environment, modifications visible.
Keep it under 200 words. Start directly with the scene description. No preamble.`,
        },
      ],
    });

    const prompt = message.content[0]?.type === "text" ? message.content[0].text.trim() : description;

    // Generate image via Pollinations.ai (free, no key needed)
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 500));
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&model=flux&nologo=true`;

    return NextResponse.json({
      ok: true,
      imageUrl,
      prompt,
      vehicle: vehicle || "Custom",
    });
  } catch (error) {
    console.error("[imagine-auto/visualize] Error:", error);
    return NextResponse.json({ ok: false, error: "Visualization failed" }, { status: 500 });
  }
}

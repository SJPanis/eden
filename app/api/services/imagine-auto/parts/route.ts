import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

function cleanClaudeText(content: Anthropic.ContentBlock[]): string {
  const allText = content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return allText
    .replace(/<cite[^>]*>([^<]*)<\/cite>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const year = typeof body?.year === "string" ? body.year.trim() : "";
  const make = typeof body?.make === "string" ? body.make.trim() : "";
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const part = typeof body?.part === "string" ? body.part.trim() : "";

  if (!year || !make || !model || !part) {
    return NextResponse.json({ ok: false, error: "year, make, model, and part are required" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are an automotive parts expert. Search the web for real, currently available parts. Return structured data only. No HTML tags in your response.",
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Find real OEM and aftermarket parts for: ${year} ${make} ${model}
Part needed: ${part}

Search for actual available parts from RockAuto, AutoZone, Advance Auto, O'Reilly, or eBay Motors. Return ONLY this JSON array (no other text, no markdown fences):
[
  {
    "name": "part name",
    "brand": "brand name",
    "partNumber": "actual part number",
    "price": "price in USD",
    "condition": "New/OEM/Aftermarket/Remanufactured",
    "source": "RockAuto/AutoZone/etc",
    "notes": "fitment notes"
  }
]
Return 3-6 real parts. If you cannot find real data, return the text SEARCH_FAILED.`,
        },
      ],
    });

    const clean = cleanClaudeText(message.content);

    if (clean.includes("SEARCH_FAILED")) {
      return NextResponse.json({ ok: false, error: "Could not find parts for this vehicle" });
    }

    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[imagine-auto/parts] No JSON array found in response:", clean.slice(0, 500));
      return NextResponse.json({ ok: false, error: "Could not parse parts data" });
    }

    const parts = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, parts, vehicle: `${year} ${make} ${model}`, partSearched: part });
  } catch (error) {
    console.error("[imagine-auto/parts] Error:", error);
    return NextResponse.json({ ok: false, error: "Parts search failed" }, { status: 500 });
  }
}

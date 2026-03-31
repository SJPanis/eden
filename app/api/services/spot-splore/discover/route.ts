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
  const vibe = typeof body?.vibe === "string" ? body.vibe.trim() : "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";

  if (!vibe) {
    return NextResponse.json({ ok: false, error: "Describe your vibe" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: "You are a music and culture curator. Find real, specific music and real places. Never make up song names or artists. Search for accurate information.",
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Find music and places that match this vibe: "${vibe}"
Location context: ${location || "anywhere"}

Search for real songs and artists that match this energy.
Search for real places (if location given) that match this vibe.

Return ONLY this JSON (no other text):
{
  "vibe": "${vibe}",
  "moodScore": 0-100,
  "tracks": [
    { "title": "real song name", "artist": "real artist name", "year": 2024, "why": "one sentence explaining why this matches" }
  ],
  "artists": ["artist 1", "artist 2", "artist 3"],
  "places": [
    { "name": "real place name", "type": "cafe/bar/park/venue", "vibe": "short description", "address": "if known" }
  ],
  "playlist_name": "creative name for this collection",
  "spotify_search": "search query to use on Spotify to find similar music"
}
Return 4-6 tracks, 3 artists, 3-5 places.`,
        },
      ],
    });

    const textBlocks = message.content.filter((b) => b.type === "text");
    const raw = textBlocks.map((b) => b.text).join("\n");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: "Could not generate discovery results" });
    }

    const discovery = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, discovery });
  } catch (error) {
    console.error("[spot-splore/discover] Error:", error);
    return NextResponse.json({ ok: false, error: "Discovery failed" }, { status: 500 });
  }
}

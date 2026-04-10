import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!query && !category) {
    return NextResponse.json({ ok: false, error: "Query or category is required" }, { status: 400 });
  }

  const searchTerm = category
    ? `${category} for sale from licensed breeder`
    : query;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are SimonOS, an exotic pet marketplace search assistant. Search for real exotic animal listings from TRUSTED, LICENSED breeders and sellers only. Only include sellers who appear to be licensed/professional breeders or established exotic pet stores. Do NOT include random classifieds, Craigslist, or unlicensed sellers. Trusted sources include: MorphMarket, Underground Reptiles, Backwater Reptiles, XYZ Reptiles, BHB Reptiles, Snakes at Sunset, LLL Reptile, Josh's Frogs, and similar established exotic pet sellers.`,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search for: "${searchTerm}" and return listings as JSON.

Return ONLY a JSON array (no markdown, no explanation):
[{"seller":"Store/Breeder Name","species":"Common Name (Scientific Name)","morph":"Morph/Variety if applicable","price":"$XX.XX","location":"City, State","photoUrl":"https://...","sourceUrl":"https://...","trustedSeller":true}]

Return up to 6 real listings from trusted/licensed sellers. If nothing found, return [].`,
        },
      ],
    });

    const clean = cleanClaudeText(message.content);
    const jsonMatch = clean.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ ok: true, listings: [], query: searchTerm });
    }

    type RawListing = {
      seller?: string;
      species?: string;
      morph?: string;
      price?: string;
      location?: string;
      photoUrl?: string;
      sourceUrl?: string;
      trustedSeller?: boolean;
    };

    const raw = JSON.parse(jsonMatch[0]) as RawListing[];

    // Filter to only trusted sellers
    const listings = raw
      .filter((l) => l.trustedSeller !== false)
      .map((l) => ({
        seller: l.seller ?? "Unknown Seller",
        species: l.species ?? "Unknown Species",
        morph: l.morph ?? "",
        price: l.price ?? "Contact for price",
        location: l.location ?? "Unknown",
        photoUrl: l.photoUrl ?? "",
        sourceUrl: l.sourceUrl ?? "",
        trustedSeller: true,
      }));

    return NextResponse.json({ ok: true, listings, query: searchTerm });
  } catch (error) {
    console.error("[simonos/search] Error:", error);
    return NextResponse.json({ ok: false, error: "Search failed" }, { status: 500 });
  }
}

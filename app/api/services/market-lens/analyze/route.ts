import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_TYPES = new Set(["technical", "fundamental", "sentiment", "full"]);

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
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const analysisType = typeof body?.analysisType === "string" && VALID_TYPES.has(body.analysisType)
    ? body.analysisType
    : "full";

  if (!ticker || ticker.length > 10) {
    return NextResponse.json({ ok: false, error: "Valid ticker symbol required" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: "You are a professional financial analyst with access to real-time market data. Search for current, accurate data. Never fabricate numbers. Always cite your sources.",
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Perform a ${analysisType} analysis of ${ticker}.

Search for:
1. Current price and today's change
2. 52-week high and low
3. Volume vs average volume
4. Recent news (last 7 days)
5. Key financial metrics (P/E, market cap, revenue growth)
6. Analyst consensus and price targets
7. Technical indicators (RSI, moving averages if visible)

Return ONLY this JSON (no other text):
{
  "ticker": "${ticker}",
  "companyName": "full name",
  "currentPrice": 0.00,
  "change": 0.00,
  "changePercent": 0.00,
  "marketCap": "e.g. $2.1T",
  "peRatio": 0.00,
  "week52High": 0.00,
  "week52Low": 0.00,
  "analystTarget": 0.00,
  "analystConsensus": "Buy/Hold/Sell",
  "sentiment": "Bullish/Bearish/Neutral",
  "outlook": "Paragraph with real analysis and specific data points. 3-4 sentences. No HTML tags.",
  "risks": ["risk 1", "risk 2", "risk 3"],
  "catalysts": ["catalyst 1", "catalyst 2"],
  "dataAsOf": "${new Date().toISOString()}"
}`,
        },
      ],
    });

    const clean = cleanClaudeText(message.content);
    const jsonMatch = clean.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[market-lens/analyze] No JSON found in response:", clean.slice(0, 500));
      return NextResponse.json({ ok: false, error: "Could not analyze this ticker" });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Clean any cite tags from string fields
    if (typeof analysis.outlook === "string") {
      analysis.outlook = analysis.outlook
        .replace(/<cite[^>]*>([^<]*)<\/cite>/g, "$1")
        .replace(/<[^>]+>/g, "");
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    console.error("[market-lens/analyze] Error:", error);
    return NextResponse.json({ ok: false, error: "Analysis failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KNOWN_SERVICES = new Set(["imagine-auto", "market-lens", "spot-splore"]);

const SERVICE_NAMES: Record<string, string> = {
  "imagine-auto": "Imagine Auto",
  "market-lens": "Market Lens",
  "spot-splore": "Spot Splore",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;

  if (!KNOWN_SERVICES.has(serviceId)) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }

  const origin = process.env.NEXTAUTH_URL ?? "https://edencloud.app";
  const embedUrl = `${origin}/embed/${serviceId}`;
  const name = SERVICE_NAMES[serviceId] ?? serviceId;

  const html = `<iframe src="${embedUrl}" style="width:100%;height:600px;border:none;border-radius:12px;" allow="payment" title="${name} — Powered by Eden"></iframe>`;

  return NextResponse.json({
    ok: true,
    html,
    embedUrl,
    instructions: `Paste this anywhere on your site to embed ${name}. Users can pay with Eden Leafs or card directly in the embed.`,
  });
}

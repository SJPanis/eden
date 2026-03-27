import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SERVICE_REGISTRY: Record<string, { name: string; leafCost: number; description: string }> = {
  "imagine-auto": {
    name: "Imagine Auto",
    leafCost: 10,
    description: "AI-powered automotive parts finder, visualizer, and diagnostic tool",
  },
  "market-lens": {
    name: "Market Lens",
    leafCost: 15,
    description: "Real-time market intelligence and trend analysis",
  },
  "spot-splore": {
    name: "Spot Splore",
    leafCost: 10,
    description: "Location-based discovery and constellation mapping",
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const service = SERVICE_REGISTRY[serviceId];

  if (!service) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }

  const origin = process.env.NEXTAUTH_URL ?? "https://edencloud.app";

  return NextResponse.json({
    ok: true,
    serviceId,
    serviceName: service.name,
    embedUrl: `${origin}/embed/${serviceId}`,
    allowedOrigins: ["*"],
    leafCost: service.leafCost,
    description: service.description,
  });
}

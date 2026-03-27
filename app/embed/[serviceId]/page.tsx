import { notFound } from "next/navigation";
import { EmbedServiceClient } from "./embed-client";

const KNOWN_SERVICES = new Set(["imagine-auto", "market-lens", "spot-splore"]);

const SERVICE_META: Record<string, { name: string; leafCost: number; description: string }> = {
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

export default async function EmbedServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;

  if (!KNOWN_SERVICES.has(serviceId)) {
    notFound();
  }

  const meta = SERVICE_META[serviceId];

  return <EmbedServiceClient serviceId={serviceId} meta={meta} />;
}

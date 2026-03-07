import type { EdenRoute, EdenRouteConfidence, EdenRouteDecision } from "@/modules/eden-ai/eden-types";

const routeSignals: Record<EdenRoute, string[]> = {
  service_search: [
    "service",
    "services",
    "help",
    "find",
    "book",
    "support",
    "wellness",
    "coach",
  ],
  business_discovery: [
    "business",
    "businesses",
    "company",
    "provider",
    "studio",
    "local",
    "shop",
    "agency",
  ],
  idea_generation: [
    "build",
    "idea",
    "create",
    "start",
    "launch",
    "app",
    "concept",
    "prototype",
  ],
};

export function routePrompt(prompt: string): EdenRouteDecision {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const matchedRoutes: EdenRoute[] = [];
  const signals: string[] = [];

  for (const [route, keywords] of Object.entries(routeSignals) as Array<[EdenRoute, string[]]>) {
    const matchedKeyword = keywords.find((keyword) => normalizedPrompt.includes(keyword));
    if (matchedKeyword) {
      matchedRoutes.push(route);
      signals.push(matchedKeyword);
    }
  }

  if (matchedRoutes.length === 0) {
    return {
      routes: ["service_search", "business_discovery", "idea_generation"],
      confidence: "low",
      signals: ["broad_discovery"],
    };
  }

  return {
    routes: matchedRoutes,
    confidence: resolveConfidence(matchedRoutes.length),
    signals,
  };
}

function resolveConfidence(routeCount: number): EdenRouteConfidence {
  if (routeCount >= 3) {
    return "high";
  }

  if (routeCount === 2) {
    return "medium";
  }

  return "low";
}

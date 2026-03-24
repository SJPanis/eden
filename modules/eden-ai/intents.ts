import type {
  EdenAiConfidence,
  EdenAiRouteLane,
} from "@/modules/eden-ai/types";

export type EdenAiIntentDecision = {
  lanes: EdenAiRouteLane[];
  confidence: EdenAiConfidence;
  signals: string[];
};

const laneSignals: Record<EdenAiRouteLane, string[]> = {
  service_search: [
    "find",
    "service",
    "services",
    "search",
    "browse",
    "recommend",
    "need",
    "use",
  ],
  business_discovery: [
    "business",
    "company",
    "studio",
    "agency",
    "innovator",
    "publisher",
  ],
  idea_generation: [
    "idea",
    "launch",
    "concept",
    "generate",
    "brainstorm",
    "make",
  ],
  project_build: [
    "build",
    "project",
    "agent",
    "workflow",
    "automation",
    "create",
  ],
  service_run_help: [
    "run",
    "execute",
    "use",
    "price",
    "cost",
    "afford",
  ],
  wallet_help: [
    "wallet",
    "balance",
    "leaf",
    "leaves",
    "top up",
    "top-up",
    "buy",
  ],
  platform_status: [
    "status",
    "health",
    "platform",
    "available",
    "published",
    "live",
  ],
};

export function classifyEdenAiPrompt(prompt: string): EdenAiIntentDecision {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const rankedLanes = Object.entries(laneSignals)
    .map(([lane, signals]) => {
      const matchedSignals = signals.filter((signal) => normalizedPrompt.includes(signal));
      return {
        lane: lane as EdenAiRouteLane,
        matchedSignals,
        score: matchedSignals.length,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (rankedLanes.length === 0) {
    return {
      lanes: ["service_search"],
      confidence: "low",
      signals: ["broad_discovery"],
    };
  }

  const lanes = rankedLanes.slice(0, 3).map((entry) => entry.lane);
  const uniqueSignals = rankedLanes.flatMap((entry) => entry.matchedSignals);

  if (
    lanes.includes("project_build") &&
    !lanes.includes("idea_generation") &&
    normalizedPrompt.includes("agent")
  ) {
    lanes.push("idea_generation");
  }

  if (
    lanes.includes("service_search") &&
    !lanes.includes("wallet_help") &&
    /(price|cost|afford|wallet|balance|leaf|leaves)/.test(normalizedPrompt)
  ) {
    lanes.push("wallet_help");
  }

  return {
    lanes,
    confidence: resolveConfidence(rankedLanes, normalizedPrompt),
    signals: Array.from(new Set(uniqueSignals)).slice(0, 6),
  };
}

function resolveConfidence(
  rankedLanes: Array<{ score: number }>,
  normalizedPrompt: string,
): EdenAiConfidence {
  if (rankedLanes[0]?.score >= 2) {
    return "high";
  }

  if (normalizedPrompt.split(/\s+/).length >= 6) {
    return "medium";
  }

  return "low";
}

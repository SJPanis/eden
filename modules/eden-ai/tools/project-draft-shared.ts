import type {
  EdenAiGroundingMode,
  EdenAiProjectArtifact,
  EdenAiSuggestedAgent,
} from "@/modules/eden-ai/types";

const projectStopWords = new Set([
  "a",
  "an",
  "and",
  "agent",
  "ai",
  "an",
  "autonomously",
  "build",
  "business",
  "create",
  "for",
  "make",
  "me",
  "that",
  "the",
  "them",
  "then",
  "use",
  "with",
]);

export function buildProjectArtifactFromPrompt(input: {
  prompt: string;
  groundingMode: EdenAiGroundingMode;
  created?: boolean;
  projectId?: string | null;
  businessId?: string | null;
  statusLabel?: string;
  detail?: string;
}): EdenAiProjectArtifact {
  const titleSeed = extractProjectTitleSeed(input.prompt);
  const title = `${titleSeed} Operator`;
  const focusArea = inferFocusArea(input.prompt);
  const suggestedAgents = buildSuggestedAgents(input.prompt);

  return {
    id: slugify(title),
    projectId: input.projectId ?? null,
    businessId: input.businessId ?? null,
    title,
    description: `A scoped Eden project for ${focusArea} with agent-driven execution inside the current business workspace.`,
    goal: `Turn ${focusArea} into a repeatable project workflow that can be tested and operated inside Eden.`,
    statusLabel: input.statusLabel ?? (input.created ? "Project created" : "Proposed project"),
    detail:
      input.detail ??
      (input.created
        ? "Eden created this project in the Business workspace and staged the initial agent structure."
        : "Eden can stage this project in the Business workspace once a builder context is available."),
    groundingMode: input.groundingMode,
    created: input.created ?? false,
    suggestedAgents,
  };
}

function buildSuggestedAgents(prompt: string): EdenAiSuggestedAgent[] {
  const normalizedPrompt = prompt.toLowerCase();
  const agents: EdenAiSuggestedAgent[] = [];

  if (normalizedPrompt.includes("competitor")) {
    agents.push({
      name: "Competitor Scout",
      roleTitle: "Research Agent",
      instructions:
        "Review competitor content, summarize patterns, and extract reusable creative prompts for the rest of the project.",
      branchLabel: "research",
    });
  }

  if (normalizedPrompt.includes("video")) {
    agents.push({
      name: "Video Generation Operator",
      roleTitle: "Creative Agent",
      instructions:
        "Turn the approved creative direction into concise video generation prompts and production-ready outputs.",
      branchLabel: "creative",
    });
  }

  if (normalizedPrompt.includes("marketing")) {
    agents.push({
      name: "Growth Planner",
      roleTitle: "Strategy Agent",
      instructions:
        "Define the go-to-market angle, audience framing, and publish cadence for the project outputs.",
      branchLabel: "strategy",
    });
  }

  if (agents.length === 0) {
    agents.push({
      name: "Project Operator",
      roleTitle: "General Agent",
      instructions:
        "Break the project goal into a small sequence of repeatable tasks and return grounded next steps for the Eden workspace.",
      branchLabel: "ops",
    });
  }

  return agents.slice(0, 3);
}

function extractProjectTitleSeed(prompt: string) {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !projectStopWords.has(word))
    .slice(0, 3);

  if (words.length === 0) {
    return "Eden";
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function inferFocusArea(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("marketing")) {
    return "marketing execution";
  }

  if (normalizedPrompt.includes("video")) {
    return "video operations";
  }

  if (normalizedPrompt.includes("sales")) {
    return "sales enablement";
  }

  return "business automation";
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

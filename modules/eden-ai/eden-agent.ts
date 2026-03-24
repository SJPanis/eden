import { routePrompt } from "@/modules/eden-ai/eden-router";
import type {
  EdenAgentOutputs,
  EdenAgentRequest,
  EdenAgentResponse,
  EdenBusinessResult,
  EdenWorkspaceAssistantChecklistSuggestion,
  EdenGeneratedServiceDraft,
  EdenIdeaResult,
  EdenModelAdapter,
  EdenRouteDecision,
  EdenServiceDraftRequest,
  EdenServiceDraftResponse,
  EdenServiceResult,
  EdenWorkspaceAssistantContext,
  EdenWorkspaceAssistantOutput,
  EdenWorkspaceAssistantRequest,
  EdenWorkspaceAssistantResponse,
} from "@/modules/eden-ai/eden-types";
import {
  type EdenDiscoverySnapshot,
  type EdenMockBusiness,
  getBusinessById,
  getBusinessForService,
  getAskEdenBusinessMatches,
  getAskEdenRecommendedServices,
  getAskEdenRelevantProjects,
  getServiceById,
  inferDiscoveryCategory,
} from "@/modules/core/mock-data";

const simulatedDelayMs = 450;
const serviceBuilderStopWords = new Set([
  "a",
  "an",
  "and",
  "assistant",
  "app",
  "agent",
  "automation",
  "business",
  "concept",
  "copilot",
  "create",
  "for",
  "generate",
  "idea",
  "launch",
  "my",
  "service",
  "something",
  "the",
  "tool",
  "want",
  "workflow",
  "with",
]);
const routeTagMap: Record<string, string> = {
  service_search: "Consumer ready",
  business_discovery: "Business ops",
  idea_generation: "Launch prep",
};
const categoryServiceSuffixVariants: Record<
  string,
  {
    standard: string[];
    automation: string[];
  }
> = {
  Productivity: {
    standard: ["Workflow Studio", "Planning System", "Momentum Suite"],
    automation: ["Copilot", "Automation Desk", "Ops Engine"],
  },
  Wellness: {
    standard: ["Reset Program", "Ritual Plan", "Recovery Studio"],
    automation: ["Guide", "Care Copilot", "Recovery Engine"],
  },
  Learning: {
    standard: ["Sprint Lab", "Learning Track", "Workshop Studio"],
    automation: ["Coach", "Feedback Copilot", "Skill Engine"],
  },
  Home: {
    standard: ["Setup Service", "Home Flow", "Operations Plan"],
    automation: ["Assist", "Home Copilot", "Setup Engine"],
  },
};
const categoryOutcomeVariants: Record<string, string[]> = {
  Productivity: [
    "a repeatable weekly operating rhythm",
    "clear planning structure with visible momentum",
    "a faster path from intent to follow-through",
  ],
  Wellness: [
    "a calmer recovery routine with consistent check-ins",
    "simple guided rituals that fit daily energy shifts",
    "steady reset support with low-friction follow-through",
  ],
  Learning: [
    "practical skill gains with visible next steps",
    "clear progress through guided learning milestones",
    "a focused path from theory to output",
  ],
  Home: [
    "simpler household operations with less manual overhead",
    "a cleaner setup flow for home systems and routines",
    "clearer home management with visible task ownership",
  ],
};
const categoryPositioningVariants: Record<string, string[]> = {
  Productivity: [
    "positioned as a premium execution layer",
    "framed as a lightweight innovator offer",
    "shaped as a repeatable team or solo workflow product",
  ],
  Wellness: [
    "positioned as a supportive guided-care offer",
    "framed as a calm premium ritual package",
    "shaped as a consistent recovery experience",
  ],
  Learning: [
    "positioned as a structured capability sprint",
    "framed as a practical creator learning product",
    "shaped as a short, outcome-driven education offer",
  ],
  Home: [
    "positioned as an operations-focused home service",
    "framed as a setup and systems package",
    "shaped as a guided support offer for daily life",
  ],
};
const automationModeVariants = [
  "prompt intake, structured recommendations, and next-step automation suggestions",
  "guided workflows, AI-assisted recommendations, and publish-prep automation",
  "intake triage, lightweight copilots, and repeated task orchestration",
];
const variantSignalTags = ["Variant One", "Variant Two", "Variant Three"];

class SimulatedEdenAdapter implements EdenModelAdapter {
  async generate(
    request: EdenAgentRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenAgentResponse> {
    await wait(simulatedDelayMs);

    const outputs = createPlatformOutputs(
      request.prompt,
      routeDecision,
      request.discoverySnapshot,
    );

    return {
      summary: `Ask Eden routed your prompt into ${routeDecision.routes.length} discovery lane(s) using Eden's shared platform catalog.`,
      outputs,
      routeDecision,
      generatedAt: new Date().toISOString(),
      provider: "eden-simulated-router",
    };
  }

  async generateServiceDraft(
    request: EdenServiceDraftRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenServiceDraftResponse> {
    await wait(simulatedDelayMs);

    const draft = createServiceDraftOutput(request, routeDecision);
    const businessLabel = request.context?.businessName ?? "the active Eden workspace";
    const variantIndex = request.variantIndex ?? 0;

    return {
      summary: `Ask Eden generated variant ${variantIndex + 1} for ${businessLabel} using ${routeDecision.routes.length} routed lane(s).`,
      draft,
      variantIndex,
      routeDecision,
      generatedAt: new Date().toISOString(),
      provider: "eden-simulated-router",
    };
  }

  async generateWorkspaceAssistant(
    request: EdenWorkspaceAssistantRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenWorkspaceAssistantResponse> {
    await wait(simulatedDelayMs);

    const output = createWorkspaceAssistantOutput(request, routeDecision);

    return {
      action: request.action,
      summary: output.summary,
      output,
      routeDecision,
      generatedAt: new Date().toISOString(),
      provider: "eden-simulated-router",
    };
  }
}

export class EdenAgent {
  private readonly adapter: EdenModelAdapter;

  constructor(adapter?: EdenModelAdapter) {
    this.adapter = adapter ?? new SimulatedEdenAdapter();
  }

  async ask(request: EdenAgentRequest): Promise<EdenAgentResponse> {
    const routeDecision = routePrompt(request.prompt);
    return this.adapter.generate(request, routeDecision);
  }

  async generateServiceDraft(
    request: EdenServiceDraftRequest,
  ): Promise<EdenServiceDraftResponse> {
    const routeDecision = routePrompt(request.prompt);
    return this.adapter.generateServiceDraft(request, routeDecision);
  }

  async runBusinessAssistant(
    request: EdenWorkspaceAssistantRequest,
  ): Promise<EdenWorkspaceAssistantResponse> {
    const routeDecision = routePrompt(request.prompt);
    return this.adapter.generateWorkspaceAssistant(request, routeDecision);
  }
}

export function createEdenAgent(adapter?: EdenModelAdapter) {
  return new EdenAgent(adapter);
}

function createPlatformOutputs(
  prompt: string,
  routeDecision: EdenRouteDecision,
  discoverySnapshot?: EdenDiscoverySnapshot,
): EdenAgentOutputs {
  const snapshot = discoverySnapshot;
  const canonicalServices = getAskEdenRecommendedServices(prompt, 3, snapshot);
  const canonicalBusinesses = getConnectedBusinessMatches(prompt, canonicalServices, snapshot);

  return {
    recommendedServices: canonicalServices.map(mapServiceResult),
    businessMatches: canonicalBusinesses.map(mapBusinessResult),
    ideasToBuild: buildIdeaOutputs(
      prompt,
      routeDecision,
      canonicalServices,
      canonicalBusinesses,
      snapshot,
    ),
  };
}

function mapServiceResult(service: {
  id: string;
  title: string;
  category: string;
  description: string;
}): EdenServiceResult {
  return {
    id: service.id,
    title: service.title,
    category: service.category,
    description: service.description,
    actionLabel: "View",
  };
}

function mapBusinessResult(business: {
  id: string;
  name: string;
  tags: string[];
  summary: string;
}): EdenBusinessResult {
  return {
    id: business.id,
    name: business.name,
    tags: business.tags,
    summary: business.summary,
    actionLabel: "Open",
  };
}

function getConnectedBusinessMatches(
  prompt: string,
  canonicalServices: Array<{ id: string }>,
  snapshot?: EdenDiscoverySnapshot,
): Array<{
  id: string;
  name: string;
  tags: string[];
  summary: string;
}> {
  const rankedBusinesses = getAskEdenBusinessMatches(prompt, 4, snapshot);
  const relatedBusinesses = canonicalServices
    .map((service) => findBusinessForService(service.id, snapshot))
    .filter((business): business is EdenMockBusiness => Boolean(business));
  const mergedBusinesses = [...relatedBusinesses, ...rankedBusinesses];
  const uniqueBusinesses = new Map<string, (typeof mergedBusinesses)[number]>();

  for (const business of mergedBusinesses) {
    if (!uniqueBusinesses.has(business.id)) {
      uniqueBusinesses.set(business.id, business);
    }
  }

  return Array.from(uniqueBusinesses.values()).slice(0, 3);
}

function buildIdeaOutputs(
  prompt: string,
  routeDecision: EdenRouteDecision,
  canonicalServices: Array<{ id: string; title: string; category: string }>,
  canonicalBusinesses: Array<{ id: string; name: string; category?: string }>,
  snapshot?: EdenDiscoverySnapshot,
): EdenIdeaResult[] {
  const promptTopic = extractTopic(prompt);
  const relatedProjects = getAskEdenRelevantProjects(prompt, 3, snapshot);
  const primaryService = canonicalServices[0]
    ? findServiceById(canonicalServices[0].id, snapshot)
    : null;
  const primaryServiceBusiness = primaryService
    ? findBusinessForService(primaryService.id, snapshot)
    : null;
  const primaryBusiness = canonicalBusinesses[0]
    ? findBusinessById(canonicalBusinesses[0].id, snapshot)
    : primaryServiceBusiness;
  const projectIdeas = relatedProjects.map((project) => {
    const projectBusiness = findBusinessById(project.businessId, snapshot);

    return {
      id: `idea-${project.id}`,
      title: `${project.title} Launch Sprint`,
      description: `Start a workspace around ${project.title.toLowerCase()} for ${projectBusiness?.name ?? "this business"}, then use Eden's build, test, and publish pipeline to validate the offer.`,
      actionLabel: "Start Building" as const,
    };
  });
  const connectedIdeas: EdenIdeaResult[] = [];

  if (primaryService && primaryServiceBusiness) {
    connectedIdeas.push({
      id: `idea-${primaryService.id}-workspace`,
      title: `${primaryService.title} Innovator Extension`,
      description: `Turn ${primaryService.title} into a deeper Eden workspace flow for ${primaryServiceBusiness.name}, with AI-assisted copy, Eden Leaves visibility, and publish preparation.`,
      actionLabel: "Start Building",
    });
  }

  if (primaryBusiness) {
    const featuredService = findServiceById(primaryBusiness.featuredServiceId, snapshot);
    connectedIdeas.push({
      id: `idea-${primaryBusiness.id}-growth`,
      title: `${primaryBusiness.category} Membership Path`,
      description: `Prototype a new ${primaryBusiness.category.toLowerCase()} offer around ${featuredService?.title ?? primaryBusiness.name} and stage it inside the Business Dashboard for testing and publish review.`,
      actionLabel: "Start Building",
    });
  }

  connectedIdeas.push(...projectIdeas);

  if (!connectedIdeas.length) {
    connectedIdeas.push(
      {
        id: `idea-${promptTopic.toLowerCase().replace(/\s+/g, "-")}-innovator`,
        title: `${promptTopic} Innovator Sprint`,
        description:
          "Open the Business Dashboard to turn this discovery path into a mocked workspace concept with projects, billing, AI actions, and publish checkpoints.",
        actionLabel: "Start Building",
      },
      {
        id: `idea-${promptTopic.toLowerCase().replace(/\s+/g, "-")}-service`,
        title: `${promptTopic} Service Packaging`,
        description:
          "Bundle a new service concept, validate the positioning, and walk it through Eden's staged build and publish flow.",
        actionLabel: "Start Building",
      },
    );
  }

  if (!routeDecision.routes.includes("idea_generation")) {
    connectedIdeas.push({
      id: `idea-${promptTopic.toLowerCase().replace(/\s+/g, "-")}-workspace`,
      title: `${promptTopic} Workspace Prototype`,
      description:
        "Ask Eden kept the build lane lightweight, but this mock concept is ready to continue inside the Business Dashboard.",
      actionLabel: "Start Building",
    });
  }

  const uniqueIdeas = new Map<string, EdenIdeaResult>();

  for (const idea of connectedIdeas) {
    if (!uniqueIdeas.has(idea.id)) {
      uniqueIdeas.set(idea.id, idea);
    }
  }

  return Array.from(uniqueIdeas.values()).slice(0, 3);
}

function createServiceDraftOutput(
  request: EdenServiceDraftRequest,
  routeDecision: EdenRouteDecision,
): EdenGeneratedServiceDraft {
  const prompt = request.prompt.trim();
  const snapshot = request.discoverySnapshot;
  const context = request.context;
  const variantIndex = request.variantIndex ?? 0;
  const relatedServices = getAskEdenRecommendedServices(prompt, 2, snapshot);
  const relatedBusinesses = getConnectedBusinessMatches(prompt, relatedServices, snapshot);
  const relatedProjects = getAskEdenRelevantProjects(prompt, 2, snapshot);
  const inferredCategory =
    inferDiscoveryCategory(prompt) ??
    context?.defaultCategory ??
    relatedServices[0]?.category ??
    findBusinessById(relatedBusinesses[0]?.id ?? "", snapshot)?.category ??
    "Productivity";
  const builderTopic = extractBuilderTopic(
    prompt,
    context?.activeServiceName,
    relatedServices[0]?.title,
    relatedProjects[0]?.title,
  );
  const automationLed = isAutomationPrompt(prompt);
  const serviceName = buildGeneratedServiceName(
    builderTopic,
    inferredCategory,
    automationLed,
    variantIndex,
  );
  const businessLabel =
    context?.businessName ??
    findBusinessById(relatedBusinesses[0]?.id ?? "", snapshot)?.name ??
    "this Eden workspace";
  const pricingModel = choosePricingPlaceholder(prompt, inferredCategory, variantIndex);
  const automationSummary = buildAutomationSummary(
    serviceName,
    routeDecision,
    relatedProjects[0]?.title,
    automationLed,
    variantIndex,
  );

  return {
    name: serviceName,
    description: buildGeneratedDescription({
      serviceName,
      businessLabel,
      category: inferredCategory,
      promptTopic: builderTopic,
      relatedServiceTitle: relatedServices[0]?.title,
      relatedProjectTitle: relatedProjects[0]?.title,
      automationLed,
      variantIndex,
    }),
    category: inferredCategory,
    suggestedTags: buildSuggestedTags(
      inferredCategory,
      prompt,
      routeDecision,
      context?.defaultTags ?? [],
      automationLed,
      variantIndex,
    ),
    pricingModel,
    automationSummary,
  };
}

function createWorkspaceAssistantOutput(
  request: EdenWorkspaceAssistantRequest,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantOutput {
  if (request.action === "generate_description") {
    return buildGenerateDescriptionOutput(request.context, routeDecision);
  }

  if (request.action === "suggest_improvements") {
    return buildSuggestImprovementsOutput(request.context, routeDecision);
  }

  if (request.action === "prepare_for_publish") {
    return buildPrepareForPublishOutput(request.context, routeDecision);
  }

  return buildPackagingVariantOutput(request, routeDecision);
}

function findServiceById(id: string, snapshot?: EdenDiscoverySnapshot) {
  return snapshot?.serviceCatalog.find((service) => service.id === id) ?? getServiceById(id);
}

function findBusinessById(id: string, snapshot?: EdenDiscoverySnapshot) {
  return snapshot?.businessCatalog.find((business) => business.id === id) ?? getBusinessById(id);
}

function findBusinessForService(serviceId: string, snapshot?: EdenDiscoverySnapshot) {
  const service = findServiceById(serviceId, snapshot);

  return service
    ? findBusinessById(service.businessId, snapshot) ?? getBusinessForService(service)
    : null;
}

function extractTopic(prompt: string) {
  const normalizedPrompt = prompt
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");

  if (!normalizedPrompt) {
    return "Eden";
  }

  const words = normalizedPrompt.split(" ").filter(Boolean);
  const selected = words.slice(0, 2).join(" ");
  return toTitleCase(selected);
}

function toTitleCase(input: string) {
  return input
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractBuilderTopic(
  prompt: string,
  activeServiceName?: string,
  relatedServiceTitle?: string,
  relatedProjectTitle?: string,
) {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !serviceBuilderStopWords.has(token));
  const selectedTokens = Array.from(new Set(tokens)).slice(0, 2);

  if (selectedTokens.length) {
    return toTitleCase(selectedTokens.join(" "));
  }

  return relatedProjectTitle ?? relatedServiceTitle ?? activeServiceName ?? "Eden Service";
}

function buildGeneratedServiceName(
  builderTopic: string,
  category: string,
  automationLed: boolean,
  variantIndex: number,
) {
  const suffixSet =
    categoryServiceSuffixVariants[category] ?? categoryServiceSuffixVariants.Productivity;
  const suffixOptions = automationLed ? suffixSet.automation : suffixSet.standard;
  const suffix = suffixOptions[variantIndex % suffixOptions.length] ?? suffixOptions[0];

  if (builderTopic.toLowerCase().includes(suffix.toLowerCase())) {
    return builderTopic;
  }

  return `${builderTopic} ${suffix}`;
}

function buildGeneratedDescription(options: {
  serviceName: string;
  businessLabel: string;
  category: string;
  promptTopic: string;
  relatedServiceTitle?: string;
  relatedProjectTitle?: string;
  automationLed: boolean;
  variantIndex: number;
}) {
  const {
    serviceName,
    businessLabel,
    category,
    promptTopic,
    relatedServiceTitle,
    relatedProjectTitle,
    automationLed,
    variantIndex,
  } = options;
  const outcomeOptions =
    categoryOutcomeVariants[category] ?? categoryOutcomeVariants.Productivity;
  const positioningOptions =
    categoryPositioningVariants[category] ?? categoryPositioningVariants.Productivity;
  const outcome = outcomeOptions[variantIndex % outcomeOptions.length] ?? outcomeOptions[0];
  const positioning =
    positioningOptions[variantIndex % positioningOptions.length] ?? positioningOptions[0];
  const automationPhrase = automationLed
    ? "It leans into a mocked AI-assisted workflow with structured automation support."
    : "It keeps the experience lightweight while still fitting Eden's AI-assisted innovator flow.";
  const relatedServicePhrase = relatedServiceTitle
    ? ` The offer is positioned to sit alongside ${relatedServiceTitle} without duplicating it.`
    : "";
  const projectPhrase = relatedProjectTitle
    ? ` ${relatedProjectTitle} can act as the first launch project for testing and publish review.`
    : "";

  return `${serviceName} is a mocked ${category.toLowerCase()} service for ${businessLabel} that turns ${promptTopic.toLowerCase()} into ${outcome}. It is ${positioning}. ${automationPhrase}${relatedServicePhrase}${projectPhrase} The draft is structured to move cleanly through Eden's draft, testing, ready, and published pipeline.`;
}

function buildSuggestedTags(
  category: string,
  prompt: string,
  routeDecision: EdenRouteDecision,
  defaultTags: string[],
  automationLed: boolean,
  variantIndex: number,
) {
  const promptTags = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !serviceBuilderStopWords.has(token))
    .slice(0, 3)
    .map((token) => toTitleCase(token));
  const routeTags = routeDecision.routes.map((route) => routeTagMap[route]).filter(Boolean);

  return Array.from(
    new Set([
      category,
      ...defaultTags.slice(0, 2),
      ...promptTags,
      ...(automationLed ? ["AI workflow"] : ["Service packaging"]),
      ...routeTags,
      variantSignalTags[variantIndex % variantSignalTags.length] ?? variantSignalTags[0],
    ]),
  ).slice(0, 5);
}

function choosePricingPlaceholder(prompt: string, category: string, variantIndex: number) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("subscription") || normalizedPrompt.includes("membership")) {
    return "Subscription";
  }

  if (
    normalizedPrompt.includes("automation") ||
    normalizedPrompt.includes("tool") ||
    normalizedPrompt.includes("assistant") ||
    normalizedPrompt.includes("copilot")
  ) {
    return "Usage-based";
  }

  if (
    normalizedPrompt.includes("course") ||
    normalizedPrompt.includes("learning") ||
    normalizedPrompt.includes("workshop") ||
    normalizedPrompt.includes("cohort")
  ) {
    return "One-time purchase";
  }

  if (category === "Wellness") {
    return "Subscription";
  }

  if (category === "Learning") {
    return "One-time purchase";
  }

  if (category === "Home") {
    return "Lead generation";
  }

  if (variantIndex % 3 === 1) {
    return "Usage-based";
  }

  if (variantIndex % 3 === 2) {
    return "Subscription";
  }

  return "Eden Leaves";
}

function buildGenerateDescriptionOutput(
  context: EdenWorkspaceAssistantContext,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantOutput {
  const routeLabels = routeDecision.routes.map(formatRouteLabel).join(", ");
  const description = `${context.serviceName} is a mocked ${context.category.toLowerCase()} offer from ${context.businessName} that helps customers move from intent to a concrete outcome with ${context.pricingModel.toLowerCase()} packaging and ${context.automationSummary.toLowerCase()}. It is positioned around ${context.tags.slice(0, 3).join(", ") || context.category} and is ready for the ${toTitleCase(context.pipelineStatus)} stage inside Eden's innovator flow.`;

  return {
    headline: `Generated description for ${context.serviceName}`,
    summary: `Created sharper marketplace-ready copy using ${routeLabels} signals from Eden's shared adapter.`,
    bullets: [
      `Lead with the customer outcome before the implementation details.`,
      `Keep ${context.category} as the primary category anchor and reinforce ${context.tags.slice(0, 2).join(", ") || "your core tags"} in discovery copy.`,
      `Tie the close of the description back to the current ${toTitleCase(context.pipelineStatus)} release state so the workspace story stays coherent.`,
    ],
    draftPatch: {
      description,
    },
    applyLabel: "Apply Description",
  };
}

function buildSuggestImprovementsOutput(
  context: EdenWorkspaceAssistantContext,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantOutput {
  const recommendedTags = Array.from(
    new Set([
      context.category,
      ...context.tags,
      routeTagMap[routeDecision.routes[0] ?? "idea_generation"] ?? "Launch prep",
      context.pipelineStatus === "draft" ? "Testing ready" : "Publish prep",
    ]),
  ).slice(0, 5);
  const pricingModel =
    context.pricingModel && !context.pricingModel.toLowerCase().includes("placeholder")
      ? context.pricingModel
      : choosePricingPlaceholder(
          `${context.serviceName} ${context.category} ${context.tags.join(" ")}`,
          context.category,
          1,
        );
  const automationSummary = `${context.automationSummary} Add a lightweight review loop for copy validation, checklist preparation, and launch follow-up.`;

  return {
    headline: `Improvement pass for ${context.serviceName}`,
    summary: `Generated a focused improvement set for the current service draft without leaving the existing Eden AI path.`,
    bullets: [
      `Tighten the opening copy so the first sentence explains the outcome, not the mechanism.`,
      `Use ${recommendedTags.slice(0, 3).join(", ")} as the strongest discovery tags for the next workspace iteration.`,
      `Clarify ${pricingModel.toLowerCase()} packaging before the service advances beyond ${toTitleCase(context.pipelineStatus)}.`,
    ],
    draftPatch: {
      suggestedTags: recommendedTags,
      pricingModel,
      automationSummary,
    },
    applyLabel: "Apply Improvements",
  };
}

function buildPrepareForPublishOutput(
  context: EdenWorkspaceAssistantContext,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantOutput {
  const publishChecklistSuggestions = buildPublishChecklistSuggestions(
    context,
    routeDecision,
  );
  const prioritySuggestions = publishChecklistSuggestions.filter(
    (item) => item.state !== "done",
  );
  const publishDescription = `${context.serviceName} is a publish-ready mocked ${context.category.toLowerCase()} offer from ${context.businessName} with clear ${context.pricingModel.toLowerCase()} packaging, focused onboarding expectations, and ${context.automationSummary.toLowerCase()}. It is framed for customers who want a confident outcome and a low-friction path from discovery into activation.`;
  const publishTags = Array.from(
    new Set([...context.tags, "Publish ready", routeTagMap[routeDecision.routes[0] ?? "service_search"]]),
  ).slice(0, 5);
  const pricingModel =
    context.pricingModel && !context.pricingModel.toLowerCase().includes("placeholder")
      ? context.pricingModel
      : choosePricingPlaceholder(
          `${context.serviceName} ${context.category} ${context.tags.join(" ")}`,
          context.category,
          2,
        );
  const bullets = prioritySuggestions.length
    ? prioritySuggestions
        .slice(0, 3)
        .map((item) => `${item.label}: ${item.suggestion}`)
    : [
        `The publish checklist is already clear. Focus on tightening the marketplace-facing tone before launch.`,
        `Keep the tag set compact so the public discovery surface stays readable and consistent.`,
        `Use the automation summary to explain how follow-up, delivery, or validation is handled after launch.`,
      ];

  return {
    headline: `Publish prep for ${context.serviceName}`,
    summary: prioritySuggestions.length
      ? `Prepared checklist-specific publish fixes for ${prioritySuggestions.length} open release requirement(s) while the service is ${context.readinessPercent}% ready.`
      : `Prepared a mocked publish pass aligned to the current ${toTitleCase(context.pipelineStatus)} pipeline state.`,
    bullets,
    draftPatch: {
      description: publishDescription,
      suggestedTags: publishTags,
      pricingModel,
      automationSummary: `${context.automationSummary} Add a publish checkpoint, checklist review, and post-launch usage review step.`,
    },
    applyLabel: "Apply Publish Prep",
    checklistSuggestions: publishChecklistSuggestions,
  };
}

function buildPackagingVariantOutput(
  request: EdenWorkspaceAssistantRequest,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantOutput {
  const packagingDraft = createServiceDraftOutput(
    {
      prompt: request.prompt,
      timestamp: request.timestamp,
      discoverySnapshot: request.discoverySnapshot,
      variantIndex: request.variantIndex ?? 0,
      context: {
        businessName: request.context.businessName,
        businessDescription: request.context.businessDescription,
        activeServiceName: request.context.serviceName,
        defaultCategory: request.context.category,
        defaultTags: request.context.tags,
      },
    },
    routeDecision,
  );

  return {
    headline: `Packaging variant for ${request.context.serviceName}`,
    summary: `Created a new mocked packaging direction using the same service-draft generator that powers the Service Innovator.`,
    bullets: [
      `Try ${packagingDraft.pricingModel.toLowerCase()} packaging to change how the offer is perceived in the marketplace.`,
      `Use ${packagingDraft.suggestedTags.slice(0, 3).join(", ")} as the strongest positioning tags for this variant.`,
      `The automation summary reframes the service for the current ${toTitleCase(request.context.pipelineStatus)} stage.`,
    ],
    draftPatch: {
      name: packagingDraft.name,
      description: packagingDraft.description,
      category: packagingDraft.category,
      suggestedTags: packagingDraft.suggestedTags,
      pricingModel: packagingDraft.pricingModel,
      automationSummary: packagingDraft.automationSummary,
    },
    applyLabel: "Apply Packaging Variant",
  };
}

function buildAutomationSummary(
  serviceName: string,
  routeDecision: EdenRouteDecision,
  relatedProjectTitle: string | undefined,
  automationLed: boolean,
  variantIndex: number,
) {
  const routeLabels = routeDecision.routes.map(formatRouteLabel).join(", ");
  const automationMode = automationLed
    ? automationModeVariants[variantIndex % automationModeVariants.length] ?? automationModeVariants[0]
    : [
        "idea framing, description generation, and publish-prep guidance",
        "service positioning, value-prop drafting, and checklist preparation",
        "offer packaging, category refinement, and launch-step orchestration",
      ][variantIndex % 3];
  const projectNote = relatedProjectTitle
    ? ` ${relatedProjectTitle} can anchor the first mocked validation pass.`
    : " The innovator can use this as the starting point for testing and publish review.";

  return `${serviceName} uses a mocked AI layer for ${automationMode} across ${routeLabels}.${projectNote}`;
}

function isAutomationPrompt(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();

  return (
    normalizedPrompt.includes("automation") ||
    normalizedPrompt.includes("agent") ||
    normalizedPrompt.includes("assistant") ||
    normalizedPrompt.includes("copilot") ||
    normalizedPrompt.includes("workflow") ||
    normalizedPrompt.includes("tool")
  );
}

function formatRouteLabel(route: string) {
  return route
    .split("_")
    .map((part) => toTitleCase(part))
    .join(" ");
}

function buildPublishChecklistSuggestions(
  context: EdenWorkspaceAssistantContext,
  routeDecision: EdenRouteDecision,
): EdenWorkspaceAssistantChecklistSuggestion[] {
  const routeLabel = formatRouteLabel(routeDecision.routes[0] ?? "service_search");

  return context.publishChecklist.map((item) => ({
    id: `publish-${item.id}`,
    label: item.label,
    state: item.state,
    detail: item.detail,
    suggestion: getChecklistSuggestion(item, context, routeLabel),
  }));
}

function getChecklistSuggestion(
  item: EdenWorkspaceAssistantContext["publishChecklist"][number],
  context: EdenWorkspaceAssistantContext,
  routeLabel: string,
) {
  if (item.id === "pipeline-check-description") {
    return item.state === "done"
      ? `Keep the opening paragraph outcome-led and aligned to ${routeLabel} discovery language.`
      : `Expand the business and service description so ${context.serviceName} reads like a public offer instead of an internal draft.`;
  }

  if (item.id === "pipeline-check-tags") {
    return item.state === "done"
      ? `Keep ${context.tags.slice(0, 3).join(", ") || context.category} as the public-facing discovery anchors.`
      : `Set one clear category anchor and 3 to 5 discovery tags so the service is easier to rank and review before publish.`;
  }

  if (item.id === "pipeline-check-billing") {
    return item.state === "done"
      ? `Keep the hosting placeholder and fee summary visible so the publish review stays transparent.`
      : `Finish the pricing placeholder, fee summary, and hosting narrative before moving beyond ${toTitleCase(context.pipelineStatus)}.`;
  }

  if (item.id === "pipeline-check-credits") {
    return item.state === "done"
      ? `Credit coverage is sufficient. Hold the current reserve through launch and post-publish monitoring.`
      : `Add Eden Leaves before publish so the release can clear readiness and keep usage simulations active.`;
  }

  return item.state === "done"
    ? `Testing is already cleared. Use the final publish pass to confirm the launch narrative and marketplace polish.`
    : item.state === "blocked"
      ? `Start or continue the mocked QA pass before publish so the release story matches the current pipeline stage.`
      : `Complete the remaining QA notes, then mark the release ready for publish once the checklist is clear.`;
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

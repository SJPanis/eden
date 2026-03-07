import type {
  EdenDiscoverySnapshot,
  EdenMockChecklistState,
  EdenMockPipelineChecklistItem,
  EdenMockReleaseStatus,
} from "@/modules/core/mock-data";

export type EdenRoute = "service_search" | "business_discovery" | "idea_generation";

export type EdenRouteConfidence = "low" | "medium" | "high";

export type EdenRouteDecision = {
  routes: EdenRoute[];
  confidence: EdenRouteConfidence;
  signals: string[];
};

export type EdenAgentRequest = {
  prompt: string;
  timestamp: string;
  sessionId?: string;
  discoverySnapshot?: EdenDiscoverySnapshot;
};

export type EdenServiceDraftGenerationContext = {
  businessId?: string;
  businessName?: string;
  businessDescription?: string;
  activeServiceName?: string;
  defaultCategory?: string;
  defaultTags?: string[];
};

export type EdenServiceDraftRequest = EdenAgentRequest & {
  context?: EdenServiceDraftGenerationContext;
  variantIndex?: number;
};

export type EdenServiceResult = {
  id: string;
  title: string;
  category: string;
  description: string;
  actionLabel: "View";
};

export type EdenBusinessResult = {
  id: string;
  name: string;
  tags: string[];
  summary: string;
  actionLabel: "Open";
};

export type EdenIdeaResult = {
  id: string;
  title: string;
  description: string;
  actionLabel: "Start Building";
};

export type EdenAgentOutputs = {
  recommendedServices: EdenServiceResult[];
  businessMatches: EdenBusinessResult[];
  ideasToBuild: EdenIdeaResult[];
};

export type EdenAgentResponse = {
  summary: string;
  outputs: EdenAgentOutputs;
  routeDecision: EdenRouteDecision;
  generatedAt: string;
  provider: "eden-simulated-router";
};

export type EdenGeneratedServiceDraft = {
  name: string;
  description: string;
  category: string;
  suggestedTags: string[];
  pricingModel: string;
  automationSummary: string;
};

export type EdenServiceDraftResponse = {
  summary: string;
  draft: EdenGeneratedServiceDraft;
  variantIndex: number;
  routeDecision: EdenRouteDecision;
  generatedAt: string;
  provider: "eden-simulated-router";
};

export type EdenBusinessAssistantAction =
  | "generate_description"
  | "suggest_improvements"
  | "prepare_for_publish"
  | "create_packaging_variant";

export type EdenWorkspaceAssistantContext = {
  businessName: string;
  businessDescription: string;
  serviceName: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel: string;
  automationSummary: string;
  pipelineStatus: EdenMockReleaseStatus;
  publishChecklist: EdenMockPipelineChecklistItem[];
  readinessPercent: number;
  nextMilestone: string;
};

export type EdenWorkspaceAssistantDraftPatch = Partial<{
  name: string;
  description: string;
  category: string;
  suggestedTags: string[];
  pricingModel: string;
  automationSummary: string;
}>;

export type EdenWorkspaceAssistantChecklistSuggestion = {
  id: string;
  label: string;
  state: EdenMockChecklistState;
  detail: string;
  suggestion: string;
};

export type EdenWorkspaceAssistantRequest = EdenAgentRequest & {
  action: EdenBusinessAssistantAction;
  context: EdenWorkspaceAssistantContext;
  variantIndex?: number;
};

export type EdenWorkspaceAssistantOutput = {
  headline: string;
  summary: string;
  bullets: string[];
  draftPatch?: EdenWorkspaceAssistantDraftPatch;
  applyLabel?: string;
  checklistSuggestions?: EdenWorkspaceAssistantChecklistSuggestion[];
};

export type EdenWorkspaceAssistantResponse = {
  action: EdenBusinessAssistantAction;
  summary: string;
  output: EdenWorkspaceAssistantOutput;
  routeDecision: EdenRouteDecision;
  generatedAt: string;
  provider: "eden-simulated-router";
};

export interface EdenModelAdapter {
  generate(
    request: EdenAgentRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenAgentResponse>;
  generateServiceDraft(
    request: EdenServiceDraftRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenServiceDraftResponse>;
  generateWorkspaceAssistant(
    request: EdenWorkspaceAssistantRequest,
    routeDecision: EdenRouteDecision,
  ): Promise<EdenWorkspaceAssistantResponse>;
}

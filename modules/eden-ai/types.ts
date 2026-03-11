export type EdenAiRouteLane =
  | "service_search"
  | "business_discovery"
  | "idea_generation"
  | "project_build"
  | "service_run_help"
  | "wallet_help"
  | "platform_status";

export type EdenAiGroundingMode = "live" | "proposed" | "simulated";

export type EdenAiConfidence = "low" | "medium" | "high";

export type EdenAiActionType =
  | "open_service"
  | "open_business"
  | "start_build"
  | "inspect_wallet"
  | "create_project"
  | "create_agent"
  | "run_agent";

export type EdenAiSuggestedAgent = {
  name: string;
  roleTitle: string;
  instructions: string;
  branchLabel?: string | null;
};

export type EdenAiProjectArtifact = {
  id: string;
  projectId?: string | null;
  businessId?: string | null;
  title: string;
  description: string;
  goal: string;
  statusLabel: string;
  detail: string;
  groundingMode: EdenAiGroundingMode;
  created: boolean;
  suggestedAgents: EdenAiSuggestedAgent[];
};

export type EdenAiServiceResult = {
  kind: "service";
  id: string;
  title: string;
  category: string;
  description: string;
  groundingMode: EdenAiGroundingMode;
  pricingLabel: string;
  pricePerUseCredits: number | null;
  availabilityLabel: string;
  trustLabel: string;
  businessId?: string | null;
  actionLabel: "Open Service";
};

export type EdenAiBusinessResult = {
  kind: "business";
  id: string;
  name: string;
  tags: string[];
  summary: string;
  groundingMode: EdenAiGroundingMode;
  statusLabel: string;
  actionLabel: "Open Business";
};

export type EdenAiIdeaResult = {
  kind: "idea";
  id: string;
  title: string;
  description: string;
  groundingMode: EdenAiGroundingMode;
  projectArtifact?: EdenAiProjectArtifact | null;
  actionLabel: "Create Project" | "Start Building";
};

export type EdenAiWalletTransactionPreview = {
  id: string;
  title: string;
  amountLabel: string;
  timestampLabel: string;
  kind: string;
};

export type EdenAiWalletResult = {
  kind: "wallet";
  currentBalanceCredits: number;
  balanceLabel: string;
  groundingMode: EdenAiGroundingMode;
  recentTransactions: EdenAiWalletTransactionPreview[];
};

export type EdenAiStatusMetric = {
  label: string;
  value: string;
  detail: string;
};

export type EdenAiPlatformStatusResult = {
  kind: "platform_status";
  title: string;
  summary: string;
  groundingMode: EdenAiGroundingMode;
  metrics: EdenAiStatusMetric[];
};

export type EdenAiAction = {
  type: EdenAiActionType;
  label: string;
  description: string;
  groundingMode: EdenAiGroundingMode;
  enabled: boolean;
  href?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
};

export type EdenAiActionOutcome = {
  type: EdenAiActionType;
  status: "completed" | "blocked" | "failed";
  message: string;
};

export type EdenAiRouteResult = {
  lanes: EdenAiRouteLane[];
  confidence: EdenAiConfidence;
  groundingMode: EdenAiGroundingMode;
  summary: string;
  results: {
    services: EdenAiServiceResult[];
    businesses: EdenAiBusinessResult[];
    ideas: EdenAiIdeaResult[];
    wallet?: EdenAiWalletResult | null;
    project?: EdenAiProjectArtifact | null;
    platformStatus?: EdenAiPlatformStatusResult | null;
  };
  nextActions: EdenAiAction[];
  warnings: string[];
  actionOutcome?: EdenAiActionOutcome;
  trace?: {
    signals: string[];
    tools: string[];
  };
};

export type EdenAiSelectedContext = {
  businessId?: string;
  projectId?: string;
  agentId?: string;
  serviceId?: string;
};

export type EdenAiActionRequest = {
  type: EdenAiActionType;
  targetId?: string;
  payload?: Record<string, unknown>;
};

export type EdenAiRequest = {
  prompt: string;
  selectedContext?: EdenAiSelectedContext;
  requestedAction?: EdenAiActionRequest;
};

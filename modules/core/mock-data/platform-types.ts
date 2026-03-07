export type EdenMockUserStatus = "active" | "review" | "frozen";
export type EdenMockUserRole = "consumer" | "business" | "owner";
export type EdenMockBusinessStatus = "draft" | "testing" | "published";
export type EdenMockReleaseStatus = "draft" | "testing" | "ready" | "published";
export type EdenMockVisibility = "Private preview" | "Internal testing" | "Published";
export type EdenMockProjectStatus = "Idea" | "Building" | "Testing";
export type EdenMockTransactionDirection = "inflow" | "outflow" | "reserve" | "adjustment";
export type EdenMockTransactionKind =
  | "wallet"
  | "usage"
  | "reserve"
  | "fee"
  | "hosting"
  | "adjustment";
export type EdenMockLogLevel = "info" | "warn" | "error";
export type EdenMockPipelineStageState = "ready" | "attention" | "locked";
export type EdenMockChecklistState = "done" | "pending" | "blocked";
export type EdenMockAgentStatus = "healthy" | "busy" | "attention";

export interface EdenMockUser {
  id: string;
  username: string;
  displayName: string;
  status: EdenMockUserStatus;
  role: EdenMockUserRole;
  edenBalanceCredits: number;
  summary: string;
  businessIds: string[];
  savedBusinessIds: string[];
  savedServiceIds: string[];
}

export interface EdenMockBusiness {
  id: string;
  name: string;
  ownerUserId: string;
  status: EdenMockBusinessStatus;
  category: string;
  tags: string[];
  description: string;
  summary: string;
  tagline: string;
  visibility: EdenMockVisibility;
  teamLabel: string;
  creditBalanceCredits: number;
  publishReadinessPercent: number;
  nextMilestone: string;
  featuredServiceId: string;
}

export interface EdenMockService {
  id: string;
  title: string;
  businessId: string;
  category: string;
  description: string;
  summary: string;
  status: string;
  tags: string[];
}

export interface EdenMockProject {
  id: string;
  businessId: string;
  title: string;
  type: string;
  status: EdenMockProjectStatus;
  summary: string;
  milestone: string;
  updatedAt: string;
  progress: number;
}

export interface EdenMockTransaction {
  id: string;
  businessId?: string;
  userId?: string;
  title: string;
  amountLabel: string;
  creditsDelta: number;
  direction: EdenMockTransactionDirection;
  kind: EdenMockTransactionKind;
  detail: string;
  timestamp: string;
  simulated?: boolean;
}

export interface EdenMockLog {
  id: string;
  level: EdenMockLogLevel;
  source: string;
  title: string;
  message: string;
  timestamp: string;
  businessId?: string;
  userId?: string;
  serviceId?: string;
}

export interface EdenMockCategory {
  id: string;
  label: string;
  description: string;
}

export interface EdenMockBusinessAssistantAction {
  id: string;
  title: string;
  description: string;
  resultHint: string;
}

export interface EdenMockPipelineStage {
  id: string;
  title: string;
  state: EdenMockPipelineStageState;
  summary: string;
  readiness: string;
}

export interface EdenMockPipelineChecklistItem {
  id: string;
  label: string;
  detail: string;
  state: EdenMockChecklistState;
}

export interface EdenMockPipelineRecord {
  businessId: string;
  serviceId: string;
  projectId?: string;
  status: EdenMockReleaseStatus;
  buildStarted: boolean;
  updatedAt: string;
  lastActionLabel: string;
}

export interface EdenMockPipelineEvent {
  id: string;
  businessId: string;
  serviceId: string;
  projectId?: string;
  previousStatus: EdenMockReleaseStatus;
  newStatus: EdenMockReleaseStatus;
  timestamp: string;
  actor: string;
  detail: string;
}

export interface EdenMockFeeSummaryItem {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface EdenMockOwnerSignal {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface EdenMockOwnerHealthCheck {
  id: string;
  label: string;
  status: string;
  detail: string;
}

export interface EdenMockSecurityControl {
  id: string;
  title: string;
  description: string;
  stateLabel: string;
  actionLabel: string;
}

export interface EdenMockAgentNode {
  id: string;
  name: string;
  status: EdenMockAgentStatus;
  queueDepth: string;
  activity: string;
}

export const edenOwnerInternalSandboxBusinessId =
  "business-eden-internal-sandbox";
export const edenOwnerInternalSandboxProjectId =
  "project-eden-internal-sandbox";
export const edenOwnerInternalSandboxRuntimeId =
  "runtime-eden-internal-sandbox";
export const edenOwnerInternalSandboxDomainLinkId =
  "runtime-domain-eden-internal-sandbox-preview";
export const edenInternalSandboxLeadAgentLabel = "Eden Sandbox Lead";
export const edenInternalSandboxWorkerAgentLabel = "Eden Sandbox Worker";
export const ownerRuntimeLifecycleStatusOptions = [
  { value: "registered", label: "Registered" },
  { value: "configuring", label: "Configuring" },
  { value: "ready", label: "Ready" },
  { value: "paused", label: "Paused" },
  { value: "error", label: "Error" },
  { value: "archived", label: "Archived" },
] as const;
export const ownerRuntimeHealthCheckActionOptions = [
  { value: "keep", label: "Keep current timestamp" },
  { value: "set_now", label: "Record health check now" },
  { value: "clear", label: "Clear health check" },
] as const;
export const ownerRuntimeLaunchIntentTypeOptions = [
  { value: "internal_preview", label: "Internal Preview" },
  { value: "eden_hosted", label: "Eden Hosted" },
  { value: "linked_external", label: "Linked External" },
] as const;
export const ownerRuntimeLaunchModeOptions = [
  { value: "control_plane_only", label: "Control Plane Only" },
  { value: "eden_managed_promotion", label: "Eden Managed Promotion" },
  { value: "external_handoff", label: "External Handoff" },
] as const;
export const ownerRuntimeLaunchTargetOptions = [
  { value: "eden_internal", label: "Eden Internal" },
  { value: "eden_managed", label: "Eden Managed" },
  { value: "external_domain", label: "External Domain" },
] as const;
export const ownerRuntimeDeploymentEventTypeOptions = [
  { value: "manual_note", label: "Manual Note" },
  { value: "preview_checkpoint", label: "Preview Checkpoint" },
  { value: "hosted_checkpoint", label: "Hosted Checkpoint" },
  { value: "external_link_checkpoint", label: "External Link Checkpoint" },
] as const;
export const ownerRuntimeDeploymentEventStatusOptions = [
  { value: "recorded", label: "Recorded" },
  { value: "planned", label: "Planned" },
  { value: "ready", label: "Ready" },
  { value: "blocked", label: "Blocked" },
  { value: "failed", label: "Failed" },
] as const;
export const ownerRuntimeConfigScopeOptions = [
  { value: "owner_internal", label: "Owner Internal" },
  { value: "business_runtime", label: "Business Runtime" },
  { value: "public_runtime", label: "Public Runtime" },
] as const;
export const ownerRuntimeExecutionModeOptions = [
  { value: "control_plane_only", label: "Control Plane Only" },
  { value: "sandbox_task_runner_v1", label: "Sandbox Task Runner v1" },
  { value: "future_runtime_agent", label: "Future Runtime Agent" },
  { value: "external_runtime_handoff", label: "External Runtime Handoff" },
] as const;
export const ownerRuntimeProviderPolicyModeOptions = [
  { value: "eden_approved_only", label: "Eden Approved Only" },
  { value: "runtime_allowlist", label: "Runtime Allowlist" },
  { value: "owner_approval_required", label: "Owner Approval Required" },
] as const;
export const ownerRuntimeProviderOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
] as const;
export const ownerRuntimeExecutionRoleOptions = [
  { value: "owner_supervisor", label: "Owner Supervisor" },
  { value: "runtime_lead", label: "Runtime Lead" },
  { value: "tool_worker", label: "Tool Worker" },
  { value: "browser_worker", label: "Browser Worker" },
  { value: "qa_reviewer", label: "QA Reviewer" },
] as const;
export const ownerRuntimeExecutionAdapterOptions = [
  { value: "tool_adapter", label: "Tool Adapter" },
  { value: "browser_adapter", label: "Browser Adapter" },
  { value: "provider_adapter", label: "Provider Adapter" },
] as const;
export const ownerRuntimeProviderApprovalStatusOptions = [
  { value: "review_required", label: "Review Required" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
] as const;
export const ownerRuntimeSecretStatusOptions = [
  { value: "missing", label: "Missing" },
  { value: "pending", label: "Pending" },
  { value: "configured", label: "Configured" },
  { value: "reserved", label: "Reserved" },
] as const;
export const ownerRuntimeTaskRequestedActionOptions = [
  { value: "provider_preflight", label: "Provider Preflight" },
  { value: "sandbox_test", label: "Sandbox Test" },
  { value: "qa_validation", label: "QA Validation" },
  { value: "implementation_review", label: "Implementation Review" },
] as const;
export const ownerRuntimeTaskResultTypeOptions = [
  { value: "sandbox_plan", label: "Sandbox Plan" },
  { value: "provider_preflight", label: "Provider Preflight" },
  { value: "live_provider_result", label: "Live Provider Result" },
  { value: "qa_result", label: "QA Result" },
  { value: "execution_review", label: "Execution Review" },
] as const;
export const ownerRuntimeTaskResultStatusOptions = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "review_needed", label: "Review Needed" },
  { value: "info", label: "Info" },
] as const;

export type OwnerRuntimeHealthCheckAction =
  (typeof ownerRuntimeHealthCheckActionOptions)[number]["value"];
export type OwnerRuntimeLaunchIntentType =
  (typeof ownerRuntimeLaunchIntentTypeOptions)[number]["value"];
export type OwnerRuntimeLaunchMode =
  (typeof ownerRuntimeLaunchModeOptions)[number]["value"];
export type OwnerRuntimeLaunchTarget =
  (typeof ownerRuntimeLaunchTargetOptions)[number]["value"];
export type OwnerRuntimeDeploymentEventType =
  (typeof ownerRuntimeDeploymentEventTypeOptions)[number]["value"];
export type OwnerRuntimeDeploymentEventStatus =
  (typeof ownerRuntimeDeploymentEventStatusOptions)[number]["value"];
export type OwnerRuntimeConfigScope =
  (typeof ownerRuntimeConfigScopeOptions)[number]["value"];
export type OwnerRuntimeExecutionMode =
  (typeof ownerRuntimeExecutionModeOptions)[number]["value"];
export type OwnerRuntimeProviderPolicyMode =
  (typeof ownerRuntimeProviderPolicyModeOptions)[number]["value"];
export type OwnerRuntimeProvider =
  (typeof ownerRuntimeProviderOptions)[number]["value"];
export type OwnerRuntimeExecutionRole =
  (typeof ownerRuntimeExecutionRoleOptions)[number]["value"];
export type OwnerRuntimeExecutionAdapter =
  (typeof ownerRuntimeExecutionAdapterOptions)[number]["value"];
export type OwnerRuntimeProviderApprovalStatus =
  (typeof ownerRuntimeProviderApprovalStatusOptions)[number]["value"];
export type OwnerRuntimeSecretStatus =
  (typeof ownerRuntimeSecretStatusOptions)[number]["value"];
export type OwnerRuntimeTaskRequestedAction =
  (typeof ownerRuntimeTaskRequestedActionOptions)[number]["value"];
export type OwnerRuntimeTaskResultType =
  (typeof ownerRuntimeTaskResultTypeOptions)[number]["value"];
export type OwnerRuntimeTaskResultStatus =
  (typeof ownerRuntimeTaskResultStatusOptions)[number]["value"];

export type EdenProjectRuntimeDomainLinkRecord = {
  id: string;
  linkType: string;
  linkTypeLabel: string;
  hostname: string;
  pathPrefix?: string | null;
  urlLabel: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type EdenProjectRuntimeAuditLogRecord = {
  id: string;
  fieldName: string;
  fieldLabel: string;
  previousValue?: string | null;
  previousValueLabel?: string | null;
  nextValue?: string | null;
  nextValueLabel?: string | null;
  detail: string;
  actorUserId: string;
  actorLabel: string;
  createdAtLabel: string;
};

export type EdenProjectRuntimeLaunchIntentRecord = {
  id: string;
  intentType: string;
  intentTypeLabel: string;
  intendedTarget: string;
  intendedTargetLabel: string;
  launchMode: string;
  launchModeLabel: string;
  destinationLabel?: string | null;
  notes?: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeDeploymentRecord = {
  id: string;
  eventType: string;
  eventTypeLabel: string;
  eventStatus: string;
  eventStatusLabel: string;
  summary: string;
  detail?: string | null;
  actorUserId: string;
  actorLabel: string;
  createdAtLabel: string;
};

export type EdenProjectRuntimeConfigRecord = {
  id: string;
  configScope: string;
  configScopeLabel: string;
  executionMode: string;
  executionModeLabel: string;
  providerPolicyMode: string;
  providerPolicyModeLabel: string;
  allowedProviders: string[];
  allowedProviderLabels: string[];
  defaultProvider?: string | null;
  defaultProviderLabel?: string | null;
  maxTaskBudgetLeaves?: number | null;
  monthlyBudgetLeaves?: number | null;
  modelPolicySummary?: string | null;
  secretPolicyReference?: string | null;
  notes?: string | null;
  ownerOnlyEnforced: boolean;
  internalOnlyEnforced: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeSecretBoundaryRecord = {
  id: string;
  label: string;
  description?: string | null;
  secretType: string;
  secretTypeLabel: string;
  secretScope: string;
  secretScopeLabel: string;
  visibilityPolicy: string;
  visibilityPolicyLabel: string;
  status: string;
  statusLabel: string;
  isRequired: boolean;
  providerKey?: string | null;
  providerLabel?: string | null;
  boundaryReference?: string | null;
  statusDetail?: string | null;
  lastCheckedAtLabel?: string | null;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeProviderApprovalRecord = {
  id: string;
  providerKey: string;
  providerLabel: string;
  approvalStatus: string;
  approvalStatusLabel: string;
  modelScope: string[];
  capabilityScope: string[];
  notes?: string | null;
  reviewedAtLabel?: string | null;
  updatedAtLabel: string;
  actorUserId: string;
  actorLabel: string;
};

export type EdenProjectRuntimeProviderCompatibilityRecord = {
  providerKey: string;
  providerLabel: string;
  adapterStatus: string;
  adapterStatusLabel: string;
  compatibilityStatus: string;
  compatibilityStatusLabel: string;
  capabilityLabels: string[];
  reason: string;
};

export type EdenProjectRuntimeAgentRunRecord = {
  id: string;
  runtimeId: string;
  taskId?: string | null;
  actorUserId: string;
  actorLabel: string;
  providerKey?: string | null;
  providerLabel?: string | null;
  modelLabel?: string | null;
  executionTargetLabel?: string | null;
  requestedActionType: string;
  requestedActionTypeLabel: string;
  runStatus: string;
  runStatusLabel: string;
  summary: string;
  detail?: string | null;
  resultPayloadSummary?: string | null;
  errorDetail?: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  completedAtLabel?: string | null;
};

export type EdenProjectRuntimeExecutionSessionRecord = {
  id: string;
  actorUserId: string;
  actorLabel: string;
  sessionLabel: string;
  sessionType: string;
  sessionTypeLabel: string;
  executionRole: string;
  executionRoleLabel: string;
  adapterKind: string;
  adapterKindLabel: string;
  adapterMode: string;
  adapterModeLabel: string;
  providerKey?: string | null;
  providerLabel?: string | null;
  status: string;
  statusLabel: string;
  allowedCapabilities: string[];
  ownerOnly: boolean;
  internalOnly: boolean;
  notes?: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeDispatchRecord = {
  id: string;
  runtimeId: string;
  taskId?: string | null;
  taskTitle?: string | null;
  actorUserId: string;
  actorLabel: string;
  sessionId?: string | null;
  sessionLabel?: string | null;
  providerKey?: string | null;
  providerLabel?: string | null;
  modelLabel?: string | null;
  dispatchStatus: string;
  dispatchStatusLabel: string;
  dispatchMode: string;
  dispatchModeLabel: string;
  executionRole: string;
  executionRoleLabel: string;
  adapterKind: string;
  adapterKindLabel: string;
  adapterKey: string;
  adapterLabel: string;
  adapterMode: string;
  adapterModeLabel: string;
  summary: string;
  detail?: string | null;
  dispatchReason?: string | null;
  blockingReason?: string | null;
  reviewRequired: boolean;
  resultPayloadSummary?: string | null;
  preparedAtLabel: string;
  dispatchedAtLabel?: string | null;
  completedAtLabel?: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeRecord = {
  id: string;
  projectId: string;
  projectTitle: string;
  businessId: string;
  businessName: string;
  creatorUserId: string;
  creatorLabel: string;
  name: string;
  purpose: string;
  runtimeType: string;
  runtimeTypeLabel: string;
  environment: string;
  environmentLabel: string;
  target: string;
  targetLabel: string;
  accessPolicy: string;
  accessPolicyLabel: string;
  visibility: string;
  visibilityLabel: string;
  status: string;
  statusLabel: string;
  statusDetail?: string | null;
  runtimeLocator?: string | null;
  previewUrl?: string | null;
  hostedUrl?: string | null;
  linkedDomain?: string | null;
  isOwnerOnly: boolean;
  isInternalOnly: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
  lastHealthCheckAtLabel?: string | null;
  domainLinks: EdenProjectRuntimeDomainLinkRecord[];
  launchIntent?: EdenProjectRuntimeLaunchIntentRecord | null;
  configPolicy?: EdenProjectRuntimeConfigRecord | null;
  secretBoundaries: EdenProjectRuntimeSecretBoundaryRecord[];
  providerApprovals: EdenProjectRuntimeProviderApprovalRecord[];
  providerCompatibility: EdenProjectRuntimeProviderCompatibilityRecord[];
  agentRuns: EdenProjectRuntimeAgentRunRecord[];
  executionSessions: EdenProjectRuntimeExecutionSessionRecord[];
  dispatchHistory: EdenProjectRuntimeDispatchRecord[];
  auditEntries: EdenProjectRuntimeAuditLogRecord[];
  deploymentHistory: EdenProjectRuntimeDeploymentRecord[];
};

export type EdenProjectRuntimeRegistryState = {
  runtimes: EdenProjectRuntimeRecord[];
  unavailableReason: string | null;
};

export type EdenProjectRuntimeTaskArtifactRecord = {
  label: string;
  detail: string;
};

export type EdenProjectRuntimeTaskRecord = {
  id: string;
  runtimeId: string;
  creatorUserId: string;
  creatorLabel: string;
  title: string;
  inputText: string;
  providerKey?: string | null;
  providerLabel?: string | null;
  modelLabel?: string | null;
  requestedActionType?: string | null;
  requestedActionTypeLabel?: string | null;
  taskType: string;
  taskTypeLabel: string;
  status: string;
  statusLabel: string;
  executionMode: string;
  executionModeLabel: string;
  plannerSummary?: string | null;
  plannerWorkItems: string[];
  plannerConstraints: string[];
  plannerChecklist: string[];
  workerSummary?: string | null;
  workerActionPlan: string[];
  workerImplementationNotes: string[];
  workerArtifacts: EdenProjectRuntimeTaskArtifactRecord[];
  outputSummary?: string | null;
  outputLines: string[];
  resultType?: string | null;
  resultTypeLabel?: string | null;
  resultStatus?: string | null;
  resultStatusLabel?: string | null;
  resultSummary?: string | null;
  resultPayloadSummary?: string | null;
  failureDetail?: string | null;
  agentRuns: EdenProjectRuntimeAgentRunRecord[];
  dispatchRecords: EdenProjectRuntimeDispatchRecord[];
  plannerCompletedAtLabel?: string | null;
  workerCompletedAtLabel?: string | null;
  completedAtLabel?: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type EdenProjectRuntimeTaskState = {
  tasks: EdenProjectRuntimeTaskRecord[];
  unavailableReason: string | null;
  runtimeMissing: boolean;
};

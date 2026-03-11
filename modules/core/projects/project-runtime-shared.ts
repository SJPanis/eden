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
  failureDetail?: string | null;
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

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

export type OwnerRuntimeHealthCheckAction =
  (typeof ownerRuntimeHealthCheckActionOptions)[number]["value"];

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
  auditEntries: EdenProjectRuntimeAuditLogRecord[];
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

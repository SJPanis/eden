export const edenOwnerInternalSandboxBusinessId =
  "business-eden-internal-sandbox";
export const edenOwnerInternalSandboxProjectId =
  "project-eden-internal-sandbox";
export const edenOwnerInternalSandboxRuntimeId =
  "runtime-eden-internal-sandbox";
export const edenOwnerInternalSandboxDomainLinkId =
  "runtime-domain-eden-internal-sandbox-preview";

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
};

export type EdenProjectRuntimeRegistryState = {
  runtimes: EdenProjectRuntimeRecord[];
  unavailableReason: string | null;
};

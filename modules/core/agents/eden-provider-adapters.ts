export const edenProviderAdapterRegistry = [
  {
    providerKey: "openai",
    label: "OpenAI",
    adapterStatus: "scaffold_only",
    adapterStatusLabel: "Scaffold Only",
    capabilityLabels: [
      "Chat Completion",
      "Structured Output",
      "Tool Calling",
      "Streaming",
    ],
    summary:
      "Approved provider scaffold for future runtime-scoped model execution. No outbound provider calls are wired in v1.",
  },
  {
    providerKey: "anthropic",
    label: "Anthropic",
    adapterStatus: "scaffold_only",
    adapterStatusLabel: "Scaffold Only",
    capabilityLabels: [
      "Chat Completion",
      "Structured Output",
      "Tool Use",
      "Streaming",
    ],
    summary:
      "Approved provider scaffold for future runtime-scoped model execution. No outbound provider calls are wired in v1.",
  },
] as const;

export type EdenProviderAdapterKey =
  (typeof edenProviderAdapterRegistry)[number]["providerKey"];

export type EdenProviderCompatibilityRecord = {
  providerKey: EdenProviderAdapterKey;
  providerLabel: string;
  adapterStatus: string;
  adapterStatusLabel: string;
  compatibilityStatus:
    | "blocked"
    | "approval_required"
    | "awaiting_secret"
    | "scaffold_allowed";
  compatibilityStatusLabel: string;
  capabilityLabels: string[];
  reason: string;
};

export type EdenRuntimeProviderPolicySnapshot = {
  executionMode?: string | null;
  providerPolicyMode?: string | null;
  allowedProviders: string[];
  secretBoundaries: Array<{
    providerKey?: string | null;
    status: string;
    isRequired: boolean;
  }>;
};

export type EdenProviderExecutionRequest = {
  providerKey: EdenProviderAdapterKey;
  model: string;
  prompt: string;
  runtimeId: string;
};

export async function executeWithEdenProviderAdapter(
  request: EdenProviderExecutionRequest,
) {
  const adapter = edenProviderAdapterRegistry.find(
    (candidate) => candidate.providerKey === request.providerKey,
  );

  if (!adapter) {
    return {
      ok: false as const,
      metadataOnly: true as const,
      error:
        "Unknown provider adapter. Eden only exposes approved scaffold providers in v1.",
    };
  }

  return {
    ok: false as const,
    metadataOnly: true as const,
    error: `${adapter.label} provider execution is not wired yet. The adapter remains scaffold-only in this control-plane phase.`,
  };
}

export function evaluateRuntimeProviderCompatibility(
  snapshot: EdenRuntimeProviderPolicySnapshot | null | undefined,
): EdenProviderCompatibilityRecord[] {
  return edenProviderAdapterRegistry.map((adapter) => {
    const allowedProviders = new Set(
      snapshot?.allowedProviders.map((provider) => provider.toLowerCase()) ?? [],
    );
    const isAllowed = allowedProviders.has(adapter.providerKey);

    if (!snapshot) {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "blocked",
        compatibilityStatusLabel: "Blocked",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "No runtime config policy is stored yet, so Eden cannot approve this provider for runtime use.",
      };
    }

    if (!isAllowed) {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "blocked",
        compatibilityStatusLabel: "Blocked",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "This provider is outside the current runtime allowlist and remains unavailable to the runtime.",
      };
    }

    if (snapshot.providerPolicyMode === "owner_approval_required") {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "approval_required",
        compatibilityStatusLabel: "Approval Required",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "Runtime policy allows this provider only behind an explicit owner approval gate.",
      };
    }

    const providerSecrets = snapshot.secretBoundaries.filter(
      (boundary) =>
        boundary.providerKey?.toLowerCase() === adapter.providerKey &&
        boundary.isRequired,
    );
    const hasConfiguredSecret = providerSecrets.some(
      (boundary) => boundary.status.toLowerCase() === "configured",
    );

    if (!hasConfiguredSecret) {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "awaiting_secret",
        compatibilityStatusLabel: "Awaiting Secret",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "Runtime policy allows this provider, but the required secret boundary is still missing or only reserved.",
      };
    }

    return {
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      compatibilityStatus: "scaffold_allowed",
      compatibilityStatusLabel: "Policy Allowed",
      capabilityLabels: [...adapter.capabilityLabels],
      reason:
        "Runtime policy and secret metadata allow this provider, but Eden still exposes only scaffolded adapter execution.",
    };
  });
}

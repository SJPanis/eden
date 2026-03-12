const openAiProviderKey = "openai";
const openAiProviderLabel = "OpenAI";
const openAiResponsesApiUrl = "https://api.openai.com/v1/responses";
const defaultOpenAiSandboxModel = "gpt-4.1";

export const edenProviderAdapterRegistry = [
  {
    providerKey: "openai",
    label: openAiProviderLabel,
    adapterStatus: "live_guarded",
    adapterStatusLabel: "Live Guarded v1",
    capabilityLabels: [
      "Chat Completion",
      "Structured Output",
      "Tool Calling",
      "Streaming",
    ],
    summary:
      "Owner-only internal sandbox path can execute a real OpenAI request when runtime policy, secret-boundary status, and server credential checks all pass. This is the only live provider path in v1.",
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
  providerApprovals: Array<{
    providerKey: string;
    approvalStatus: string;
    modelScope: string[];
    capabilityScope: string[];
  }>;
  secretBoundaries: Array<{
    providerKey?: string | null;
    status: string;
    isRequired: boolean;
  }>;
};

export type EdenProviderExecutionPreflightRecord = {
  providerKey: EdenProviderAdapterKey;
  providerLabel: string;
  ready: boolean;
  runStatus:
    | "preflight_blocked"
    | "prepared"
    | "review_required"
    | "completed";
  compatibilityStatus:
    | "blocked"
    | "approval_required"
    | "awaiting_secret"
    | "scaffold_allowed";
  summary: string;
  detail: string;
};

export type EdenProviderExecutionRequest = {
  providerKey: EdenProviderAdapterKey;
  model: string;
  prompt: string;
  runtimeId: string;
  taskId?: string | null;
  taskTitle?: string | null;
  instructions?: string | null;
};

export type EdenProviderExecutionAvailability = {
  providerKey: EdenProviderAdapterKey;
  providerLabel: string;
  livePath: boolean;
  credentialConfigured: boolean;
  credentialEnvVar?: string | null;
  defaultModel?: string | null;
};

export type EdenProviderExecutionResult =
  | {
      ok: true;
      metadataOnly: false;
      attemptedCall: true;
      livePath: true;
      providerKey: EdenProviderAdapterKey;
      providerLabel: string;
      model: string;
      responseId?: string | null;
      outputText: string;
      summary: string;
      detail: string;
      resultPayload: Record<string, unknown>;
    }
  | {
      ok: false;
      metadataOnly: boolean;
      attemptedCall: boolean;
      livePath: boolean;
      providerKey?: EdenProviderAdapterKey;
      providerLabel?: string;
      model?: string | null;
      error: string;
      detail: string;
      resultPayload: Record<string, unknown>;
    };

export function getEdenProviderExecutionAvailability(
  providerKey: string,
): EdenProviderExecutionAvailability | null {
  const normalizedProviderKey = providerKey.trim().toLowerCase();
  const adapter = edenProviderAdapterRegistry.find(
    (candidate) => candidate.providerKey === normalizedProviderKey,
  );

  if (!adapter) {
    return null;
  }

  if (adapter.providerKey === openAiProviderKey) {
    return {
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      livePath: true,
      credentialConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      credentialEnvVar: "OPENAI_API_KEY",
      defaultModel:
        process.env.EDEN_SANDBOX_OPENAI_MODEL?.trim() ||
        defaultOpenAiSandboxModel,
    };
  }

  return {
    providerKey: adapter.providerKey,
    providerLabel: adapter.label,
    livePath: false,
    credentialConfigured: false,
    credentialEnvVar: null,
    defaultModel: null,
  };
}

export async function executeWithEdenProviderAdapter(
  request: EdenProviderExecutionRequest,
): Promise<EdenProviderExecutionResult> {
  const adapter = edenProviderAdapterRegistry.find(
    (candidate) => candidate.providerKey === request.providerKey,
  );

  if (!adapter) {
    return {
      ok: false,
      metadataOnly: true,
      attemptedCall: false,
      livePath: false,
      error:
        "Unknown provider adapter. Eden only exposes approved provider adapters in v1.",
      detail:
        "The requested provider is outside Eden's provider adapter registry, so no outbound execution was attempted.",
      resultPayload: {
        resultKind: "provider_execution_blocked",
        providerKey: request.providerKey,
        reason: "unknown_provider_adapter",
      },
    };
  }

  if (adapter.providerKey !== openAiProviderKey) {
    return {
      ok: false,
      metadataOnly: true,
      attemptedCall: false,
      livePath: false,
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      model: request.model,
      error: `${adapter.label} provider execution is not wired yet.`,
      detail:
        "This provider remains scaffold-only in Eden v1. No outbound provider call was attempted.",
      resultPayload: {
        resultKind: "provider_execution_scaffold_only",
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
      },
    };
  }

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();

  if (!openAiApiKey) {
    return {
      ok: false,
      metadataOnly: false,
      attemptedCall: false,
      livePath: true,
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      model: request.model,
      error:
        "OPENAI_API_KEY is not configured in the server runtime, so Eden could not attempt the live sandbox provider path.",
      detail:
        "OpenAI is approved as the first live provider path, but the active server runtime does not currently expose OPENAI_API_KEY.",
      resultPayload: {
        resultKind: "provider_execution_blocked",
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
        credentialEnvVar: "OPENAI_API_KEY",
        reason: "missing_server_credential",
      },
    };
  }

  try {
    const response = await fetch(openAiResponsesApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        instructions:
          request.instructions ??
          "You are executing inside Eden's owner-only internal sandbox. Stay within the provided task scope, do not claim code or infrastructure actions occurred unless the prompt explicitly says they did, and produce a concise result for owner review.",
        input: request.prompt,
        max_output_tokens: 700,
        text: {
          format: {
            type: "text",
          },
        },
        metadata: {
          eden_runtime_id: request.runtimeId,
          eden_task_id: request.taskId ?? "",
          eden_task_title: request.taskTitle ?? "",
          eden_execution_path: "owner_internal_sandbox_openai_v1",
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const parsedBody = await parseProviderResponseBody(response);

    if (!response.ok) {
      const failureDetail = extractProviderFailureDetail(parsedBody);

      return {
        ok: false,
        metadataOnly: false,
        attemptedCall: true,
        livePath: true,
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
        error: `OpenAI provider execution failed with HTTP ${response.status}.`,
        detail: failureDetail,
        resultPayload: {
          resultKind: "provider_execution_failed",
          providerKey: adapter.providerKey,
          providerLabel: adapter.label,
          model: request.model,
          responseStatus: response.status,
          error: failureDetail,
        },
      };
    }

    const outputText = extractOpenAiOutputText(parsedBody);

    if (!outputText) {
      return {
        ok: false,
        metadataOnly: false,
        attemptedCall: true,
        livePath: true,
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
        error:
          "OpenAI returned a response without readable text output for the sandbox task.",
        detail:
          "The Responses API returned successfully, but Eden could not extract a text payload suitable for owner review.",
        resultPayload: {
          resultKind: "provider_execution_failed",
          providerKey: adapter.providerKey,
          providerLabel: adapter.label,
          model: request.model,
          responseId: extractOpenAiResponseId(parsedBody),
          rawResponseShape: summarizeProviderResponseShape(parsedBody),
        },
      };
    }

    const trimmedOutput = outputText.trim();
    const summary = summarizeProviderOutput(trimmedOutput);
    const responseId = extractOpenAiResponseId(parsedBody);

    return {
      ok: true,
      metadataOnly: false,
      attemptedCall: true,
      livePath: true,
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      model: request.model,
      responseId,
      outputText: trimmedOutput,
      summary,
      detail:
        "OpenAI returned a live sandbox response. The result is stored for owner review and does not imply code execution, browser automation, or deployment happened.",
      resultPayload: {
        resultKind: "live_provider_result",
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
        responseId,
        outputText: trimmedOutput,
        usage: extractOpenAiUsage(parsedBody),
      },
    };
  } catch (error) {
    return {
      ok: false,
      metadataOnly: false,
      attemptedCall: false,
      livePath: true,
      providerKey: adapter.providerKey,
      providerLabel: adapter.label,
      model: request.model,
      error: "OpenAI provider execution threw before Eden received a response.",
      detail: error instanceof Error ? error.message : "Unknown provider error",
      resultPayload: {
        resultKind: "provider_execution_failed",
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        model: request.model,
        error: error instanceof Error ? error.message : "Unknown provider error",
      },
    };
  }
}

export function buildRuntimeProviderPreflight(
  snapshot: EdenRuntimeProviderPolicySnapshot | null | undefined,
  providerKey: string,
): EdenProviderExecutionPreflightRecord | null {
  const normalizedProviderKey = providerKey.trim().toLowerCase();
  const compatibility = evaluateRuntimeProviderCompatibility(snapshot).find(
    (record) => record.providerKey === normalizedProviderKey,
  );

  if (!compatibility) {
    return null;
  }

  if (compatibility.compatibilityStatus === "scaffold_allowed") {
    if (compatibility.providerKey === openAiProviderKey) {
      return {
        providerKey: compatibility.providerKey,
        providerLabel: compatibility.providerLabel,
        ready: true,
        runStatus: "prepared",
        compatibilityStatus: compatibility.compatibilityStatus,
        summary: `${compatibility.providerLabel} provider preflight passed runtime policy and secret-boundary checks.`,
        detail:
          "OpenAI is the first live provider path in Eden v1, but execution still requires an explicit owner-triggered sandbox run and a real server credential at runtime.",
      };
    }

    return {
      providerKey: compatibility.providerKey,
      providerLabel: compatibility.providerLabel,
      ready: true,
      runStatus: "prepared",
      compatibilityStatus: compatibility.compatibilityStatus,
      summary: `${compatibility.providerLabel} provider preflight passed runtime policy and secret-boundary checks.`,
      detail:
        "Provider use is approved for this runtime at the control-plane level, but live adapter execution remains scaffold-only in v1.",
    };
  }

  if (compatibility.compatibilityStatus === "approval_required") {
    return {
      providerKey: compatibility.providerKey,
      providerLabel: compatibility.providerLabel,
      ready: false,
      runStatus: "review_required",
      compatibilityStatus: compatibility.compatibilityStatus,
      summary: `${compatibility.providerLabel} provider preflight stopped for owner review.`,
      detail: compatibility.reason,
    };
  }

  return {
    providerKey: compatibility.providerKey,
    providerLabel: compatibility.providerLabel,
    ready: false,
    runStatus: "preflight_blocked",
    compatibilityStatus: compatibility.compatibilityStatus,
    summary: `${compatibility.providerLabel} provider preflight was blocked by runtime governance metadata.`,
    detail: compatibility.reason,
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
    const providerApproval = snapshot?.providerApprovals.find(
      (approval) => approval.providerKey.toLowerCase() === adapter.providerKey,
    );
    const approvalStatus = providerApproval?.approvalStatus.toLowerCase() ?? null;

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

    if (approvalStatus === "denied") {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "blocked",
        compatibilityStatusLabel: "Blocked",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "The owner has explicitly denied this provider for the current runtime.",
      };
    }

    if (
      snapshot.providerPolicyMode === "owner_approval_required" &&
      approvalStatus !== "approved"
    ) {
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

    if (approvalStatus === "review_required") {
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "approval_required",
        compatibilityStatusLabel: "Approval Required",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          "The provider is allowlisted, but owner approval is still marked as review required for this runtime.",
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
      const hasPendingSecret = providerSecrets.some((boundary) =>
        ["pending", "reserved"].includes(boundary.status.toLowerCase()),
      );
      return {
        providerKey: adapter.providerKey,
        providerLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        compatibilityStatus: "awaiting_secret",
        compatibilityStatusLabel: "Awaiting Secret",
        capabilityLabels: [...adapter.capabilityLabels],
        reason:
          hasPendingSecret
            ? "Runtime policy allows this provider, but the required secret boundary is still pending or reserved."
            : "Runtime policy allows this provider, but the required secret boundary is still missing.",
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
        adapter.providerKey === openAiProviderKey
          ? "Runtime policy and secret metadata allow OpenAI. The owner-only internal sandbox can attempt a real call only when the server runtime also exposes OPENAI_API_KEY."
          : "Runtime policy and secret metadata allow this provider, but Eden still exposes only scaffolded adapter execution.",
    };
  });
}

async function parseProviderResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text ? { text } : null;
}

function extractProviderFailureDetail(parsedBody: unknown) {
  if (!parsedBody) {
    return "The provider returned an empty failure response.";
  }

  if (typeof parsedBody === "string") {
    return parsedBody;
  }

  if (typeof parsedBody !== "object") {
    return String(parsedBody);
  }

  const errorRecord = (parsedBody as Record<string, unknown>).error;

  if (errorRecord && typeof errorRecord === "object") {
    const message = (errorRecord as Record<string, unknown>).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  const text = (parsedBody as Record<string, unknown>).text;
  if (typeof text === "string" && text.trim()) {
    return text;
  }

  return JSON.stringify(parsedBody);
}

function extractOpenAiOutputText(parsedBody: unknown) {
  if (!parsedBody || typeof parsedBody !== "object") {
    return null;
  }

  const outputText = (parsedBody as Record<string, unknown>).output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText;
  }

  const output = (parsedBody as Record<string, unknown>).output;

  if (!Array.isArray(output)) {
    return null;
  }

  const fragments: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as Record<string, unknown>).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const entry of content) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const text =
        (entry as Record<string, unknown>).text ??
        ((entry as Record<string, unknown>).output_text as unknown);

      if (typeof text === "string" && text.trim()) {
        fragments.push(text.trim());
      }
    }
  }

  return fragments.length ? fragments.join("\n\n") : null;
}

function extractOpenAiResponseId(parsedBody: unknown) {
  if (!parsedBody || typeof parsedBody !== "object") {
    return null;
  }

  const responseId = (parsedBody as Record<string, unknown>).id;
  return typeof responseId === "string" && responseId.trim() ? responseId : null;
}

function extractOpenAiUsage(parsedBody: unknown) {
  if (!parsedBody || typeof parsedBody !== "object") {
    return null;
  }

  const usage = (parsedBody as Record<string, unknown>).usage;

  return usage && typeof usage === "object"
    ? (usage as Record<string, unknown>)
    : null;
}

function summarizeProviderResponseShape(parsedBody: unknown) {
  if (!parsedBody || typeof parsedBody !== "object") {
    return "non_object_response";
  }

  return Object.keys(parsedBody as Record<string, unknown>).slice(0, 12);
}

function summarizeProviderOutput(outputText: string) {
  const normalized = outputText.replace(/\s+/g, " ").trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

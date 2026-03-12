import {
  buildRuntimeProviderPreflight,
  type EdenProviderExecutionPreflightRecord,
  type EdenRuntimeProviderPolicySnapshot,
} from "@/modules/core/agents/eden-provider-adapters";

export const edenExecutionAdapterRegistry = [
  {
    adapterKey: "tool_adapter",
    adapterKind: "tool",
    label: "Governed Tool Adapter",
    adapterStatus: "scaffold_only",
    adapterStatusLabel: "Scaffold Only",
    adapterMode: "scaffold_only",
    capabilityLabels: [
      "Planned tool handoff",
      "Governed async-boundary record",
      "Capability allowlist",
    ],
    summary:
      "Structured tool-dispatch scaffold for future runtime-local worker execution. No live tool execution is wired in v1.",
  },
  {
    adapterKey: "browser_adapter",
    adapterKind: "browser",
    label: "Governed Browser Adapter",
    adapterStatus: "preflight_only",
    adapterStatusLabel: "Preflight Only",
    adapterMode: "preflight_only",
    capabilityLabels: [
      "Browser session intent",
      "Navigation preflight",
      "Review-gated dispatch record",
    ],
    summary:
      "Structured browser-dispatch scaffold for future runtime-local browser workers. No live browser automation is wired in v1.",
  },
  {
    adapterKey: "provider_adapter",
    adapterKind: "provider",
    label: "Governed Provider Adapter",
    adapterStatus: "preflight_only",
    adapterStatusLabel: "Preflight Only",
    adapterMode: "preflight_only",
    capabilityLabels: [
      "Provider policy validation",
      "Secret-boundary readiness check",
      "Review-gated model execution intent",
    ],
    summary:
      "Structured provider-dispatch scaffold that reuses Eden provider approval and secret-boundary governance. No live provider call is wired in v1.",
  },
] as const;

export type EdenExecutionAdapterKey =
  (typeof edenExecutionAdapterRegistry)[number]["adapterKey"];

export type EdenExecutionAdapterKind =
  (typeof edenExecutionAdapterRegistry)[number]["adapterKind"];

export type EdenRuntimeExecutionGovernanceSnapshot =
  EdenRuntimeProviderPolicySnapshot & {
    runtimeId: string;
    runtimeName: string;
    accessPolicy: string;
    target: string;
    visibility: string;
    ownerOnlyEnforced: boolean;
    internalOnlyEnforced: boolean;
  };

export type EdenExecutionDispatchPreflightRecord = {
  adapterKey: EdenExecutionAdapterKey;
  adapterKind: EdenExecutionAdapterKind;
  adapterLabel: string;
  adapterStatus: string;
  adapterStatusLabel: string;
  adapterMode: "preflight_only" | "scaffold_only" | "future_live";
  dispatchStatus: "ready" | "blocked" | "review_required";
  ready: boolean;
  reviewRequired: boolean;
  summary: string;
  detail: string;
  dispatchReason: string;
  blockingReason?: string | null;
  capabilityLabels: string[];
  providerPreflight?: EdenProviderExecutionPreflightRecord | null;
};

type BuildRuntimeExecutionDispatchPreflightInput = {
  snapshot: EdenRuntimeExecutionGovernanceSnapshot | null | undefined;
  adapterKey: string;
  providerKey?: string | null;
};

export function buildRuntimeExecutionDispatchPreflight(
  input: BuildRuntimeExecutionDispatchPreflightInput,
): EdenExecutionDispatchPreflightRecord | null {
  const normalizedAdapterKey = input.adapterKey.trim().toLowerCase();
  const adapter = edenExecutionAdapterRegistry.find(
    (candidate) => candidate.adapterKey === normalizedAdapterKey,
  );

  if (!adapter) {
    return null;
  }

  if (!input.snapshot) {
    return {
      adapterKey: adapter.adapterKey,
      adapterKind: adapter.adapterKind,
      adapterLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      adapterMode: normalizeAdapterMode(adapter.adapterMode),
      dispatchStatus: "blocked",
      ready: false,
      reviewRequired: false,
      summary: `${adapter.label} could not prepare a dispatch record.`,
      detail:
        "Runtime governance metadata is unavailable, so Eden cannot safely prepare an execution dispatch record.",
      dispatchReason:
        "Runtime governance snapshot missing during execution-dispatch preflight.",
      blockingReason:
        "Load runtime config, approvals, and secret-boundary records before preparing dispatch.",
      capabilityLabels: [...adapter.capabilityLabels],
      providerPreflight: null,
    };
  }

  if (
    !input.snapshot.ownerOnlyEnforced ||
    !input.snapshot.internalOnlyEnforced ||
    input.snapshot.accessPolicy !== "owner_only"
  ) {
    return {
      adapterKey: adapter.adapterKey,
      adapterKind: adapter.adapterKind,
      adapterLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      adapterMode: normalizeAdapterMode(adapter.adapterMode),
      dispatchStatus: "blocked",
      ready: false,
      reviewRequired: false,
      summary: `${adapter.label} dispatch preparation was blocked by runtime boundary policy.`,
      detail:
        "OpenClaw-style execution scaffolding is owner-only and internal-only in v1. This runtime is not currently constrained tightly enough for governed dispatch.",
      dispatchReason:
        "Runtime must remain owner-only and internal-only before tool or browser execution metadata can be prepared.",
      blockingReason:
        "Tighten runtime access or boundary flags before preparing execution dispatch.",
      capabilityLabels: [...adapter.capabilityLabels],
      providerPreflight: null,
    };
  }

  if (
    adapter.adapterKind !== "provider" &&
    !["sandbox_task_runner_v1", "future_runtime_agent"].includes(
      input.snapshot.executionMode?.toLowerCase() ?? "",
    )
  ) {
    return {
      adapterKey: adapter.adapterKey,
      adapterKind: adapter.adapterKind,
      adapterLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      adapterMode: normalizeAdapterMode(adapter.adapterMode),
      dispatchStatus: "blocked",
      ready: false,
      reviewRequired: false,
      summary: `${adapter.label} dispatch preparation is blocked by runtime execution mode.`,
      detail:
        "This runtime is still configured as control-plane-only, so Eden will not prepare tool or browser execution handoff metadata.",
      dispatchReason:
        "Tool and browser dispatch scaffolding requires sandbox-task-runner or future-runtime-agent mode.",
      blockingReason:
        "Update runtime execution mode before preparing tool or browser dispatch.",
      capabilityLabels: [...adapter.capabilityLabels],
      providerPreflight: null,
    };
  }

  if (adapter.adapterKind === "provider") {
    const providerKey = input.providerKey?.trim().toLowerCase() ?? "";

    if (!providerKey) {
      return {
        adapterKey: adapter.adapterKey,
        adapterKind: adapter.adapterKind,
        adapterLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        adapterMode: normalizeAdapterMode(adapter.adapterMode),
        dispatchStatus: "blocked",
        ready: false,
        reviewRequired: false,
        summary: `${adapter.label} dispatch preparation needs a provider selection.`,
        detail:
          "Provider dispatch intent was requested without selecting an approved provider, so Eden recorded no live execution attempt.",
        dispatchReason:
          "A concrete provider is required before provider dispatch can be evaluated.",
        blockingReason: "Select a provider before preparing provider dispatch.",
        capabilityLabels: [...adapter.capabilityLabels],
        providerPreflight: null,
      };
    }

    const providerPreflight = buildRuntimeProviderPreflight(
      input.snapshot,
      providerKey,
    );

    if (!providerPreflight) {
      return {
        adapterKey: adapter.adapterKey,
        adapterKind: adapter.adapterKind,
        adapterLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        adapterMode: normalizeAdapterMode(adapter.adapterMode),
        dispatchStatus: "blocked",
        ready: false,
        reviewRequired: false,
        summary: `${adapter.label} dispatch preparation could not resolve provider governance.`,
        detail:
          "The requested provider is outside Eden's approved adapter registry or runtime governance snapshot.",
        dispatchReason:
          "Provider governance could not be resolved during dispatch preflight.",
        blockingReason:
          "Select an approved provider and confirm runtime allowlist coverage.",
        capabilityLabels: [...adapter.capabilityLabels],
        providerPreflight: null,
      };
    }

    if (providerPreflight.runStatus === "prepared") {
      return {
        adapterKey: adapter.adapterKey,
        adapterKind: adapter.adapterKind,
        adapterLabel: adapter.label,
        adapterStatus: adapter.adapterStatus,
        adapterStatusLabel: adapter.adapterStatusLabel,
        adapterMode: normalizeAdapterMode(adapter.adapterMode),
        dispatchStatus: "review_required",
        ready: false,
        reviewRequired: true,
        summary: `${providerPreflight.providerLabel} provider dispatch passed governance preflight and now waits for owner review.`,
        detail:
          "Runtime policy, provider approval, and secret-boundary metadata are aligned, but Eden still records provider dispatch as preflight-only until live execution is wired and explicitly approved.",
        dispatchReason:
          "Governed provider dispatch can be proposed, but live provider execution remains disabled in v1.",
        blockingReason:
          "Owner review is required before any future live provider execution path is enabled.",
        capabilityLabels: [...adapter.capabilityLabels],
        providerPreflight,
      };
    }

    return {
      adapterKey: adapter.adapterKey,
      adapterKind: adapter.adapterKind,
      adapterLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      adapterMode: normalizeAdapterMode(adapter.adapterMode),
      dispatchStatus:
        providerPreflight.runStatus === "review_required"
          ? "review_required"
          : "blocked",
      ready: false,
      reviewRequired: providerPreflight.runStatus === "review_required",
      summary: providerPreflight.summary,
      detail: providerPreflight.detail,
      dispatchReason:
        "Provider dispatch remains governed by allowlist, approval, and secret-boundary preflight checks.",
      blockingReason: providerPreflight.detail,
      capabilityLabels: [...adapter.capabilityLabels],
      providerPreflight,
    };
  }

  if (adapter.adapterKind === "browser") {
    return {
      adapterKey: adapter.adapterKey,
      adapterKind: adapter.adapterKind,
      adapterLabel: adapter.label,
      adapterStatus: adapter.adapterStatus,
      adapterStatusLabel: adapter.adapterStatusLabel,
      adapterMode: normalizeAdapterMode(adapter.adapterMode),
      dispatchStatus: "review_required",
      ready: false,
      reviewRequired: true,
      summary: `${adapter.label} prepared a browser-session scaffold record and stopped for review.`,
      detail:
        "Eden can now record a governed browser dispatch intent, session role, and capability set, but live browser automation is not wired in v1.",
      dispatchReason:
        "Browser execution remains review-gated until a real session-isolated browser worker exists.",
      blockingReason:
        "Owner review is required before any browser execution path is enabled.",
      capabilityLabels: [...adapter.capabilityLabels],
      providerPreflight: null,
    };
  }

  return {
    adapterKey: adapter.adapterKey,
    adapterKind: adapter.adapterKind,
    adapterLabel: adapter.label,
    adapterStatus: adapter.adapterStatus,
    adapterStatusLabel: adapter.adapterStatusLabel,
    adapterMode: normalizeAdapterMode(adapter.adapterMode),
    dispatchStatus: "ready",
    ready: true,
    reviewRequired: false,
    summary: `${adapter.label} prepared a governed async-boundary record.`,
    detail:
      "Eden recorded the intended tool execution role, session, and dispatch metadata. No live tool execution was attempted in v1.",
    dispatchReason:
      "Tool execution scaffolding is ready for future async worker handoff inside the owner-only sandbox.",
    blockingReason: null,
    capabilityLabels: [...adapter.capabilityLabels],
    providerPreflight: null,
  };
}

function normalizeAdapterMode(value: string) {
  if (value === "preflight_only") {
    return "preflight_only" as const;
  }

  if (value === "future_live") {
    return "future_live" as const;
  }

  return "scaffold_only" as const;
}

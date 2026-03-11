"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";
import {
  ownerRuntimeConfigScopeOptions,
  ownerRuntimeExecutionModeOptions,
  ownerRuntimeProviderOptions,
  ownerRuntimeProviderPolicyModeOptions,
} from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeConfigPanelProps = {
  runtime: EdenProjectRuntimeRecord;
};

function getProviderStatusClasses(status: string) {
  if (status === "scaffold_allowed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "awaiting_secret" || status === "approval_required") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getSecretStatusClasses(status: string) {
  if (status === "configured") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "reserved") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function OwnerRuntimeConfigPanel({
  runtime,
}: OwnerRuntimeConfigPanelProps) {
  const router = useRouter();
  const [configScope, setConfigScope] = useState(
    runtime.configPolicy?.configScope ??
      (runtime.isOwnerOnly && runtime.isInternalOnly
        ? "owner_internal"
        : "business_runtime"),
  );
  const [executionMode, setExecutionMode] = useState(
    runtime.configPolicy?.executionMode ??
      (runtime.id === "runtime-eden-internal-sandbox"
        ? "sandbox_task_runner_v1"
        : "control_plane_only"),
  );
  const [providerPolicyMode, setProviderPolicyMode] = useState(
    runtime.configPolicy?.providerPolicyMode ?? "eden_approved_only",
  );
  const [allowedProviders, setAllowedProviders] = useState<string[]>(
    runtime.configPolicy?.allowedProviders ?? [],
  );
  const [defaultProvider, setDefaultProvider] = useState(
    runtime.configPolicy?.defaultProvider ?? "",
  );
  const [maxTaskBudgetLeaves, setMaxTaskBudgetLeaves] = useState(
    runtime.configPolicy?.maxTaskBudgetLeaves?.toString() ?? "",
  );
  const [monthlyBudgetLeaves, setMonthlyBudgetLeaves] = useState(
    runtime.configPolicy?.monthlyBudgetLeaves?.toString() ?? "",
  );
  const [modelPolicySummary, setModelPolicySummary] = useState(
    runtime.configPolicy?.modelPolicySummary ?? "",
  );
  const [secretPolicyReference, setSecretPolicyReference] = useState(
    runtime.configPolicy?.secretPolicyReference ?? "",
  );
  const [notes, setNotes] = useState(runtime.configPolicy?.notes ?? "");
  const [ownerOnlyEnforced, setOwnerOnlyEnforced] = useState(
    runtime.configPolicy?.ownerOnlyEnforced ?? runtime.isOwnerOnly,
  );
  const [internalOnlyEnforced, setInternalOnlyEnforced] = useState(
    runtime.configPolicy?.internalOnlyEnforced ?? runtime.isInternalOnly,
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleAllowedProvider(provider: string) {
    setAllowedProviders((currentProviders) => {
      if (currentProviders.includes(provider)) {
        const nextProviders = currentProviders.filter(
          (currentProvider) => currentProvider !== provider,
        );

        if (defaultProvider === provider) {
          setDefaultProvider(nextProviders[0] ?? "");
        }

        return nextProviders;
      }

      const nextProviders = [...currentProviders, provider];

      if (!defaultProvider) {
        setDefaultProvider(provider);
      }

      return nextProviders;
    });
  }

  async function handleSaveConfigPolicy() {
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/owner/project-runtimes/${runtime.id}/config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            configScope,
            executionMode,
            providerPolicyMode,
            allowedProviders,
            defaultProvider: defaultProvider || null,
            maxTaskBudgetLeaves,
            monthlyBudgetLeaves,
            modelPolicySummary,
            secretPolicyReference,
            notes,
            ownerOnlyEnforced,
            internalOnlyEnforced,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        changed?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not save that runtime config boundary policy.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: result.changed
          ? "Runtime config policy updated. Secret-boundary metadata and audit entries were refreshed."
          : "No config-policy change was detected, so Eden left the runtime unchanged.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not save that runtime config boundary policy.",
      });
    }
  }

  return (
    <section className="mt-5 rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Runtime config boundary
          </p>
          <h3 className="mt-2 text-lg font-semibold text-eden-ink">
            Config, providers, and secret boundaries
          </h3>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Store runtime config policy, approved provider scope, and secret-boundary
            metadata without exposing raw secrets or claiming live provider execution.
          </p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
          Metadata only
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        Runtime config and secret boundaries are control-plane records only. No
        raw secrets are stored here, and no provider call is activated from this panel.
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Config scope
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.configPolicy?.configScopeLabel ?? "Not structured yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Execution mode
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.configPolicy?.executionModeLabel ?? "Not structured yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Config scope
              </span>
              <select
                value={configScope}
                onChange={(event) => setConfigScope(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeConfigScopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Execution mode
              </span>
              <select
                value={executionMode}
                onChange={(event) => setExecutionMode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeExecutionModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Provider policy
              </span>
              <select
                value={providerPolicyMode}
                onChange={(event) => setProviderPolicyMode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeProviderPolicyModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Approved providers
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ownerRuntimeProviderOptions.map((option) => {
                  const isSelected = allowedProviders.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                        isSelected
                          ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                          : "border-eden-edge bg-white text-eden-muted"
                      }`}
                    >
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAllowedProvider(option.value)}
                        className="h-4 w-4 rounded border-eden-edge"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Default provider
              </span>
              <select
                value={defaultProvider}
                onChange={(event) => setDefaultProvider(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                <option value="">No default provider</option>
                {ownerRuntimeProviderOptions
                  .filter((option) => allowedProviders.includes(option.value))
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Task budget
                </span>
                <input
                  type="number"
                  min="0"
                  value={maxTaskBudgetLeaves}
                  onChange={(event) => setMaxTaskBudgetLeaves(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Monthly budget
                </span>
                <input
                  type="number"
                  min="0"
                  value={monthlyBudgetLeaves}
                  onChange={(event) => setMonthlyBudgetLeaves(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Model policy summary
              </span>
              <textarea
                value={modelPolicySummary}
                onChange={(event) => setModelPolicySummary(event.target.value)}
                rows={4}
                placeholder="Describe how provider and model use should be constrained"
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Secret policy reference
              </span>
              <input
                type="text"
                value={secretPolicyReference}
                onChange={(event) => setSecretPolicyReference(event.target.value)}
                placeholder="Metadata-only reference key"
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional control-plane notes"
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink">
                <input
                  type="checkbox"
                  checked={ownerOnlyEnforced}
                  onChange={(event) => setOwnerOnlyEnforced(event.target.checked)}
                  className="h-4 w-4 rounded border-eden-edge"
                />
                <span>Owner-only enforced</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink">
                <input
                  type="checkbox"
                  checked={internalOnlyEnforced}
                  onChange={(event) => setInternalOnlyEnforced(event.target.checked)}
                  className="h-4 w-4 rounded border-eden-edge"
                />
                <span>Internal-only enforced</span>
              </label>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveConfigPolicy}
              className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving config..." : "Save config policy"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Provider compatibility
              </p>
              <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {runtime.providerCompatibility.length} approved
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {runtime.providerCompatibility.map((provider) => (
                <article
                  key={provider.providerKey}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">
                        {provider.providerLabel}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {provider.adapterStatusLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getProviderStatusClasses(
                        provider.compatibilityStatus,
                      )}`}
                    >
                      {provider.compatibilityStatusLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {provider.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {provider.capabilityLabels.map((capabilityLabel) => (
                      <span
                        key={capabilityLabel}
                        className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted"
                      >
                        {capabilityLabel}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Secret boundaries
              </p>
              <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {runtime.secretBoundaries.length} tracked
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {runtime.secretBoundaries.length ? (
                runtime.secretBoundaries.map((boundary) => (
                  <article
                    key={boundary.id}
                    className="rounded-2xl border border-eden-edge bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-eden-ink">
                          {boundary.label}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                          {boundary.secretTypeLabel} | {boundary.secretScopeLabel}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getSecretStatusClasses(
                          boundary.status,
                        )}`}
                      >
                        {boundary.statusLabel}
                      </span>
                    </div>
                    {boundary.description ? (
                      <p className="mt-3 text-sm leading-6 text-eden-muted">
                        {boundary.description}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Visibility
                        </p>
                        <p className="mt-2 text-sm text-eden-ink">
                          {boundary.visibilityPolicyLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Required
                        </p>
                        <p className="mt-2 text-sm text-eden-ink">
                          {boundary.isRequired ? "Required" : "Optional"}
                        </p>
                      </div>
                    </div>
                    {boundary.boundaryReference ? (
                      <p className="mt-3 text-xs text-eden-muted">
                        Reference: {boundary.boundaryReference}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-eden-muted">
                      Updated {boundary.updatedAtLabel}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                  No secret boundaries are registered yet for this runtime.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

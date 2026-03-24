"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";
import {
  ownerRuntimeConfigScopeOptions,
  ownerRuntimeExecutionModeOptions,
  ownerRuntimeProviderApprovalStatusOptions,
  ownerRuntimeProviderOptions,
  ownerRuntimeProviderPolicyModeOptions,
  ownerRuntimeSecretStatusOptions,
} from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeConfigPanelProps = {
  runtime: EdenProjectRuntimeRecord;
};

function parseScopeInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

function getStatusClasses(status: string) {
  if (
    status === "configured" ||
    status === "completed" ||
    status === "prepared" ||
    status === "scaffold_allowed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "pending" ||
    status === "reserved" ||
    status === "review_required" ||
    status === "approval_required" ||
    status === "awaiting_secret"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function OwnerRuntimeConfigPanel({
  runtime,
}: OwnerRuntimeConfigPanelProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [configScope, setConfigScope] = useState(
    runtime.configPolicy?.configScope ?? "owner_internal",
  );
  const [executionMode, setExecutionMode] = useState(
    runtime.configPolicy?.executionMode ?? "control_plane_only",
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
  const [secretPolicyReference, setSecretPolicyReference] = useState(
    runtime.configPolicy?.secretPolicyReference ?? "",
  );
  const [modelPolicySummary, setModelPolicySummary] = useState(
    runtime.configPolicy?.modelPolicySummary ?? "",
  );
  const [notes, setNotes] = useState(runtime.configPolicy?.notes ?? "");
  const [ownerOnlyEnforced, setOwnerOnlyEnforced] = useState(
    runtime.configPolicy?.ownerOnlyEnforced ?? runtime.isOwnerOnly,
  );
  const [internalOnlyEnforced, setInternalOnlyEnforced] = useState(
    runtime.configPolicy?.internalOnlyEnforced ?? runtime.isInternalOnly,
  );
  const [approvalState, setApprovalState] = useState<Record<string, string>>(
    Object.fromEntries(
      ownerRuntimeProviderOptions.map((option) => [
        option.value,
        runtime.providerApprovals.find((item) => item.providerKey === option.value)
          ?.approvalStatus ?? "review_required",
      ]),
    ),
  );
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>(
    Object.fromEntries(
      ownerRuntimeProviderOptions.map((option) => [
        option.value,
        runtime.providerApprovals.find((item) => item.providerKey === option.value)
          ?.notes ?? "",
      ]),
    ),
  );
  const [approvalModelScope, setApprovalModelScope] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      ownerRuntimeProviderOptions.map((option) => [
        option.value,
        runtime.providerApprovals
          .find((item) => item.providerKey === option.value)
          ?.modelScope.join(", ") ?? "",
      ]),
    ),
  );
  const [secretState, setSecretState] = useState<Record<string, string>>(
    Object.fromEntries(
      runtime.secretBoundaries.map((boundary) => [boundary.id, boundary.status]),
    ),
  );
  const [secretDetail, setSecretDetail] = useState<Record<string, string>>(
    Object.fromEntries(
      runtime.secretBoundaries.map((boundary) => [
        boundary.id,
        boundary.statusDetail ?? "",
      ]),
    ),
  );

  function toggleAllowedProvider(provider: string) {
    setAllowedProviders((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider],
    );
  }

  async function refreshWithMessage(message: string) {
    setFeedback(message);
    startTransition(() => router.refresh());
  }

  async function saveConfig() {
    const response = await fetch(`/api/owner/project-runtimes/${runtime.id}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configScope,
        executionMode,
        providerPolicyMode,
        allowedProviders,
        defaultProvider: defaultProvider || null,
        maxTaskBudgetLeaves,
        monthlyBudgetLeaves,
        secretPolicyReference,
        modelPolicySummary,
        notes,
        ownerOnlyEnforced,
        internalOnlyEnforced,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFeedback(result.error ?? "Eden could not save runtime config policy.");
      return;
    }
    await refreshWithMessage(
      "Runtime config policy updated. Provider and secret governance remains control-plane only.",
    );
  }

  async function saveApproval(providerKey: string) {
    const response = await fetch(
      `/api/owner/project-runtimes/${runtime.id}/provider-approvals`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey,
          approvalStatus: approvalState[providerKey],
          modelScope: parseScopeInput(approvalModelScope[providerKey] ?? ""),
          capabilityScope: [],
          notes: approvalNotes[providerKey] || null,
        }),
      },
    );
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFeedback(result.error ?? "Eden could not save provider approval.");
      return;
    }
    await refreshWithMessage("Provider approval gate updated.");
  }

  async function saveSecret(boundaryId: string) {
    const response = await fetch(
      `/api/owner/project-runtimes/${runtime.id}/secret-boundaries`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boundaryId,
          status: secretState[boundaryId],
          statusDetail: secretDetail[boundaryId] || null,
          lastCheckedAction: "set_now",
        }),
      },
    );
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFeedback(result.error ?? "Eden could not save secret readiness.");
      return;
    }
    await refreshWithMessage(
      "Secret-boundary readiness updated. Eden still stores status only, not secret values.",
    );
  }

  return (
    <section className="mt-5 rounded-[28px] border border-white/8 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Runtime governance
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Config, approvals, readiness, and governed runs
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Owner-only control-plane records. No raw secrets are shown and no live
            provider calls are executed from this surface.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {feedback}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Runtime policy</p>
          <div className="mt-4 grid gap-3">
            <select value={configScope} onChange={(event) => setConfigScope(event.target.value)} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
              {ownerRuntimeConfigScopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={executionMode} onChange={(event) => setExecutionMode(event.target.value)} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
              {ownerRuntimeExecutionModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={providerPolicyMode} onChange={(event) => setProviderPolicyMode(event.target.value)} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
              {ownerRuntimeProviderPolicyModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              {ownerRuntimeProviderOptions.map((option) => (
                <label key={option.value} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
                  <span>{option.label}</span>
                  <input type="checkbox" checked={allowedProviders.includes(option.value)} onChange={() => toggleAllowedProvider(option.value)} />
                </label>
              ))}
            </div>
            <select value={defaultProvider} onChange={(event) => setDefaultProvider(event.target.value)} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
              <option value="">No default provider</option>
              {ownerRuntimeProviderOptions.filter((option) => allowedProviders.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={maxTaskBudgetLeaves} onChange={(event) => setMaxTaskBudgetLeaves(event.target.value)} placeholder="Task budget" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
              <input value={monthlyBudgetLeaves} onChange={(event) => setMonthlyBudgetLeaves(event.target.value)} placeholder="Monthly budget" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
            </div>
            <input value={secretPolicyReference} onChange={(event) => setSecretPolicyReference(event.target.value)} placeholder="Secret policy reference" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
            <textarea value={modelPolicySummary} onChange={(event) => setModelPolicySummary(event.target.value)} rows={3} placeholder="Model policy summary" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Policy notes" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
                <input type="checkbox" checked={ownerOnlyEnforced} onChange={(event) => setOwnerOnlyEnforced(event.target.checked)} />
                <span>Owner-only enforced</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
                <input type="checkbox" checked={internalOnlyEnforced} onChange={(event) => setInternalOnlyEnforced(event.target.checked)} />
                <span>Internal-only enforced</span>
              </label>
            </div>
            <button type="button" disabled={isPending} onClick={saveConfig} className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
              {isPending ? "Saving..." : "Save config policy"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Provider approvals</p>
            <div className="mt-4 space-y-3">
              {runtime.providerCompatibility.map((provider) => (
                <article key={provider.providerKey} className="rounded-2xl border border-white/8 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{provider.providerLabel}</p>
                      <p className="mt-1 text-xs text-white/50">{provider.reason}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getStatusClasses(provider.compatibilityStatus)}`}>{provider.compatibilityStatusLabel}</span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <select value={approvalState[provider.providerKey]} onChange={(event) => setApprovalState((current) => ({ ...current, [provider.providerKey]: event.target.value }))} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
                      {ownerRuntimeProviderApprovalStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input value={approvalModelScope[provider.providerKey] ?? ""} onChange={(event) => setApprovalModelScope((current) => ({ ...current, [provider.providerKey]: event.target.value }))} placeholder="Model scope" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
                    <textarea value={approvalNotes[provider.providerKey] ?? ""} onChange={(event) => setApprovalNotes((current) => ({ ...current, [provider.providerKey]: event.target.value }))} rows={2} placeholder="Approval notes" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
                    <button type="button" disabled={isPending || !allowedProviders.includes(provider.providerKey)} onClick={() => saveApproval(provider.providerKey)} className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                      Save provider gate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Secret readiness</p>
            <div className="mt-4 space-y-3">
              {runtime.secretBoundaries.map((boundary) => (
                <article key={boundary.id} className="rounded-2xl border border-white/8 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{boundary.label}</p>
                      <p className="mt-1 text-xs text-white/50">{boundary.lastCheckedAtLabel ?? "Not checked yet"}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getStatusClasses(boundary.status)}`}>{boundary.statusLabel}</span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <select value={secretState[boundary.id]} onChange={(event) => setSecretState((current) => ({ ...current, [boundary.id]: event.target.value }))} className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white">
                      {ownerRuntimeSecretStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <textarea value={secretDetail[boundary.id] ?? ""} onChange={(event) => setSecretDetail((current) => ({ ...current, [boundary.id]: event.target.value }))} rows={2} placeholder="Readiness detail" className="rounded-2xl border border-white/8 bg-white px-3 py-2 text-sm text-white" />
                    <button type="button" disabled={isPending} onClick={() => saveSecret(boundary.id)} className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                      Save readiness
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Recent governed runs</p>
            <div className="mt-4 space-y-3">
              {runtime.agentRuns.length ? runtime.agentRuns.map((run) => (
                <article key={run.id} className="rounded-2xl border border-white/8 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{run.summary}</p>
                      <p className="mt-1 text-xs text-white/50">{run.requestedActionTypeLabel}{run.providerLabel ? ` | ${run.providerLabel}` : ""}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getStatusClasses(run.runStatus)}`}>{run.runStatusLabel}</span>
                  </div>
                  {run.detail ? <p className="mt-3 text-sm text-white/50">{run.detail}</p> : null}
                  {run.resultPayloadSummary ? <p className="mt-2 text-xs text-white/50">Result snapshot: {run.resultPayloadSummary}</p> : null}
                </article>
              )) : (
                <div className="rounded-2xl border border-white/8 bg-white p-4 text-sm text-white/50">
                  No governed agent-run records are stored yet for this runtime.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

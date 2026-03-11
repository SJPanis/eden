"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";
import {
  ownerRuntimeHealthCheckActionOptions,
  ownerRuntimeLifecycleStatusOptions,
} from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeLifecyclePanelProps = {
  runtime: EdenProjectRuntimeRecord;
};

export function OwnerRuntimeLifecyclePanel({
  runtime,
}: OwnerRuntimeLifecyclePanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(runtime.status);
  const [statusDetail, setStatusDetail] = useState(runtime.statusDetail ?? "");
  const [healthCheckAction, setHealthCheckAction] = useState("keep");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSaveLifecycle() {
    setFeedback(null);

    try {
      const response = await fetch(`/api/owner/project-runtimes/${runtime.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          statusDetail,
          healthCheckAction,
        }),
      });
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
            "Eden could not save that runtime lifecycle update.",
        });
        return;
      }

      setHealthCheckAction("keep");
      setFeedback({
        tone: "success",
        text: result.changed
          ? "Runtime lifecycle metadata updated. Audit entries were recorded."
          : "No lifecycle change was detected, so Eden left the runtime record unchanged.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not save that runtime lifecycle update.",
      });
    }
  }

  return (
    <section className="mt-5 rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Runtime lifecycle
          </p>
          <h3 className="mt-2 text-lg font-semibold text-eden-ink">
            Owner lifecycle controls
          </h3>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Update runtime lifecycle metadata and review recent control actions.
            These actions are audit-logged but do not start containers, trigger
            infrastructure jobs, or change deployment reality.
          </p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
          Control plane only
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        Runtime lifecycle changes update metadata only. No runtime process,
        container, preview deploy, or domain handoff is executed here.
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
                Current status
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.statusLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Last health check
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.lastHealthCheckAtLabel ?? "Not checked yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeLifecycleStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Status detail
              </span>
              <textarea
                value={statusDetail}
                onChange={(event) => setStatusDetail(event.target.value)}
                rows={4}
                placeholder="Describe the current runtime control-plane state"
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Health check
              </span>
              <select
                value={healthCheckAction}
                onChange={(event) => setHealthCheckAction(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeHealthCheckActionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveLifecycle}
              className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving lifecycle..." : "Save lifecycle update"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Recent audit entries
            </p>
            <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
              {runtime.auditEntries.length} recent
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {runtime.auditEntries.length ? (
              runtime.auditEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">
                        {entry.fieldLabel}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {entry.actorLabel}
                      </p>
                    </div>
                    <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                      {entry.createdAtLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {entry.detail}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Previous
                      </p>
                      <p className="mt-2 text-sm text-eden-ink">
                        {entry.previousValueLabel ?? "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Next
                      </p>
                      <p className="mt-2 text-sm text-eden-ink">
                        {entry.nextValueLabel ?? "Cleared"}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                No runtime lifecycle audit entries are stored yet for this runtime.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

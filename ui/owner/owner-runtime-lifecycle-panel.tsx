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
    <section className="mt-5 rounded-[28px] border border-white/8 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Runtime lifecycle
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Owner lifecycle controls
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Update runtime lifecycle metadata and review recent control actions.
            These actions are audit-logged but do not start containers, trigger
            infrastructure jobs, or change deployment reality.
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/50">
          Control plane only
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        Runtime lifecycle changes update metadata only. No runtime process,
        container, preview deploy, or domain handoff is executed here.
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/25 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                Current status
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {runtime.statusLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                Last health check
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {runtime.lastHealthCheckAtLabel ?? "Not checked yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
              >
                {ownerRuntimeLifecycleStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                Status detail
              </span>
              <textarea
                value={statusDetail}
                onChange={(event) => setStatusDetail(event.target.value)}
                rows={4}
                placeholder="Describe the current runtime control-plane state"
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                Health check
              </span>
              <select
                value={healthCheckAction}
                onChange={(event) => setHealthCheckAction(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
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
              className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving lifecycle..." : "Save lifecycle update"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Recent audit entries
            </p>
            <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
              {runtime.auditEntries.length} recent
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {runtime.auditEntries.length ? (
              runtime.auditEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {entry.fieldLabel}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                        {entry.actorLabel}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                      {entry.createdAtLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {entry.detail}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Previous
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {entry.previousValueLabel ?? "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Next
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {entry.nextValueLabel ?? "Cleared"}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4 text-sm leading-6 text-white/50">
                No runtime lifecycle audit entries are stored yet for this runtime.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

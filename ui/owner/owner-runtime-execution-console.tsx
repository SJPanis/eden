"use client";

import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeExecutionConsoleProps = {
  runtime: EdenProjectRuntimeRecord;
};

function getExecutionStatusClasses(status: string) {
  if (status === "ready" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "review_required" ||
    status === "prepared" ||
    status === "queued"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "blocked" || status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function OwnerRuntimeExecutionConsole({
  runtime,
}: OwnerRuntimeExecutionConsoleProps) {
  return (
    <section className="mt-5 rounded-[28px] border border-white/8 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Execution console
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Governed dispatch, sessions, and recent run history
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Owner-visible governed execution history. Eden records dispatch
            readiness, session role boundaries, and adapter intent here. The
            only live path in v1 is the owner-triggered OpenAI sandbox provider
            flow when governance and server credential checks pass. Browser and
            tool execution remain scaffolded.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/50">
            {runtime.dispatchHistory.length} dispatch records
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/50">
            {runtime.executionSessions.length} sessions
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Dispatch boundary
            </p>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-700">
              OpenAI live path only
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {runtime.dispatchHistory.length ? (
              runtime.dispatchHistory.map((record) => (
                <article
                  key={record.id}
                  className="rounded-2xl border border-white/8 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-white">
                        {record.summary}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                        {record.executionRoleLabel} | {record.adapterLabel} |{" "}
                        {record.dispatchModeLabel}
                        {record.providerLabel ? ` | ${record.providerLabel}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getExecutionStatusClasses(
                        record.dispatchStatus,
                      )}`}
                    >
                      {record.dispatchStatusLabel}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Session / task
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {record.sessionLabel ?? "No session label recorded."}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {record.taskTitle ?? "Runtime-level dispatch record"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Reason / blocker
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {record.dispatchReason ??
                          record.blockingReason ??
                          "No additional reason recorded."}
                      </p>
                      {record.reviewRequired ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Owner review remains required before any future live
                          execution path is enabled.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {record.detail ? (
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {record.detail}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>Prepared {record.preparedAtLabel}</span>
                    <span>{record.actorLabel}</span>
                    {record.modelLabel ? <span>{record.modelLabel}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white p-4 text-sm leading-6 text-white/50">
                No governed dispatch records exist yet. Sandbox tasks will start
                leaving explicit async-boundary metadata here when they are
                created with an execution adapter.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Execution sessions
            </p>
            <div className="mt-4 space-y-3">
              {runtime.executionSessions.length ? (
                runtime.executionSessions.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-white/8 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {session.sessionLabel}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                          {session.sessionTypeLabel} | {session.executionRoleLabel} |{" "}
                          {session.adapterKindLabel}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getExecutionStatusClasses(
                          session.status,
                        )}`}
                      >
                        {session.statusLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.allowedCapabilities.map((capability) => (
                        <span
                          key={capability}
                          className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                    {session.notes ? (
                      <p className="mt-3 text-sm leading-6 text-white/50">
                        {session.notes}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white p-4 text-sm leading-6 text-white/50">
                  No execution sessions are stored yet for this runtime.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Recent governed runs
            </p>
            <div className="mt-4 space-y-3">
              {runtime.agentRuns.length ? (
                runtime.agentRuns.map((run) => (
                  <article
                    key={run.id}
                    className="rounded-2xl border border-white/8 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {run.summary}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                          {run.requestedActionTypeLabel}
                          {run.providerLabel ? ` | ${run.providerLabel}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getExecutionStatusClasses(
                          run.runStatus,
                        )}`}
                      >
                        {run.runStatusLabel}
                      </span>
                    </div>
                    {run.detail ? (
                      <p className="mt-3 text-sm text-white/50">{run.detail}</p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white p-4 text-sm leading-6 text-white/50">
                  No governed agent-run history exists yet for this runtime.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

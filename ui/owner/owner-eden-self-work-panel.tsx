"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenSelfWorkLoopState } from "@/modules/core/agents/eden-self-work-shared";

type OwnerEdenSelfWorkPanelProps = {
  initialState: EdenSelfWorkLoopState;
};

function getReadinessClasses(label: string) {
  if (label === "Ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (label === "Waiting") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (label === "Unavailable") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getApprovalClasses(label: string) {
  if (label === "Approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (label === "Blocked") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (label === "Owner Review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function OwnerEdenSelfWorkPanel({
  initialState,
}: OwnerEdenSelfWorkPanelProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleQueueNextTask() {
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/owner/project-runtimes/internal-sandbox/self-work",
        {
          method: "POST",
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        queueItem?: {
          title?: string;
        };
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not queue the next approved self-work item.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: result.queueItem?.title
          ? `Queued "${result.queueItem.title}" into the internal sandbox task runner. Planner and worker output were stored for owner review.`
          : "Queued the next approved Eden self-work item into the internal sandbox task runner.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not queue the next approved self-work item.",
      });
    }
  }

  return (
    <section className="rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Eden self-work loop
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-eden-ink">
            Owner-approved post-deploy control loop
          </h2>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Eden can now pull the next approved Eden-core task into the owner-only
            internal sandbox runtime. The queue stays canonical in repo state, and
            execution records stay in real sandbox task rows for review.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${getReadinessClasses(
            initialState.readinessLabel,
          )}`}
        >
          {initialState.readinessLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Scope
                </p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  {initialState.scopeLabel}
                </p>
              </div>
              <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {initialState.reviewModeLabel}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-eden-muted">
              {initialState.scopeDetail}
            </p>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {initialState.readinessDetail}
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Queue file
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eden-ink">
                  {initialState.queuePath}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Timeline file
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eden-ink">
                  {initialState.timelinePath}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Sandbox runtime
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eden-ink">
                  {initialState.sandboxRuntimeName ?? "Not registered yet"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Runtime status
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eden-ink">
                  {initialState.sandboxRuntimeStatusLabel ?? "Unavailable"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Control inputs
              </p>
              <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {initialState.inputs.length} tracked
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {initialState.inputs.map((input) => (
                <div
                  key={input.id}
                  className="rounded-2xl border border-eden-edge bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">
                        {input.label}
                      </p>
                      <p className="mt-1 text-xs text-eden-muted">
                        {input.repoPath}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                        input.status === "loaded"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {input.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Next approved Eden tasks
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Queue only one approved Eden-core task at a time into the internal sandbox.
                </p>
              </div>
              <button
                type="button"
                disabled={!initialState.ready || isPending}
                onClick={handleQueueNextTask}
                className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Queueing..." : "Queue next approved task"}
              </button>
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

            <div className="mt-4 space-y-3">
              {initialState.queue.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    item.isNextApproved
                      ? "border-eden-ring bg-white"
                      : "border-eden-edge bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-eden-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {item.chapter} | {item.laneLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getApprovalClasses(
                        item.approvalStateLabel,
                      )}`}
                    >
                      {item.approvalStateLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {item.summary}
                  </p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Acceptance
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-eden-muted">
                        {item.acceptanceCriteria.map((criterion) => (
                          <div
                            key={criterion}
                            className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                          >
                            {criterion}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Queue state
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-eden-muted">
                        <div className="rounded-2xl border border-eden-edge bg-white px-3 py-2">
                          {item.requiresOwnerReview
                            ? "Owner review is required after this task."
                            : "Owner review can still intervene before the next queue item."}
                        </div>
                        {item.blockedBy.length ? (
                          item.blockedBy.map((blocker) => (
                            <div
                              key={blocker}
                              className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700"
                            >
                              {blocker}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-eden-edge bg-white px-3 py-2">
                            No explicit blocker is recorded for this queue item.
                          </div>
                        )}
                        {item.linkedTask ? (
                          <div className="rounded-2xl border border-eden-edge bg-white px-3 py-2">
                            <p className="font-semibold text-eden-ink">
                              {item.linkedTask.statusLabel}: {item.linkedTask.title}
                            </p>
                            <p className="mt-1">
                              Created {item.linkedTask.createdAtLabel}
                              {item.linkedTask.completedAtLabel
                                ? ` | Completed ${item.linkedTask.completedAtLabel}`
                                : ""}
                            </p>
                            {item.linkedTask.workerSummary ? (
                              <p className="mt-1">{item.linkedTask.workerSummary}</p>
                            ) : null}
                            {item.linkedTask.failureDetail ? (
                              <p className="mt-1 text-rose-700">
                                {item.linkedTask.failureDetail}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!initialState.queue.length ? (
              <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                No Eden self-work queue items are currently available.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

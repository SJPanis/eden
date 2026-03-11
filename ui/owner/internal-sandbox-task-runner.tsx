"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  EdenProjectRuntimeRecord,
  EdenProjectRuntimeTaskRecord,
} from "@/modules/core/projects/project-runtime-shared";

type InternalSandboxTaskRunnerProps = {
  runtime: EdenProjectRuntimeRecord;
  initialTasks: EdenProjectRuntimeTaskRecord[];
  initialUnavailableReason?: string | null;
};

function getTaskStatusClasses(status: string) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "running" || status === "planning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function InternalSandboxTaskRunner({
  runtime,
  initialTasks,
  initialUnavailableReason,
}: InternalSandboxTaskRunnerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreateTask() {
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/owner/project-runtimes/internal-sandbox/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            inputText,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not create that internal sandbox runtime task.",
        });
        return;
      }

      setTitle("");
      setInputText("");
      setFeedback({
        tone: "success",
        text:
          "Sandbox task recorded. Lead/Planner and Worker outputs were stored as metadata only; no real isolated runtime was executed.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not create that internal sandbox runtime task.",
      });
    }
  }

  return (
    <section className="mt-5 rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Internal sandbox task runner
          </p>
          <h3 className="mt-2 text-lg font-semibold text-eden-ink">
            {runtime.name}
          </h3>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Owner-only sandbox task runner for the Eden Internal Sandbox Runtime.
            The Lead/Planner and Worker steps are deterministic control-plane
            records only. This does not start a real container, deploy code, or
            publish a live runtime.
          </p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
          {initialTasks.length} stored
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        Execution mode: synchronous sandbox v1. Eden stores a planner record and
        worker result in the control plane for owner review.
      </div>

      {initialUnavailableReason ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {initialUnavailableReason}
        </div>
      ) : null}

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
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Create sandbox task
          </p>
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            Describe the sandbox work item you want the internal planner and
            worker loop to record.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional task title"
              className="w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
            />
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Describe the internal sandbox task, desired output, and constraints"
              rows={7}
              className="w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
            />
            <button
              type="button"
              disabled={isPending || Boolean(initialUnavailableReason)}
              onClick={handleCreateTask}
              className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Running sandbox task..." : "Create sandbox task"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Stored task runs
            </p>
            <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
              Owner only
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {initialTasks.length ? (
              initialTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-eden-ink">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {task.taskTypeLabel} | {task.executionModeLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getTaskStatusClasses(
                        task.status,
                      )}`}
                    >
                      {task.statusLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {task.inputText}
                  </p>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Lead/Planner
                      </p>
                      <p className="mt-2 text-sm text-eden-ink">
                        {task.plannerSummary ?? "Planner record not stored."}
                      </p>
                      {task.plannerWorkItems.length ? (
                        <div className="mt-3 space-y-2 text-sm text-eden-muted">
                          {task.plannerWorkItems.map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Worker result
                      </p>
                      <p className="mt-2 text-sm text-eden-ink">
                        {task.workerSummary ??
                          task.failureDetail ??
                          "Worker output not stored."}
                      </p>
                      {task.outputLines.length ? (
                        <div className="mt-3 space-y-2 text-sm text-eden-muted">
                          {task.outputLines.map((line) => (
                            <div
                              key={line}
                              className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {(task.workerActionPlan.length ||
                    task.workerArtifacts.length ||
                    task.workerImplementationNotes.length) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Action plan
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-eden-muted">
                          {task.workerActionPlan.map((step) => (
                            <div
                              key={step}
                              className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                            >
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Notes
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-eden-muted">
                          {task.workerImplementationNotes.map((note) => (
                            <div
                              key={note}
                              className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                            >
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Stored artifacts
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-eden-muted">
                          {task.workerArtifacts.map((artifact) => (
                            <div
                              key={`${artifact.label}-${artifact.detail}`}
                              className="rounded-2xl border border-eden-edge bg-white px-3 py-2"
                            >
                              <p className="font-semibold text-eden-ink">
                                {artifact.label}
                              </p>
                              <p className="mt-1">{artifact.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-eden-muted">
                    <span>Created {task.createdAtLabel}</span>
                    {task.completedAtLabel ? (
                      <span>Completed {task.completedAtLabel}</span>
                    ) : null}
                    <span>{task.creatorLabel}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                No sandbox task runs are stored yet. Create the first internal task
                to record a planner and worker result for the owner-only sandbox.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

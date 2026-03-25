"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  EdenProjectRuntimeRecord,
  EdenProjectRuntimeTaskRecord,
} from "@/modules/core/projects/project-runtime-shared";
import {
  ownerRuntimeExecutionAdapterOptions,
  ownerRuntimeExecutionRoleOptions,
  ownerRuntimeProviderOptions,
  ownerRuntimeTaskRequestedActionOptions,
} from "@/modules/core/projects/project-runtime-shared";

type InternalSandboxTaskRunnerProps = {
  runtime: EdenProjectRuntimeRecord;
  initialTasks: EdenProjectRuntimeTaskRecord[];
  initialUnavailableReason?: string | null;
};

function getTaskStatusClasses(status: string) {
  if (status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "running" || status === "planning") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (status === "failed") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

export function InternalSandboxTaskRunner({
  runtime,
  initialTasks,
  initialUnavailableReason,
}: InternalSandboxTaskRunnerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [providerKey, setProviderKey] = useState("");
  const [modelLabel, setModelLabel] = useState("");
  const [requestedActionType, setRequestedActionType] =
    useState("sandbox_test");
  const [executionRole, setExecutionRole] = useState("tool_worker");
  const [adapterKey, setAdapterKey] = useState("tool_adapter");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [activeExecutionTaskId, setActiveExecutionTaskId] = useState<
    string | null
  >(null);
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
            providerKey: providerKey || null,
            modelLabel: modelLabel || null,
            requestedActionType,
            executionRole,
            adapterKey,
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
      setProviderKey("");
      setModelLabel("");
      setRequestedActionType("sandbox_test");
      setExecutionRole("tool_worker");
      setAdapterKey("tool_adapter");
      setFeedback({
        tone: "success",
        text:
          "Sandbox task recorded. Planner, worker, result, and governed dispatch/session preflight records were stored in the control plane only.",
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

  async function handleRunLiveProviderTask(taskId: string) {
    setFeedback(null);
    setActiveExecutionTaskId(taskId);

    try {
      const response = await fetch(
        `/api/owner/project-runtimes/internal-sandbox/tasks/${taskId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        executed?: boolean;
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not run that live sandbox provider execution path.",
        });
        return;
      }

      setFeedback({
        tone: result.executed ? "success" : "error",
        text:
          result.message ??
          (result.executed
            ? "Live sandbox provider result stored for owner review."
            : "Live sandbox provider execution was blocked or failed."),
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not run that live sandbox provider execution path.",
      });
    } finally {
      setActiveExecutionTaskId(null);
    }
  }

  return (
    <section className="mt-5 rounded-[28px] border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Internal sandbox task runner
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {runtime.name}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Owner-only sandbox task runner for the Eden Internal Sandbox Runtime.
            The Lead/Planner and Worker steps are deterministic control-plane
            records only. One guarded live OpenAI path can now be triggered per
            task when provider approval, secret readiness, and server credential
            checks all pass. This still does not start a container, deploy code,
            or publish a live runtime.
          </p>
        </div>
        <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/50">
          {initialTasks.length} stored
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        Execution mode: synchronous sandbox v1 plus governed async-boundary
        metadata. OpenAI is the only live provider path in v1, and only for
        owner-triggered internal sandbox tasks that pass runtime policy and
        server-credential checks. Browser and tool execution remain scaffolded.
      </div>

      {initialUnavailableReason ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {initialUnavailableReason}
        </div>
      ) : null}

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
        <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
            Create sandbox task
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Describe the sandbox work item you want the internal planner and
            worker loop to record. Select the intended execution role and adapter
            so Eden can also capture a governed dispatch/session record. Provider
            and browser paths remain preflight-only at creation time. A real
            live provider call can only be triggered later from an eligible
            stored OpenAI task.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional task title"
              className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={requestedActionType}
                onChange={(event) => setRequestedActionType(event.target.value)}
                className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
              >
                {ownerRuntimeTaskRequestedActionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={executionRole}
                onChange={(event) => setExecutionRole(event.target.value)}
                className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
              >
                {ownerRuntimeExecutionRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={providerKey}
                onChange={(event) => setProviderKey(event.target.value)}
                className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
              >
                <option value="">No provider preflight</option>
                {ownerRuntimeProviderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={adapterKey}
                onChange={(event) => setAdapterKey(event.target.value)}
                className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
              >
                {ownerRuntimeExecutionAdapterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={modelLabel}
              onChange={(event) => setModelLabel(event.target.value)}
              placeholder="Optional model label for a governed preflight"
              className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
            />
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Describe the internal sandbox task, desired output, and constraints"
              rows={7}
              className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2dd4bf]/50"
            />
            <button
              type="button"
              disabled={isPending || Boolean(initialUnavailableReason)}
              onClick={handleCreateTask}
              className="rounded-full border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Running sandbox task..." : "Create sandbox task"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Stored task runs
            </p>
            <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
              Owner only
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {initialTasks.length ? (
              initialTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-white">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                        {task.taskTypeLabel} | {task.executionModeLabel}
                        {task.requestedActionTypeLabel
                          ? ` | ${task.requestedActionTypeLabel}`
                          : ""}
                        {task.providerLabel ? ` | ${task.providerLabel}` : ""}
                        {task.dispatchRecords[0]
                          ? ` | ${task.dispatchRecords[0].adapterLabel}`
                          : ""}
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

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {task.inputText}
                  </p>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Lead/Planner
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {task.plannerSummary ?? "Planner record not stored."}
                      </p>
                      {task.plannerWorkItems.length ? (
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.plannerWorkItems.map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Worker result
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {task.workerSummary ??
                          task.failureDetail ??
                          "Worker output not stored."}
                      </p>
                      {task.outputLines.length ? (
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.outputLines.map((line) => (
                            <div
                              key={line}
                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
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
                    task.workerImplementationNotes.length ||
                    task.agentRuns.length ||
                    task.dispatchRecords.length) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Action plan
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.workerActionPlan.map((step) => (
                            <div
                              key={step}
                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                            >
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Notes
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.workerImplementationNotes.map((note) => (
                            <div
                              key={note}
                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                            >
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Stored artifacts
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.workerArtifacts.map((artifact) => (
                            <div
                              key={`${artifact.label}-${artifact.detail}`}
                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                            >
                              <p className="font-semibold text-white">
                                {artifact.label}
                              </p>
                              <p className="mt-1">{artifact.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Governed runs
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.agentRuns.length ? (
                            task.agentRuns.map((run) => (
                              <div
                                key={run.id}
                                className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                              >
                                <p className="font-semibold text-white">
                                  {run.runStatusLabel}
                                </p>
                                <p className="mt-1">{run.summary}</p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2">
                              No governed run record stored.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Dispatch boundary
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-white/50">
                          {task.dispatchRecords.length ? (
                            task.dispatchRecords.map((record) => (
                              <div
                                key={record.id}
                                className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2"
                              >
                                <p className="font-semibold text-white">
                                  {record.dispatchStatusLabel}
                                </p>
                                <p className="mt-1">
                                  {record.executionRoleLabel} |{" "}
                                  {record.adapterLabel}
                                </p>
                                <p className="mt-1">
                                  {record.dispatchReason ??
                                    record.blockingReason ??
                                    record.summary}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2">
                              No dispatch metadata stored.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(task.resultSummary || task.resultStatusLabel) && (
                    <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Result capture
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {task.resultTypeLabel ?? "Recorded result"}
                        {task.resultStatusLabel
                          ? ` | ${task.resultStatusLabel}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-white/50">
                        {task.resultSummary ??
                          task.resultPayloadSummary ??
                          "No explicit result summary stored."}
                      </p>
                    </div>
                  )}

                  {task.providerKey === "openai" ? (
                    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="max-w-2xl">
                          <p className="text-xs uppercase tracking-[0.12em] text-emerald-400">
                            Live provider path
                          </p>
                          <p className="mt-2 text-sm text-emerald-300">
                            Owner-triggered OpenAI execution is available only
                            for internal sandbox tasks that pass provider
                            approval, secret-boundary status, and live server
                            credential checks.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={
                            isPending ||
                            Boolean(initialUnavailableReason) ||
                            activeExecutionTaskId === task.id
                          }
                          onClick={() => handleRunLiveProviderTask(task.id)}
                          className="rounded-full border border-emerald-300 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {activeExecutionTaskId === task.id
                            ? "Running live path..."
                            : "Run live OpenAI path"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {task.taskAuditEntries.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Task lifecycle audit
                      </p>
                      <div className="mt-2 space-y-1">
                        {task.taskAuditEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-white">
                                {entry.eventTypeLabel}
                              </span>
                              <span className="ml-2 text-white/50">
                                {entry.detail}
                              </span>
                            </div>
                            <span className="shrink-0 text-white/50">
                              {entry.createdAtLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>Created {task.createdAtLabel}</span>
                    {task.completedAtLabel ? (
                      <span>Completed {task.completedAtLabel}</span>
                    ) : null}
                    <span>{task.creatorLabel}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4 text-sm leading-6 text-white/50">
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

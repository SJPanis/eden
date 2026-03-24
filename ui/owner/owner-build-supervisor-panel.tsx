"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenBuildSupervisorState } from "@/modules/core/agents/eden-build-supervisor-shared";

type OwnerBuildSupervisorPanelProps = {
  initialState: EdenBuildSupervisorState;
};

function getStatusClasses(label: string) {
  if (label === "Ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (label === "Packet needed" || label === "Waiting") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (label === "Unavailable") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function getTaskReadinessClasses(label: string) {
  if (label === "Codex ready" || label === "Completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (label === "Queued in sandbox") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (label === "Pending review") {
    return "border-white/[0.07] bg-white/[0.05] text-white/40";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

export function OwnerBuildSupervisorPanel({
  initialState,
}: OwnerBuildSupervisorPanelProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [resultStatus, setResultStatus] = useState("completed");
  const [summary, setSummary] = useState("");
  const [verification, setVerification] = useState("");
  const [blockers, setBlockers] = useState("");
  const [humanActions, setHumanActions] = useState("");
  const [isPending, startTransition] = useTransition();
  const preparedTaskId =
    initialState.packet?.taskId ?? initialState.nextRecommendedTask?.id ?? "";
  const preparedTaskTitle =
    initialState.packet?.taskTitle ?? initialState.nextRecommendedTask?.title ?? null;

  async function handlePreparePacket() {
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/owner/project-runtimes/internal-sandbox/build-supervisor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "prepare_packet",
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        packet?: {
          taskTitle?: string | null;
        };
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not prepare the next Codex execution packet.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: result.packet?.taskTitle
          ? `Codex packet prepared for "${result.packet.taskTitle}".`
          : "Codex packet prepared for the next recommended Eden task.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not prepare the next Codex execution packet.",
      });
    }
  }

  async function handleIngestResult() {
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/owner/project-runtimes/internal-sandbox/build-supervisor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "ingest_result",
            taskId: preparedTaskId,
            resultStatus,
            summary,
            verification,
            blockers,
            humanActions,
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
            "Eden could not ingest the completed supervisor task result.",
        });
        return;
      }

      setSummary("");
      setVerification("");
      setBlockers("");
      setHumanActions("");
      setFeedback({
        tone: "success",
        text:
          resultStatus === "completed"
            ? "Supervisor result recorded. Eden refreshed the next packet if a new Codex-ready task exists."
            : "Supervisor result recorded. The current packet is now marked stale until the blocked/review state is resolved.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not ingest the completed supervisor task result.",
      });
    }
  }

  return (
    <section className="rounded-[28px] border border-white/8 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Build supervisor
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Owner-gated build orchestration
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Eden can now select the next Codex-ready self-work item, prepare a
            canonical execution packet, and ingest a completed result back into the
            repo memory files. This is supervised build orchestration only.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${getStatusClasses(
            initialState.statusLabel,
          )}`}
        >
          {initialState.statusLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        {initialState.statusDetail}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Supervisor state
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {initialState.reviewModeLabel}
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                {initialState.trackedHumanActions} human actions tracked
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-white/50">
                  State file
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {initialState.statePath}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Packet file
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {initialState.packetPath}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Missing inputs
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {initialState.missingControlInputs}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Packet ready
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {initialState.packetReady ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Next recommended task
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {initialState.nextRecommendedTask?.title ?? "No Codex-ready task"}
                </p>
              </div>
              {initialState.nextRecommendedTask ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getTaskReadinessClasses(
                    initialState.nextRecommendedTask.readinessLabel,
                  )}`}
                >
                  {initialState.nextRecommendedTask.readinessLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {initialState.nextRecommendedTask?.summary ??
                "The build supervisor does not currently have a Codex-ready task to prepare."}
            </p>
            {initialState.nextRecommendedTask ? (
              <div className="mt-4 space-y-2">
                {initialState.nextRecommendedTask.acceptanceCriteria.map((criterion) => (
                  <div
                    key={criterion}
                    className="rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white/50"
                  >
                    {criterion}
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              disabled={
                isPending ||
                !initialState.nextRecommendedTask ||
                Boolean(initialState.unavailableReason)
              }
              onClick={handlePreparePacket}
              className="mt-4 rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Working..." : "Prepare Codex packet"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Blocker state
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {initialState.blockedHeadTask?.title ?? "No blocked approved head task"}
            </p>
            <div className="mt-4 space-y-2">
              {(initialState.blockerDetails.length
                ? initialState.blockerDetails
                : ["No blocker detail is currently attached to the head task."])
                .slice(0, 5)
                .map((detail) => (
                  <div
                    key={detail}
                    className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
                  >
                    {detail}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Packet preview
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {initialState.packet?.taskTitle ?? "No packet prepared yet"}
                </p>
              </div>
              {initialState.packet ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getStatusClasses(
                    initialState.packet.status === "ready" ? "Ready" : "Blocked",
                  )}`}
                >
                  {initialState.packet.status}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {initialState.packet?.objective ??
                "Prepare a packet to write the next Codex-ready task into the canonical packet file."}
            </p>
            <div className="mt-4 space-y-2">
              {(initialState.packet?.likelyFiles.length
                ? initialState.packet.likelyFiles
                : ["Packet file has no likely-file hints yet."])
                .slice(0, 6)
                .map((entry) => (
                  <div
                    key={entry}
                    className="rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white/50"
                  >
                    {entry}
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Last completed task
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {initialState.lastCompletedTask?.title ?? "No completed task ingested yet"}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {initialState.lastCompletedTask?.summary ??
                "When a supervised Codex task is finished, record its summary here so Eden can refresh the canonical state and prepare the next step."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Ingest completed result
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Record the outcome of the currently prepared Codex packet. This
              updates the build-supervisor state and refreshes the managed Eden
              memory sections.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Prepared task
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preparedTaskTitle ?? "Prepare a packet first"}
                </p>
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Result status
                </span>
                <select
                  value={resultStatus}
                  onChange={(event) => setResultStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                >
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="review_required">Review required</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Summary
                </span>
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  placeholder="Summarize what Codex completed or why it stopped."
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Verification notes
                </span>
                <textarea
                  value={verification}
                  onChange={(event) => setVerification(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  placeholder="One verification item per line."
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Blockers
                </span>
                <textarea
                  value={blockers}
                  onChange={(event) => setBlockers(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  placeholder="One blocker per line if the task did not complete cleanly."
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-white/50">
                  Human actions
                </span>
                <textarea
                  value={humanActions}
                  onChange={(event) => setHumanActions(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  placeholder="One human-required action per line if owner follow-up is needed."
                />
              </label>
            </div>
            <button
              type="button"
              disabled={isPending || !preparedTaskId || !summary.trim()}
              onClick={handleIngestResult}
              className="mt-4 rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Working..." : "Ingest task result"}
            </button>
          </div>
        </div>
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
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";
import {
  ownerRuntimeDeploymentEventStatusOptions,
  ownerRuntimeDeploymentEventTypeOptions,
  ownerRuntimeLaunchIntentTypeOptions,
  ownerRuntimeLaunchModeOptions,
  ownerRuntimeLaunchTargetOptions,
} from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeLaunchPanelProps = {
  runtime: EdenProjectRuntimeRecord;
};

export function OwnerRuntimeLaunchPanel({
  runtime,
}: OwnerRuntimeLaunchPanelProps) {
  const router = useRouter();
  const [intentType, setIntentType] = useState(
    runtime.launchIntent?.intentType ?? "internal_preview",
  );
  const [intendedTarget, setIntendedTarget] = useState(
    runtime.launchIntent?.intendedTarget ?? runtime.target,
  );
  const [launchMode, setLaunchMode] = useState(
    runtime.launchIntent?.launchMode ?? "control_plane_only",
  );
  const [destinationLabel, setDestinationLabel] = useState(
    runtime.launchIntent?.destinationLabel ?? "",
  );
  const [notes, setNotes] = useState(runtime.launchIntent?.notes ?? "");
  const [deploymentEventType, setDeploymentEventType] = useState("manual_note");
  const [deploymentEventStatus, setDeploymentEventStatus] = useState("recorded");
  const [deploymentSummary, setDeploymentSummary] = useState("");
  const [deploymentDetail, setDeploymentDetail] = useState("");
  const [launchFeedback, setLaunchFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [deploymentFeedback, setDeploymentFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [activeAction, setActiveAction] = useState<"launch" | "deployment" | null>(
    null,
  );

  async function handleSaveLaunchIntent() {
    setLaunchFeedback(null);
    setActiveAction("launch");

    try {
      const response = await fetch(
        `/api/owner/project-runtimes/${runtime.id}/launch-intent`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intentType,
            intendedTarget,
            launchMode,
            destinationLabel,
            notes,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        changed?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setLaunchFeedback({
          tone: "error",
          text:
            result.error ?? "Eden could not save that runtime launch intent.",
        });
        return;
      }

      setLaunchFeedback({
        tone: "success",
        text: result.changed
          ? "Runtime launch intent updated. A deployment history record was added."
          : "No launch-intent change was detected, so Eden left the runtime unchanged.",
      });
      router.refresh();
    } catch {
      setLaunchFeedback({
        tone: "error",
        text: "Eden could not save that runtime launch intent.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleAddDeploymentRecord() {
    setDeploymentFeedback(null);
    setActiveAction("deployment");

    try {
      const response = await fetch(
        `/api/owner/project-runtimes/${runtime.id}/deployment-history`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: deploymentEventType,
            eventStatus: deploymentEventStatus,
            summary: deploymentSummary,
            detail: deploymentDetail,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setDeploymentFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not save that deployment-history record.",
        });
        return;
      }

      setDeploymentSummary("");
      setDeploymentDetail("");
      setDeploymentEventType("manual_note");
      setDeploymentEventStatus("recorded");
      setDeploymentFeedback({
        tone: "success",
        text: "Deployment-history record stored in the runtime control plane.",
      });
      router.refresh();
    } catch {
      setDeploymentFeedback({
        tone: "error",
        text: "Eden could not save that deployment-history record.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <section className="mt-5 rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Launch intent
          </p>
          <h3 className="mt-2 text-lg font-semibold text-eden-ink">
            Launch intent and deployment history
          </h3>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Structure how this runtime is intended to launch and record control-plane
            deployment history. These records do not provision infrastructure or claim
            real deployment execution.
          </p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
          Metadata only
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        Launch intent and deployment history are control-plane records only. No
        container, preview environment, Eden-managed host, or external domain is
        activated from this panel.
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Current launch intent
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.launchIntent?.intentTypeLabel ?? "Not structured yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Current launch mode
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
                {runtime.launchIntent?.launchModeLabel ?? "Not structured yet"}
              </p>
            </div>
          </div>

          {launchFeedback ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                launchFeedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {launchFeedback.text}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Intent type
              </span>
              <select
                value={intentType}
                onChange={(event) => setIntentType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeLaunchIntentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Intended target
              </span>
              <select
                value={intendedTarget}
                onChange={(event) => setIntendedTarget(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeLaunchTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Launch mode
              </span>
              <select
                value={launchMode}
                onChange={(event) => setLaunchMode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              >
                {ownerRuntimeLaunchModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Intended destination
              </span>
              <input
                type="text"
                value={destinationLabel}
                onChange={(event) => setDestinationLabel(event.target.value)}
                placeholder="Optional hostname, route, or destination label"
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
                rows={4}
                placeholder="Optional detail about the intended launch path"
                className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
              />
            </label>

            <button
              type="button"
              disabled={activeAction !== null}
              onClick={handleSaveLaunchIntent}
              className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {activeAction === "launch"
                ? "Saving launch intent..."
                : "Save launch intent"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Deployment history
            </p>
            <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
              {runtime.deploymentHistory.length} recent
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {runtime.deploymentHistory.length ? (
              runtime.deploymentHistory.map((record) => (
                <article
                  key={record.id}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">
                        {record.summary}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {record.eventTypeLabel} | {record.eventStatusLabel}
                      </p>
                    </div>
                    <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                      {record.createdAtLabel}
                    </span>
                  </div>
                  {record.detail ? (
                    <p className="mt-3 text-sm leading-6 text-eden-muted">
                      {record.detail}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-eden-muted">{record.actorLabel}</p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                No deployment-history records are stored for this runtime yet.
              </div>
            )}
          </div>

          {deploymentFeedback ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                deploymentFeedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {deploymentFeedback.text}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Add manual record
            </p>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Event type
                  </span>
                  <select
                    value={deploymentEventType}
                    onChange={(event) => setDeploymentEventType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                  >
                    {ownerRuntimeDeploymentEventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Result
                  </span>
                  <select
                    value={deploymentEventStatus}
                    onChange={(event) =>
                      setDeploymentEventStatus(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                  >
                    {ownerRuntimeDeploymentEventStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Summary
                </span>
                <input
                  type="text"
                  value={deploymentSummary}
                  onChange={(event) => setDeploymentSummary(event.target.value)}
                  placeholder="Short deployment-history summary"
                  className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Detail
                </span>
                <textarea
                  value={deploymentDetail}
                  onChange={(event) => setDeploymentDetail(event.target.value)}
                  rows={3}
                  placeholder="Optional deployment-history detail"
                  className="mt-2 w-full rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition-colors focus:border-eden-ring"
                />
              </label>

              <button
                type="button"
                disabled={activeAction !== null}
                onClick={handleAddDeploymentRecord}
                className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {activeAction === "deployment"
                  ? "Saving record..."
                  : "Add deployment record"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

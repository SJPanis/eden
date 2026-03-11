"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenProjectRuntimeRecord } from "@/modules/core/projects/project-runtime-shared";
import { edenOwnerInternalSandboxRuntimeId } from "@/modules/core/projects/project-runtime-shared";

type OwnerRuntimeRegistryProps = {
  initialRuntimes: EdenProjectRuntimeRecord[];
  initialUnavailableReason?: string | null;
};

function getRuntimeStatusClasses(status: string) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "configuring" || status === "registered") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function OwnerRuntimeRegistry({
  initialRuntimes,
  initialUnavailableReason,
}: OwnerRuntimeRegistryProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const ownerOnlyCount = initialRuntimes.filter((runtime) => runtime.isOwnerOnly).length;
  const internalOnlyCount = initialRuntimes.filter((runtime) => runtime.isInternalOnly).length;
  const activeDomainCount = initialRuntimes.reduce(
    (count, runtime) =>
      count + runtime.domainLinks.filter((link) => link.isActive).length,
    0,
  );
  const hasInternalSandbox = initialRuntimes.some(
    (runtime) => runtime.id === edenOwnerInternalSandboxRuntimeId,
  );

  async function handleInitializeInternalSandbox() {
    setFeedback(null);

    try {
      const response = await fetch("/api/owner/project-runtimes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "initialize_internal_sandbox",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text:
            result.error ??
            "Eden could not register the internal sandbox runtime.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: result.created
          ? "Internal Eden sandbox runtime registered. This is metadata only and does not provision a real isolated runtime yet."
          : "Internal Eden sandbox runtime already existed. The control-plane record was reconciled without changing the isolation claim.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not register the internal sandbox runtime.",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-eden-edge bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Runtime records
          </p>
          <p className="mt-2 text-lg font-semibold text-eden-ink">
            {initialRuntimes.length}
          </p>
          <p className="mt-1 text-xs text-eden-muted">
            Control-plane runtime metadata records linked to projects.
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Owner only
          </p>
          <p className="mt-2 text-lg font-semibold text-eden-ink">
            {ownerOnlyCount}
          </p>
          <p className="mt-1 text-xs text-eden-muted">
            Runtime records restricted to the Eden owner control surface.
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Internal only
          </p>
          <p className="mt-2 text-lg font-semibold text-eden-ink">
            {internalOnlyCount}
          </p>
          <p className="mt-1 text-xs text-eden-muted">
            Runtimes that stay inside Eden-owned private scope.
          </p>
        </div>
        <div className="rounded-2xl border border-eden-edge bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
            Active domains
          </p>
          <p className="mt-2 text-lg font-semibold text-eden-ink">
            {activeDomainCount}
          </p>
          <p className="mt-1 text-xs text-eden-muted">
            Linked routes or domains currently marked active.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-eden-edge bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Internal sandbox
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              Register the first owner-only runtime record for the private “Eden
              inside Eden” sandbox. This creates a dedicated internal business,
              project blueprint, and runtime metadata record so future isolation
              work has a concrete control-plane anchor.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending || Boolean(initialUnavailableReason)}
            onClick={handleInitializeInternalSandbox}
            className="rounded-full border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? "Registering sandbox..."
              : hasInternalSandbox
                ? "Reconcile internal sandbox"
                : "Register internal sandbox"}
          </button>
        </div>
        <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          Runtime control plane only. No container, deploy job, hosted preview, or
          linked production domain is provisioned by this step.
        </p>
        {initialUnavailableReason ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {initialUnavailableReason}
          </p>
        ) : null}
        {feedback ? (
          <p
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {initialRuntimes.length ? (
          initialRuntimes.map((runtime) => (
            <article
              key={runtime.id}
              className="rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    {runtime.runtimeTypeLabel}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-eden-ink">
                    {runtime.name}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {runtime.purpose}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getRuntimeStatusClasses(
                    runtime.status,
                  )}`}
                >
                  {runtime.statusLabel}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Linked project
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.projectTitle}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    {runtime.businessName}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Environment / target
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.environmentLabel}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    {runtime.targetLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Visibility / access
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.visibilityLabel}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    {runtime.accessPolicyLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Internal owner-only
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.isOwnerOnly && runtime.isInternalOnly ? "Yes" : "No"}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    Created by {runtime.creatorLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Hosted Eden URL
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.hostedUrl ?? "Not active yet"}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    Reserved for future Eden-managed runtime hosting.
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Internal preview
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.previewUrl ?? "Not active yet"}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    Placeholder for an owner-visible preview route.
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Linked domain
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {runtime.linkedDomain ?? "Not linked yet"}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    Future external custom domain handoff surface.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Runtime detail
                    </p>
                    <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                      {runtime.domainLinks.length} link
                      {runtime.domainLinks.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {runtime.statusDetail ??
                      "No status detail recorded yet for this runtime."}
                  </p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Runtime locator
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-eden-ink">
                        {runtime.runtimeLocator ?? "Not assigned yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Last health check
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-eden-ink">
                        {runtime.lastHealthCheckAtLabel ?? "Not checked yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Created
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-eden-ink">
                        {runtime.createdAtLabel}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Updated
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-eden-ink">
                        {runtime.updatedAtLabel}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Domain link registry
                  </p>
                  <div className="mt-3 space-y-3">
                    {runtime.domainLinks.length ? (
                      runtime.domainLinks.map((link) => (
                        <div
                          key={link.id}
                          className="rounded-2xl border border-eden-edge bg-white p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-eden-ink">
                                {link.urlLabel}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                                {link.linkTypeLabel}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {link.isPrimary ? (
                                <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                                  Primary
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                                  link.isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-700"
                                }`}
                              >
                                {link.isActive ? "Active" : "Planned"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                        No domain links are registered for this runtime yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-eden-edge bg-white p-6 text-sm leading-6 text-eden-muted">
            No runtime metadata records exist yet. Register the internal sandbox to
            establish Eden’s first project runtime control-plane record.
          </div>
        )}
      </div>
    </div>
  );
}

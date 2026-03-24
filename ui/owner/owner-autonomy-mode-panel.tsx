"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenAutonomyModeState } from "@/modules/core/agents/eden-autonomy-boundary";

type OwnerAutonomyModePanelProps = {
  initialState: EdenAutonomyModeState;
};

function getStageBadgeClasses(stage: string) {
  if (stage === "A") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function getScopeBadgeClasses(scope: string) {
  if (scope === "PRIVATE_DEV") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }
  return "border-rose-500/25 bg-rose-500/10 text-rose-300";
}

function getBlockerSeverityClasses(blocker: string) {
  if (blocker.includes("migration")) {
    return "text-rose-300";
  }
  if (blocker.includes("OPENAI_API_KEY") || blocker.includes("secret")) {
    return "text-amber-300";
  }
  return "text-slate-600";
}

export function OwnerAutonomyModePanel({
  initialState,
}: OwnerAutonomyModePanelProps) {
  const router = useRouter();
  const [state, setState] = useState<EdenAutonomyModeState>(initialState);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  function handleRefresh() {
    startTransition(async () => {
      try {
        const res = await fetch(
          "/api/owner/project-runtimes/internal-sandbox/autonomy",
          { method: "GET" },
        );
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; state: EdenAutonomyModeState };
          if (data.ok) {
            setState(data.state);
            router.refresh();
          }
        }
      } catch {
        // ignore refresh errors
      }
    });
  }

  const hasBlockers = state.currentBlockers.length > 0;

  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Autonomy boundary model
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Eden autonomy mode
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Defines what Claude may do automatically versus what is review-gated.
            Based on{" "}
            <span className="font-mono text-xs text-eden-accent">
              eden-system/specs/EDEN_AUTONOMY_BOUNDARY.md
            </span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stage + Scope badges */}
      <div className="mt-5 flex flex-wrap gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStageBadgeClasses(state.autonomyStage)}`}
        >
          {state.stageLabel}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getScopeBadgeClasses(state.environmentScope)}`}
        >
          {state.scopeLabel}
        </span>
        {state.allowsProviderExecution && (
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            Live OpenAI path: enabled
          </span>
        )}
        {!state.allowsProviderExecution && state.environmentScope === "PRIVATE_DEV" && (
          <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            Live OpenAI path: blocked
          </span>
        )}
      </div>

      {/* Scope description */}
      <p className="mt-4 text-sm leading-6 text-white/50">
        {state.scopeDescription}
      </p>

      {/* Blockers */}
      {hasBlockers && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Current blockers
          </p>
          <ul className="mt-2 space-y-1">
            {state.currentBlockers.map((blocker, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 text-sm ${getBlockerSeverityClasses(blocker)}`}
              >
                <span className="mt-0.5 shrink-0 text-base leading-none">—</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasBlockers && state.environmentScope === "PRIVATE_DEV" && (
        <p className="mt-4 text-sm font-medium text-emerald-400">
          No blockers. The self-work loop can pull and execute the next approved item.
        </p>
      )}

      {/* Public prod is always gated notice */}
      {state.publicProdIsGated && (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <p className="text-sm font-medium text-rose-300">
            edencloud.app is always Stage B. All write operations against the production
            database require explicit owner action. No autonomous execution is permitted.
          </p>
        </div>
      )}

      {/* Expandable policy detail */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-5 text-xs font-semibold text-eden-accent underline underline-offset-2 hover:text-white"
      >
        {expanded ? "Hide policy detail" : "Show full policy detail"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Auto-allowed */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Auto-allowed in {state.scopeLabel}
            </p>
            {state.autoAllowedActions.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {state.autoAllowedActions.map((action, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    ✓ {action}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">None in this scope.</p>
            )}
          </div>

          {/* Blocked in scope */}
          {state.blockedActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Blocked in {state.scopeLabel} (not human-required)
              </p>
              <ul className="mt-2 space-y-0.5">
                {state.blockedActions.map((action, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    ✗ {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Always human-required */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
              Always requires owner acknowledgement (all scopes)
            </p>
            <ul className="mt-2 space-y-0.5">
              {state.humanRequiredActions.map((action, i) => (
                <li key={i} className="text-xs text-slate-600">
                  ⚠ {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

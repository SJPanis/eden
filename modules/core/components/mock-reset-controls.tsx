"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type MockResetControlsProps = {
  title?: string;
  description?: string;
  showAll?: boolean;
  showLedger?: boolean;
  showPipeline?: boolean;
  showReleaseHistory?: boolean;
};

type ResetAction = {
  id: "all" | "ledger" | "pipeline" | "history";
  label: string;
  detail: string;
  tone: string;
  request: {
    url: string;
    method: "DELETE";
  };
};

export function MockResetControls({
  title = "Development reset controls",
  description = "These actions clear local cookie-backed mock state only.",
  showAll = false,
  showLedger = false,
  showPipeline = false,
  showReleaseHistory = false,
}: MockResetControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const actions: ResetAction[] = [
    ...(showAll
      ? [
          {
            id: "all" as const,
            label: "Reset All Mock State",
            detail:
              "Clear local ledger, pipeline overrides, release history, and admin freeze or maintenance state together.",
            tone:
              "border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-200",
            request: {
              url: "/api/mock-state",
              method: "DELETE" as const,
            },
          },
        ]
      : []),
    ...(showLedger
      ? [
          {
            id: "ledger" as const,
            label: "Reset Mock Ledger",
            detail: "Clear simulated Eden Leaf’s activity and restore the default mocked ledger state.",
            tone: "border-rose-500/25 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-100",
            request: {
              url: "/api/mock-transactions",
              method: "DELETE" as const,
            },
          },
        ]
      : []),
    ...(showPipeline
      ? [
          {
            id: "pipeline" as const,
            label: "Reset Mock Pipeline",
            detail: "Clear local pipeline overrides and restore the default release statuses.",
            tone: "border-sky-500/25 bg-sky-500/10 hover:border-sky-300 hover:bg-sky-100",
            request: {
              url: "/api/mock-pipeline?scope=pipeline",
              method: "DELETE" as const,
            },
          },
        ]
      : []),
    ...(showReleaseHistory
      ? [
          {
            id: "history" as const,
            label: "Reset Release History",
            detail: "Clear local release events and restore the default mocked history feed.",
            tone: "border-amber-500/25 bg-amber-500/10 hover:border-amber-300 hover:bg-amber-100",
            request: {
              url: "/api/mock-pipeline?scope=history",
              method: "DELETE" as const,
            },
          },
        ]
      : []),
  ];

  function handleReset(action: ResetAction) {
    startTransition(() => {
      void fetch(action.request.url, {
        method: action.request.method,
      }).then(() => {
        router.refresh();
      });
    });
  }

  if (!actions.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/90 p-4">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
          {title}
        </p>
        <p className="text-sm text-white/50">{description}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isPending}
            onClick={() => handleReset(action)}
            className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${action.tone}`}
          >
            <p className="text-sm font-semibold text-white">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-white/50">{action.detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

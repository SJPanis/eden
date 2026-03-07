"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenMockPipelineActionState } from "@/modules/core/pipeline/mock-pipeline";

type MockPipelineControlsProps = {
  businessId: string;
  controls: EdenMockPipelineActionState[];
  showResetControls?: boolean;
};

export function MockPipelineControls({
  businessId,
  controls,
  showResetControls = true,
}: MockPipelineControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePipelineAction(action: EdenMockPipelineActionState["id"]) {
    startTransition(() => {
      void fetch("/api/mock-pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, businessId }),
      }).then(() => {
        router.refresh();
      });
    });
  }

  function handleReset(scope: "pipeline" | "history") {
    startTransition(() => {
      void fetch(`/api/mock-pipeline?scope=${scope}`, {
        method: "DELETE",
      }).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {controls.map((control) => (
          <button
            key={control.id}
            type="button"
            disabled={isPending || control.disabled}
            onClick={() => handlePipelineAction(control.id)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              control.disabled
                ? "cursor-not-allowed border-eden-edge bg-eden-bg/40 opacity-75"
                : "border-eden-edge bg-white hover:border-eden-ring hover:bg-eden-bg"
            }`}
          >
            <p className="text-sm font-semibold text-eden-ink">{control.label}</p>
            <p className="mt-1 text-xs leading-5 text-eden-muted">{control.detail}</p>
          </button>
        ))}
      </div>

      {showResetControls ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleReset("pipeline")}
            className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <p className="text-sm font-semibold text-eden-ink">Reset Mock Pipeline</p>
            <p className="mt-1 text-xs leading-5 text-eden-muted">
              Clear all local pipeline overrides and restore the default release statuses.
            </p>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleReset("history")}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <p className="text-sm font-semibold text-eden-ink">Reset Release History</p>
            <p className="mt-1 text-xs leading-5 text-eden-muted">
              Clear local release events and restore the default mocked history feed.
            </p>
          </button>
        </div>
      ) : null}
    </div>
  );
}

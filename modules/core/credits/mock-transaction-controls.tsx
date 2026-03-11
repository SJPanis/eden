"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenMockSimulationAction } from "@/modules/core/credits/mock-credits";

type MockTransactionControlsProps = {
  businessId?: string;
  title?: string;
  description?: string;
  showReset?: boolean;
};

const simulationActions: Array<{
  id: EdenMockSimulationAction;
  label: string;
  detail: string;
}> = [
  {
    id: "add_credits",
    label: "Add Leaf’s",
    detail: "Post a local wallet top-up.",
  },
  {
    id: "simulate_purchase",
    label: "Simulate Purchase",
    detail: "Record a mocked purchase event.",
  },
  {
    id: "simulate_hosting_fee",
    label: "Simulate Hosting Fee",
    detail: "Apply a local hosting charge.",
  },
  {
    id: "simulate_service_usage",
    label: "Simulate Service Usage",
    detail: "Settle a mocked usage event.",
  },
];

export function MockTransactionControls({
  businessId,
  title = "Development transaction controls",
  description = "These actions mutate mocked local wallet state only.",
  showReset = true,
}: MockTransactionControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSimulation(action: EdenMockSimulationAction) {
    startTransition(() => {
      void fetch("/api/mock-transactions", {
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

  function handleResetLedger() {
    startTransition(() => {
      void fetch("/api/mock-transactions", {
        method: "DELETE",
      }).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
          {title}
        </p>
        <p className="text-sm text-eden-muted">{description}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {simulationActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSimulation(action.id)}
            className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3 text-left transition-colors hover:border-eden-ring hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            <p className="text-sm font-semibold text-eden-ink">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-eden-muted">{action.detail}</p>
          </button>
        ))}
      </div>

      {showReset ? (
        <div className="mt-4 border-t border-eden-edge pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={handleResetLedger}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <p className="text-sm font-semibold text-eden-ink">Reset Mock Ledger</p>
            <p className="mt-1 text-xs leading-5 text-eden-muted">
              Clear all simulated Eden Leaf’s activity and restore the default mocked ledger state.
            </p>
          </button>
        </div>
      ) : null}
    </div>
  );
}

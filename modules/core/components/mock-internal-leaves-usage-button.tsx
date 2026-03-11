"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type MockInternalLeavesUsageButtonProps = {
  businessId: string;
  amountCredits: number;
  label: string;
  detail: string;
  reference?: string;
  notes?: string;
  className?: string;
};

export function MockInternalLeavesUsageButton({
  businessId,
  amountCredits,
  label,
  detail,
  reference,
  notes,
  className,
}: MockInternalLeavesUsageButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const isDisabled = isPending || amountCredits <= 0;

  function handleAction() {
    if (amountCredits <= 0) {
      return;
    }

    setFeedback(null);
    startTransition(() => {
      void fetch("/api/mock-internal-leaves-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          amountCredits,
          reference,
          notes,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            nextAvailableCredits?: number;
          };

          if (!response.ok || !payload.ok) {
            setFeedback(payload.error ?? "Unable to record internal earned Leaf’s usage.");
            return;
          }

          setFeedback(
            typeof payload.nextAvailableCredits === "number"
              ? `Recorded. ${payload.nextAvailableCredits.toLocaleString()} earned Leaf’s remain available for Eden use.`
              : "Recorded internal earned Leaf’s usage.",
          );
          router.refresh();
        })
        .catch(() => {
          setFeedback("Unable to record internal earned Leaf’s usage.");
        });
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleAction}
        className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className ?? "border-eden-edge bg-white hover:border-eden-ring hover:bg-eden-bg"}`}
      >
        <p className="text-sm font-semibold text-eden-ink">{label}</p>
        <p className="mt-1 text-xs leading-5 text-eden-muted">{detail}</p>
      </button>
      {feedback ? (
        <p className="text-xs leading-5 text-eden-muted">{feedback}</p>
      ) : null}
    </div>
  );
}

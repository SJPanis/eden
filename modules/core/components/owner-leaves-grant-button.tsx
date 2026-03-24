"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCredits } from "@/modules/core/mock-data";

type OwnerLeavesGrantButtonProps = {
  userId: string;
  username: string;
  amountCredits?: number;
  className?: string;
};

export function OwnerLeavesGrantButton({
  userId,
  username,
  amountCredits = 250,
  className,
}: OwnerLeavesGrantButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleGrant() {
    setFeedback(null);
    startTransition(() => {
      void fetch("/api/owner/leaves-grants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amountCredits,
          note: `Owner grant for @${username}.`,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            amountCredits?: number;
          };

          if (!response.ok || !payload.ok) {
            setFeedback(payload.error ?? "Unable to grant Eden Leaf’s right now.");
            return;
          }

          setFeedback(
            `Granted ${formatCredits(payload.amountCredits ?? amountCredits)} to @${username}.`,
          );
          router.refresh();
        })
        .catch(() => {
          setFeedback("Unable to grant Eden Leaf’s right now.");
        });
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={handleGrant}
        className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className ?? "border-sky-500/25 bg-sky-500/10 hover:border-sky-300 hover:bg-sky-500/15"}`}
      >
        <p className="text-sm font-semibold text-white">
          {isPending ? "Granting Leaf’s..." : `Grant ${formatCredits(amountCredits)}`}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          Record a visible owner-funded Leaf’s grant for this account.
        </p>
      </button>
      {feedback ? <p className="text-xs leading-5 text-white/50">{feedback}</p> : null}
    </div>
  );
}

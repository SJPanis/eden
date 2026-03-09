"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type MockPayoutSettlementButtonProps = {
  businessId: string;
  amountCredits: number;
  label: string;
  detail: string;
  reference?: string;
  notes?: string;
  className?: string;
};

export function MockPayoutSettlementButton({
  businessId,
  amountCredits,
  label,
  detail,
  reference,
  notes,
  className,
}: MockPayoutSettlementButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDisabled = isPending || amountCredits <= 0;

  function handleAction() {
    if (amountCredits <= 0) {
      return;
    }

    startTransition(() => {
      void fetch("/api/mock-payout-settlements", {
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
      }).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleAction}
      className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className ?? "border-eden-edge bg-white hover:border-eden-ring hover:bg-eden-bg"}`}
    >
      <p className="text-sm font-semibold text-eden-ink">{label}</p>
      <p className="mt-1 text-xs leading-5 text-eden-muted">{detail}</p>
    </button>
  );
}

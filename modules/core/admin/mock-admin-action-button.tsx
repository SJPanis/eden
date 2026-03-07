"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EdenMockAdminAction } from "@/modules/core/admin/mock-admin-state";

type MockAdminActionButtonProps = {
  action: EdenMockAdminAction;
  label: string;
  detail: string;
  userId?: string;
  businessId?: string;
  className?: string;
};

export function MockAdminActionButton({
  action,
  label,
  detail,
  userId,
  businessId,
  className,
}: MockAdminActionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction() {
    startTransition(() => {
      void fetch("/api/mock-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          userId,
          businessId,
        }),
      }).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleAction}
      className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className ?? "border-eden-edge bg-white hover:border-eden-ring hover:bg-eden-bg"}`}
    >
      <p className="text-sm font-semibold text-eden-ink">{label}</p>
      <p className="mt-1 text-xs leading-5 text-eden-muted">{detail}</p>
    </button>
  );
}

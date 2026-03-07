"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { roleMeta, type EdenRole } from "@/modules/core/config/role-nav";
import {
  getDefaultRouteForRole,
  getDefaultUserIdForRole,
  mockRoleOptions,
  mockSessionOptions,
  type EdenMockSession,
} from "@/modules/core/session/mock-session";

type MockSessionSwitcherProps = {
  session: EdenMockSession;
};

export function MockSessionSwitcher({ session }: MockSessionSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRoleSwitch(role: EdenRole) {
    const nextUserId = getDefaultUserIdForRole(role);
    updateMockSession(nextUserId, getDefaultRouteForRole(role));
  }

  function handleUserSwitch(userId: string) {
    const selectedOption = mockSessionOptions.find((option) => option.userId === userId);
    const nextRoute = getDefaultRouteForRole(selectedOption?.role ?? session.role);

    updateMockSession(userId, nextRoute);
  }

  function updateMockSession(userId: string, nextRoute: string) {
    startTransition(() => {
      void fetch("/api/mock-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }).then(() => {
        router.push(nextRoute);
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-eden-edge bg-white/84 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-muted">
            Mock Session
          </p>
          <p className="text-xs text-eden-muted">Switch active role and user</p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
          {roleMeta[session.role].label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {mockRoleOptions.map((role) => {
          const isActive = session.role === role;

          return (
            <button
              key={role}
              type="button"
              disabled={isPending}
              onClick={() => handleRoleSwitch(role)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                  : "border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {roleMeta[role].label}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1 text-xs text-eden-muted">
        <span>Active mock user</span>
        <select
          value={session.user.id}
          disabled={isPending}
          onChange={(event) => handleUserSwitch(event.target.value)}
          className="rounded-xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mockSessionOptions.map((option) => (
            <option key={option.userId} value={option.userId}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import { formatLeaves } from "@/modules/core/credits/eden-currency";

type ProjectBusiness = {
  id: string;
  name: string;
  tagline: string;
  status: string;
  visibility: string;
  publishReadinessPercent: number;
  featuredServiceId: string | null;
  creditBalanceCredits: number;
};

type ConsumerProjectsPanelProps = {
  session: EdenMockSession;
  businesses: ProjectBusiness[];
  createdBusiness: EdenMockCreatedBusinessState | null;
};

const statusColors: Record<string, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  testing: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  draft: "border-[rgba(45,212,191,0.09)] bg-white/[0.035] text-white/50",
};

export function ConsumerProjectsPanel({
  session,
  businesses,
  createdBusiness,
}: ConsumerProjectsPanelProps) {
  const isOwner = session.role === "owner";
  const allBusinesses: ProjectBusiness[] = [
    ...businesses,
    ...(createdBusiness?.business
      ? [
          {
            id: createdBusiness.business.id,
            name: createdBusiness.business.name,
            tagline: createdBusiness.business.tagline ?? "Your business in Eden",
            status: createdBusiness.business.status ?? "draft",
            visibility: createdBusiness.business.visibility ?? "Private preview",
            publishReadinessPercent: createdBusiness.business.publishReadinessPercent ?? 0,
            featuredServiceId: createdBusiness.business.featuredServiceId ?? null,
            creditBalanceCredits: createdBusiness.business.creditBalanceCredits ?? 0,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Identity header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(45,212,191,0.10),rgba(13,31,48,0.6)_60%,rgba(10,24,37,0.8))] p-6">
        {/* Dot-grid background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #2dd4bf 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
              Your Eden Space
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {session.user.displayName}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              @{session.user.username}
              {isOwner ? (
                <span className="ml-2 rounded-full border border-[rgba(45,212,191,0.3)] bg-[rgba(45,212,191,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-eden-accent">
                  Platform Owner
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                Wallet
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatLeaves(session.user.edenBalanceCredits)}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                Projects
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {allBusinesses.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project graph area */}
      <div className="rounded-[28px] border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
              Project workspace
            </p>
            <p className="mt-1.5 text-sm text-white/50">
              {allBusinesses.length > 0
                ? "Your businesses and services in Eden."
                : "No projects yet — start building your first service."}
            </p>
          </div>
          <Link
            href="/business/create"
            className="shrink-0 rounded-full border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20"
          >
            + New project
          </Link>
        </div>

        {allBusinesses.length > 0 ? (
          <div className="mt-6">
            {/* Connection spine */}
            <div className="relative">
              {/* Vertical spine line */}
              <div className="absolute left-5 top-5 bottom-5 w-px bg-[linear-gradient(to_bottom,rgba(45,212,191,0.3),rgba(45,212,191,0.08))]" />

              <div className="flex flex-col gap-4">
                {allBusinesses.map((biz, index) => (
                  <div key={biz.id} className="flex items-start gap-4">
                    {/* Node dot on spine */}
                    <div className="relative z-10 mt-5 flex h-10 w-10 shrink-0 items-center justify-center">
                      <div className="h-3 w-3 rounded-full border-2 border-eden-accent bg-white/[0.06] shadow-[0_0_8px_rgba(45,212,191,0.4)]" />
                    </div>

                    {/* Business card */}
                    <div className="min-w-0 flex-1 rounded-[20px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(45,212,191,0.05),rgba(13,31,48,0.5))] p-4 transition-all hover:border-[rgba(45,212,191,0.25)] hover:shadow-[0_4px_20px_-8px_rgba(45,212,191,0.2)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{biz.name}</p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                                statusColors[biz.status] ?? statusColors.draft
                              }`}
                            >
                              {biz.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/50">{biz.tagline}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href="/business"
                            className="rounded-full border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#2dd4bf]/50"
                          >
                            Open workspace
                          </Link>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">
                            Publish readiness
                          </p>
                          <p className="text-[10px] font-semibold text-eden-accent">
                            {biz.publishReadinessPercent}%
                          </p>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-eden-edge">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(to_right,rgba(45,212,191,0.6),rgba(45,212,191,1))] transition-all"
                            style={{ width: `${biz.publishReadinessPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Metadata chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2 py-0.5 text-[10px] text-white/50">
                          {biz.visibility}
                        </span>
                        <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2 py-0.5 text-[10px] text-white/50">
                          {formatLeaves(biz.creditBalanceCredits)} workspace balance
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-8 text-center">
            <p className="text-sm font-medium text-white">No projects yet</p>
            <p className="mt-1 text-sm text-white/50">
              Create your first service and publish it to the Eden marketplace.
            </p>
            <Link
              href="/business/create"
              className="mt-4 inline-block rounded-full border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20"
            >
              Start building
            </Link>
          </div>
        )}
      </div>

      {/* Platform Control — owner only */}
      {isOwner ? (
        <div className="relative overflow-hidden rounded-[28px] border border-[rgba(45,212,191,0.35)] bg-[linear-gradient(135deg,rgba(16,37,58,0.97),rgba(45,212,191,0.15)_80%,rgba(16,37,58,0.95))] p-6">
          {/* Dot-grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #2dd4bf 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Glow */}
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-eden-accent/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgba(45,212,191,0.5)] bg-[rgba(45,212,191,0.15)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Owner only
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                Eden Platform Control
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Monitor users, economy flows, runtime registry, build supervisor, and
                platform-wide system state. Accessible only from your authenticated owner
                account.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Users", "Economy", "Runtime registry", "Build supervisor", "Autonomy mode"].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/50"
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3">
              <Link
                href="/owner"
                className="rounded-2xl border border-eden-accent/50 bg-eden-accent/20 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-eden-accent/30"
              >
                Open control room
              </Link>
              <Link
                href="/owner/runtimes"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
              >
                Runtime registry
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Contribution section */}
      <div className="rounded-[28px] border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
              Contribution layer
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Improve Eden, earn from it
            </p>
            <p className="mt-1 text-sm leading-6 text-white/50">
              Submit code improvements, design work, bug fixes, or ideas directly to Eden.
              Each period, the contribution pool distributes Leafs to approved contributors
              based on their score.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
            Coming soon
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Contribution Score", value: "0 pts", note: "Your earned score" },
            { label: "Pool share (est.)", value: "—", note: "Based on score weight" },
            { label: "Next distribution", value: "—", note: "Current period status" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">{item.label}</p>
              <p className="mt-1.5 text-base font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs text-white/50">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

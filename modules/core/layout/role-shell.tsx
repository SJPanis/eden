"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  isBusinessFrozen,
  isUserFrozen,
  type EdenMockAdminState,
} from "@/modules/core/admin/mock-admin-state";
import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";
import { roleMeta, topNavItems, type EdenRole } from "@/modules/core/config/role-nav";
import { getCreditsDisplaySummary } from "@/modules/core/credits/mock-credits";
import { edenCurrencyName, edenSpendableLeavesLabel } from "@/modules/core/credits/eden-currency";
import { getBusinessById, type EdenMockTransaction } from "@/modules/core/mock-data";
import { canAccessRoles, type EdenMockSession } from "@/modules/core/session/mock-session";
import { MockSessionSwitcher } from "@/modules/core/session/mock-session-switcher";

type RoleShellProps = {
  role: EdenRole;
  session: EdenMockSession;
  children: ReactNode;
  showRoleHeader?: boolean;
  topBarExtras?: ReactNode;
  simulatedTransactions?: EdenMockTransaction[];
  activeBusinessId?: string;
  createdBusiness?: EdenMockCreatedBusinessState | null;
  adminState?: EdenMockAdminState;
};

export function RoleShell({
  role,
  session,
  children,
  showRoleHeader = true,
  topBarExtras,
  simulatedTransactions = [],
  activeBusinessId,
  createdBusiness,
  adminState,
}: RoleShellProps) {
  const pathname = usePathname();
  const [isSigningOut, startSignOutTransition] = useTransition();
  const roleDetails = roleMeta[role];
  const activeRoleDetails = roleMeta[session.role];
  const creditsSummary = getCreditsDisplaySummary(
    { userId: session.user.id, role: session.role, businessId: activeBusinessId },
    simulatedTransactions,
    createdBusiness,
  );
  const activeBusinessName = activeBusinessId
    ? getBusinessById(activeBusinessId, createdBusiness)?.name
    : null;
  const maintenanceMode = adminState?.maintenanceMode ?? false;
  const activeUserFrozen = adminState ? isUserFrozen(session.user.id, adminState) : false;
  const activeBusinessFrozen =
    activeBusinessId && adminState ? isBusinessFrozen(activeBusinessId, adminState) : false;
  const showMockSessionSwitcher = session.auth.source === "mock";
  const visibleTopNavItems = topNavItems;

  function handleSignOut() {
    startSignOutTransition(() => {
      void signOut({ callbackUrl: "/" });
    });
  }

  return (
    <div className="eden-grid min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">

        {/* System banners */}
        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="font-semibold">Maintenance mode active.</span>{" "}
            The owner layer has enabled a platform-wide maintenance banner.
          </div>
        ) : null}
        {activeUserFrozen || activeBusinessFrozen ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <span className="font-semibold">Owner hold active.</span>{" "}
            {activeUserFrozen
              ? "This session is marked as frozen."
              : `${activeBusinessName ?? "This business"} is marked as frozen.`}
          </div>
        ) : null}

        {/* ── Header shell ── */}
        <header className="eden-shell flex flex-col gap-4 p-4">
          <Link href="/" className="w-fit">
            <EdenBrandLockup size="sm" label="Eden" subtitle="AI service economy" dark />
          </Link>

          {/* Nav */}
          <nav className="flex flex-wrap gap-2">
            {visibleTopNavItems.map((item) => {
              const isConsumerHome =
                item.href === "/consumer" &&
                (pathname === "/consumer" ||
                  pathname.startsWith("/consumer/services") ||
                  pathname.startsWith("/consumer/businesses") ||
                  pathname.startsWith("/services") ||
                  pathname.startsWith("/businesses"));
              const isProjectsRoute =
                item.href === "/consumer/projects" && pathname.startsWith("/consumer/projects");
              const isActive =
                isConsumerHome ||
                isProjectsRoute ||
                (item.href !== "/consumer" &&
                  item.href !== "/consumer/projects" &&
                  pathname.startsWith(item.href));
              const isAllowed = canAccessRoles(session.role, item.allowedRoles);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-[#14989a]/50 bg-[#14989a]/15 text-white"
                      : isAllowed
                        ? "border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white"
                        : "border-dashed border-white/6 bg-transparent text-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/30">
                      {isAllowed ? item.accessLabel : "Blocked"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {topBarExtras ? (
                <div className="flex flex-wrap items-center gap-2">{topBarExtras}</div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:min-w-[320px] md:items-end">
              {showMockSessionSwitcher ? <MockSessionSwitcher session={session} /> : null}

              <div className="grid gap-3 md:min-w-[360px]">
                {/* Wallet panel */}
                <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {edenCurrencyName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                        {edenSpendableLeavesLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {creditsSummary.userBalanceLabel}
                      </p>
                    </div>
                    {creditsSummary.businessBalanceLabel ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                          {activeBusinessName ? "Workspace Leaf's" : "Business Leaf's"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {creditsSummary.businessBalanceLabel}
                        </p>
                        {activeBusinessName ? (
                          <p className="mt-1 text-xs text-white/35">{activeBusinessName}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Session identity */}
                <div className="flex items-center gap-3 self-end">
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/30">
                      {session.auth.source === "persistent"
                        ? "Authenticated Session"
                        : "Active Mock Session"}
                    </p>
                    <p className="text-sm font-medium text-white">{session.user.displayName}</p>
                    <p className="text-xs text-white/40">
                      {activeRoleDetails.label} · @{session.user.username}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {session.auth.source === "persistent" ? (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:border-white/20 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSigningOut ? "Signing out" : "Sign out"}
                        </button>
                      ) : null}
                      <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/30">
                        {activeUserFrozen ? "Frozen" : "Active"}
                      </span>
                      {activeBusinessId ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                            activeBusinessFrozen
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {activeBusinessFrozen ? "Business frozen" : "Business active"}
                        </span>
                      ) : null}
                      {maintenanceMode ? (
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-amber-400">
                          Maintenance
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#14989a]/40 bg-[#14989a]/15 text-sm font-semibold text-white">
                    {session.user.initials}
                  </div>
                </div>

                {/* Auth debug panel */}
                {session.auth.debug?.enabled ? (
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/8 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-400">
                        Auth Boundary
                      </p>
                      <span className="rounded-full border border-sky-500/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-sky-400/70">
                        Dev only
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-xs text-white/60">
                      <div className="flex flex-wrap gap-3">
                        <span><span className="font-semibold text-white/80">Source:</span> {session.auth.source}</span>
                        <span><span className="font-semibold text-white/80">Resolver:</span> {session.auth.resolver}</span>
                        <span><span className="font-semibold text-white/80">Role:</span> {session.auth.debug.resolvedRole}</span>
                      </div>
                      {session.auth.debug.note ? (
                        <p className="text-[11px] text-white/40">{session.auth.debug.note}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* Role heading */}
        {showRoleHeader ? (
          <section className="eden-shell p-5 md:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#14989a]">
              {roleDetails.label}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {roleDetails.heading}
            </h1>
            <p className="mt-2 text-sm text-white/50 md:text-base">{roleDetails.subheading}</p>
            <div className="mt-4 inline-flex rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-white/35">
              Viewing {roleDetails.label.toLowerCase()} layer as {activeRoleDetails.label.toLowerCase()}
            </div>
          </section>
        ) : null}

        {/* Page content — 3D transition */}
        <div style={{ perspective: "1400px" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 24, rotateX: 7, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, rotateX: -4, scale: 0.985 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "50% 0%", transformStyle: "preserve-3d" }}
              className="eden-shell p-5 md:p-6"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

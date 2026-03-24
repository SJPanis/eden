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
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";
import { roleMeta, topNavItems, type EdenRole } from "@/modules/core/config/role-nav";
import { getCreditsDisplaySummary } from "@/modules/core/credits/mock-credits";
import { edenSpendableLeavesLabel } from "@/modules/core/credits/eden-currency";
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
  const hasSecondaryRow =
    !!topBarExtras ||
    showMockSessionSwitcher ||
    maintenanceMode ||
    activeUserFrozen ||
    !!activeBusinessFrozen;

  function handleSignOut() {
    startSignOutTransition(() => {
      void signOut({ callbackUrl: "/" });
    });
  }

  return (
    <div className="eden-grid min-h-screen px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">

        {/* ── Compact topbar ── */}
        <header className="eden-shell overflow-hidden">

          {/* Primary bar: logo | nav | wallet + avatar */}
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3">

            {/* Logo */}
            <Link
              href="/"
              className="mr-1 flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(20,152,154,0.3)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.15),rgba(13,31,48,0.9))]">
                <EdenLogoMark size={20} />
              </div>
              <span className="hidden font-semibold text-white sm:block">Eden</span>
            </Link>

            {/* Separator */}
            <div className="mx-1 hidden h-4 w-px shrink-0 bg-white/[0.08] md:block" />

            {/* Nav — horizontally scrollable, no scrollbar */}
            <nav className="eden-scroll-x flex flex-1 items-center gap-1">
              {topNavItems.map((item) => {
                const isConsumerHome =
                  item.href === "/consumer" &&
                  (pathname === "/consumer" ||
                    pathname.startsWith("/consumer/services") ||
                    pathname.startsWith("/consumer/businesses") ||
                    pathname.startsWith("/services") ||
                    pathname.startsWith("/businesses"));
                const isProjectsRoute =
                  item.href === "/consumer/projects" &&
                  pathname.startsWith("/consumer/projects");
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
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border border-[#14989a]/40 bg-[#14989a]/12 text-white"
                        : isAllowed
                          ? "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                          : "cursor-default text-white/20"
                    }`}
                  >
                    {item.label}
                    {isAllowed ? null : (
                      <span className="text-[9px] uppercase tracking-widest text-white/15">
                        locked
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right cluster */}
            <div className="ml-1 flex shrink-0 items-center gap-2">
              {/* Wallet balance chip — hidden on tiny screens */}
              <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 sm:flex">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                  {edenSpendableLeavesLabel}
                </span>
                <span className="text-xs font-semibold text-white">
                  {creditsSummary.userBalanceLabel}
                </span>
                {creditsSummary.businessBalanceLabel ? (
                  <>
                    <span className="h-3 w-px bg-white/[0.08]" />
                    <span className="text-xs font-semibold text-[#14989a]">
                      {creditsSummary.businessBalanceLabel}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Sign out — persistent sessions only */}
              {session.auth.source === "persistent" ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/40 transition-colors hover:border-white/15 hover:text-white/70 disabled:opacity-50 md:block"
                >
                  {isSigningOut ? "Leaving…" : "Sign out"}
                </button>
              ) : null}

              {/* Avatar */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#14989a]/35 bg-[#14989a]/12 text-xs font-semibold text-white">
                {session.user.initials}
                {(activeUserFrozen || activeBusinessFrozen) ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#0d1f30] bg-rose-500" />
                ) : null}
              </div>
            </div>
          </div>

          {/* Secondary bar — context extras, session switcher, status chips */}
          <AnimatePresence initial={false}>
            {hasSecondaryRow ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2 md:px-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {topBarExtras ? (
                      <div className="flex flex-wrap items-center gap-2">{topBarExtras}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showMockSessionSwitcher ? (
                      <MockSessionSwitcher session={session} />
                    ) : null}
                    {maintenanceMode ? (
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-400">
                        Maintenance
                      </span>
                    ) : null}
                    {activeUserFrozen ? (
                      <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-300">
                        Session frozen
                      </span>
                    ) : null}
                    {activeBusinessFrozen ? (
                      <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-300">
                        {activeBusinessName ?? "Business"} frozen
                      </span>
                    ) : null}
                    {session.auth.source === "persistent" ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/35 transition-colors hover:text-white/60 disabled:opacity-50 md:hidden"
                      >
                        {isSigningOut ? "Leaving…" : "Sign out"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Auth debug panel — dev only */}
          {session.auth.debug?.enabled ? (
            <div className="border-t border-sky-500/10 bg-sky-500/[0.04] px-3 py-2 md:px-4">
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="font-mono uppercase tracking-[0.14em] text-sky-400/70">
                  Auth Boundary
                </span>
                <span className="text-white/40">
                  Source: <span className="text-white/60">{session.auth.source}</span>
                </span>
                <span className="text-white/40">
                  Resolver: <span className="text-white/60">{session.auth.resolver}</span>
                </span>
                <span className="text-white/40">
                  Role: <span className="text-white/60">{session.auth.debug.resolvedRole}</span>
                </span>
                {session.auth.debug.note ? (
                  <span className="text-white/30">{session.auth.debug.note}</span>
                ) : null}
                <span className="ml-auto rounded-full border border-sky-500/15 px-2 py-0.5 text-[9px] uppercase tracking-widest text-sky-400/50">
                  Dev only
                </span>
              </div>
            </div>
          ) : null}
        </header>

        {/* Role heading */}
        {showRoleHeader ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="eden-shell px-5 py-4 md:px-6 md:py-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#14989a]">
                  {roleDetails.label}
                </p>
                <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {roleDetails.heading}
                </h1>
                <p className="mt-1 text-sm text-white/45">{roleDetails.subheading}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-[11px] text-white/30">
                  {roleDetails.label.toLowerCase()} layer
                </span>
                <span className="rounded-full border border-[#14989a]/25 bg-[#14989a]/8 px-3 py-1 text-[11px] text-[#14989a]/80">
                  as {activeRoleDetails.label.toLowerCase()}
                </span>
              </div>
            </div>
          </motion.section>
        ) : null}

        {/* Page content — 3D transition */}
        <div style={{ perspective: "1400px" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 20, rotateX: 6, scale: 0.978 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, rotateX: -3, scale: 0.988 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
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

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
import {
  getCreditsDisplaySummary,
} from "@/modules/core/credits/mock-credits";
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
    {
      userId: session.user.id,
      role: session.role,
      businessId: activeBusinessId,
    },
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

  function handleSignOut() {
    startSignOutTransition(() => {
      void signOut({
        callbackUrl: "/",
      });
    });
  }

  return (
    <div className="eden-grid min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Mock maintenance mode is active.</span> The owner layer
            has enabled a platform-wide maintenance banner. Navigation remains available because
            this is a local development-only state.
          </div>
        ) : null}

        {activeUserFrozen || activeBusinessFrozen ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span className="font-semibold">Owner hold active.</span>{" "}
            {activeUserFrozen
              ? "This mock session is marked as frozen."
              : `${activeBusinessName ?? "This business"} is marked as frozen in local admin state.`}
          </div>
        ) : null}

        <header className="eden-shell flex flex-col gap-4 p-4">
          <Link href="/" className="w-fit">
            <EdenBrandLockup
              size="sm"
              label="Eden"
              subtitle="AI-first platform shell"
            />
          </Link>

          <nav className="flex flex-wrap gap-2">
            {topNavItems.map((item) => {
              const isConsumerDetailRoute =
                item.href === "/consumer" &&
                (pathname === "/consumer" ||
                  pathname.startsWith("/services") ||
                  pathname.startsWith("/businesses"));
              const isActive = isConsumerDetailRoute || pathname.startsWith(item.href);
              const isAllowed = canAccessRoles(session.role, item.allowedRoles);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isAllowed ? "Available to the active mock session" : "Blocked for the active mock session"}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                      : isAllowed
                        ? "border-eden-edge bg-white/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                        : "border-dashed border-eden-edge bg-white/60 text-eden-muted/80 hover:border-eden-edge"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-eden-muted">
                      {isAllowed ? item.accessLabel : "Blocked"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {topBarExtras ? <div className="flex flex-wrap items-center gap-2">{topBarExtras}</div> : null}
            </div>

            <div className="flex flex-col gap-3 md:min-w-[320px] md:items-end">
              {showMockSessionSwitcher ? <MockSessionSwitcher session={session} /> : null}

              <div className="grid gap-3 md:min-w-[360px]">
                <div className="rounded-2xl border border-eden-edge bg-white/84 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-muted">
                    {edenCurrencyName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                        {edenSpendableLeavesLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-eden-ink">
                        {creditsSummary.userBalanceLabel}
                      </p>
                    </div>
                    {creditsSummary.businessBalanceLabel ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                          {activeBusinessName ? "Workspace Leaves" : "Business Leaves"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-eden-ink">
                          {creditsSummary.businessBalanceLabel}
                        </p>
                        {activeBusinessName ? (
                          <p className="mt-1 text-xs text-eden-muted">{activeBusinessName}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end">
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-eden-muted">
                      {session.auth.source === "persistent"
                        ? "Authenticated Session"
                        : "Active Mock Session"}
                    </p>
                    <p className="text-sm font-medium text-eden-ink">{session.user.displayName}</p>
                    <p className="text-xs text-eden-muted">
                      {activeRoleDetails.label} - @{session.user.username}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {session.auth.source === "persistent" ? (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="rounded-full border border-eden-edge bg-white/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSigningOut ? "Signing out" : "Sign out"}
                        </button>
                      ) : null}
                      <span className="rounded-full border border-eden-edge bg-white/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                        {activeUserFrozen ? "Frozen" : "Active"}
                      </span>
                      {activeBusinessId ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                            activeBusinessFrozen
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {activeBusinessFrozen ? "Business frozen" : "Business active"}
                        </span>
                      ) : null}
                      {maintenanceMode ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-amber-700">
                          Maintenance
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-eden-edge bg-white text-sm font-semibold text-eden-ink">
                    {session.user.initials}
                  </div>
                </div>

                {session.auth.debug?.enabled ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-700">
                        Auth Boundary
                      </p>
                      <span className="rounded-full border border-sky-200 bg-white/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-sky-700">
                        Dev only
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-xs text-slate-700">
                      <div className="flex flex-wrap gap-3">
                        <span>
                          <span className="font-semibold">Source:</span> {session.auth.source}
                        </span>
                        <span>
                          <span className="font-semibold">Resolver:</span> {session.auth.resolver}
                        </span>
                        <span>
                          <span className="font-semibold">Role:</span>{" "}
                          {session.auth.debug.resolvedRole}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 uppercase tracking-[0.12em] ${
                            session.auth.debug.usedOwnedBusinessFallbackClaims
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {session.auth.debug.usedOwnedBusinessFallbackClaims
                            ? "Owned-business fallback used"
                            : "No owner fallback claims"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Memberships</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {session.auth.debug.memberships.length > 0 ? (
                            session.auth.debug.memberships.map((membership) => (
                              <span
                                key={`${membership.businessId}-${membership.businessRole}-${membership.source}`}
                                className="rounded-full border border-sky-200 bg-white/90 px-2 py-1 text-[11px] text-sky-800"
                              >
                                {membership.businessId} - {membership.businessRole}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600">No business memberships resolved.</span>
                          )}
                        </div>
                      </div>
                      {session.auth.debug.note ? (
                        <p className="text-[11px] text-slate-600">{session.auth.debug.note}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {showRoleHeader ? (
          <section className="eden-shell p-5 md:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-muted">
              {roleDetails.label}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink md:text-3xl">
              {roleDetails.heading}
            </h1>
            <p className="mt-2 text-sm text-eden-muted md:text-base">{roleDetails.subheading}</p>
            <div className="mt-4 inline-flex rounded-full border border-eden-edge bg-white/80 px-3 py-1 text-xs text-eden-muted">
              Viewing {roleDetails.label.toLowerCase()} layer as {activeRoleDetails.label.toLowerCase()}
            </div>
          </section>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="eden-shell p-5 md:p-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

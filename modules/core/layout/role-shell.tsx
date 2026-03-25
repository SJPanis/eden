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
import { ParticleCanvas } from "@/modules/core/components/particle-canvas";
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
    <div
      className="relative min-h-screen"
      style={{ backgroundColor: "#0b1622" }}
    >
      <ParticleCanvas />

      {/* Subtle grain overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.022]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
        aria-hidden
      />

      <div className="relative z-10 px-3 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">

          {/* ── Compact topbar ── */}
          <header
            className="overflow-hidden rounded-[20px] backdrop-blur-xl"
            style={{
              background: "rgba(13,30,46,0.82)",
              border: "1px solid rgba(45,212,191,0.13)",
              boxShadow: "0 4px 24px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >

            {/* Primary bar: logo | nav | wallet + avatar */}
            <div className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3">

              {/* Logo */}
              <Link
                href="/"
                className="mr-1 flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    background: "radial-gradient(circle at 35% 25%, rgba(45,212,191,0.18), rgba(11,22,34,0.95))",
                    border: "1px solid rgba(45,212,191,0.3)",
                    boxShadow: "0 0 12px -2px rgba(45,212,191,0.2)",
                  }}
                >
                  <EdenLogoMark size={20} />
                </div>
                <span className="hidden font-semibold text-white sm:block">Eden</span>
              </Link>

              {/* Separator */}
              <div className="mx-1 hidden h-4 w-px shrink-0 md:block" style={{ background: "rgba(255,255,255,0.08)" }} />

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
                          ? "text-white"
                          : isAllowed
                            ? "text-white/50 hover:text-white/80"
                            : "cursor-default text-white/20"
                      }`}
                      style={
                        isActive
                          ? {
                              background: "rgba(45,212,191,0.14)",
                              border: "1px solid rgba(45,212,191,0.42)",
                              boxShadow: "0 0 10px -2px rgba(45,212,191,0.2)",
                            }
                          : isAllowed
                            ? { border: "1px solid transparent" }
                            : { border: "1px solid transparent" }
                      }
                      onMouseEnter={(e) => {
                        if (isAllowed && !isActive) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAllowed && !isActive) {
                          e.currentTarget.style.background = "";
                        }
                      }}
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
                {/* Wallet balance chip */}
                <div
                  className="hidden items-center gap-2 rounded-full px-3 py-1.5 sm:flex"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                    {edenSpendableLeavesLabel}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {creditsSummary.userBalanceLabel}
                  </span>
                  {creditsSummary.businessBalanceLabel ? (
                    <>
                      <span className="h-3 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <span className="text-xs font-semibold" style={{ color: "#2dd4bf" }}>
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
                    className="hidden rounded-full px-3 py-1.5 text-[11px] text-white/40 transition-colors hover:text-white/70 disabled:opacity-50 md:block"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {isSigningOut ? "Leaving…" : "Sign out"}
                  </button>
                ) : null}

                {/* Avatar — links to settings */}
                <Link
                  href="/settings"
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  style={{
                    border: "1px solid rgba(45,212,191,0.38)",
                    background: "rgba(45,212,191,0.12)",
                  }}
                  title="Account settings"
                >
                  {session.user.initials}
                  {(activeUserFrozen || activeBusinessFrozen) ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                      style={{ background: "#f43f5e", border: "2px solid #0d1f30" }}
                    />
                  ) : null}
                </Link>
              </div>
            </div>

            {/* Secondary bar */}
            <AnimatePresence initial={false}>
              {hasSecondaryRow ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
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
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-400"
                          style={{
                            border: "1px solid rgba(245,158,11,0.25)",
                            background: "rgba(245,158,11,0.1)",
                          }}
                        >
                          Maintenance
                        </span>
                      ) : null}
                      {activeUserFrozen ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-300"
                          style={{
                            border: "1px solid rgba(244,63,94,0.25)",
                            background: "rgba(244,63,94,0.1)",
                          }}
                        >
                          Session frozen
                        </span>
                      ) : null}
                      {activeBusinessFrozen ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-300"
                          style={{
                            border: "1px solid rgba(244,63,94,0.25)",
                            background: "rgba(244,63,94,0.1)",
                          }}
                        >
                          {activeBusinessName ?? "Business"} frozen
                        </span>
                      ) : null}
                      {session.auth.source === "persistent" ? (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/35 transition-colors hover:text-white/60 disabled:opacity-50 md:hidden"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
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
              <div
                className="px-3 py-2 md:px-4"
                style={{
                  borderTop: "1px solid rgba(14,165,233,0.1)",
                  background: "rgba(14,165,233,0.04)",
                }}
              >
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
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest text-sky-400/50"
                    style={{ border: "1px solid rgba(14,165,233,0.15)" }}
                  >
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
              className="overflow-hidden rounded-[20px] px-5 py-4 backdrop-blur-xl md:px-6 md:py-5"
              style={{
                background: "rgba(13,30,46,0.78)",
                border: "1px solid rgba(45,212,191,0.1)",
                boxShadow: "0 2px 16px -4px rgba(0,0,0,0.35)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: "#2dd4bf" }}
                  >
                    {roleDetails.label}
                  </p>
                  <h1
                    className="mt-1.5 text-2xl tracking-tight text-white md:text-3xl"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {roleDetails.heading}
                  </h1>
                  <p className="mt-1 text-sm text-white/45">{roleDetails.subheading}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] text-white/30"
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {roleDetails.label.toLowerCase()} layer
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px]"
                    style={{
                      border: "1px solid rgba(45,212,191,0.25)",
                      background: "rgba(45,212,191,0.08)",
                      color: "rgba(45,212,191,0.8)",
                    }}
                  >
                    as {activeRoleDetails.label.toLowerCase()}
                  </span>
                </div>
              </div>
            </motion.section>
          ) : null}

          {/* Page content — fade + slide up */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-[20px] p-5 backdrop-blur-xl md:p-6"
              style={{
                background: "rgba(13,30,46,0.78)",
                border: "1px solid rgba(45,212,191,0.1)",
                boxShadow: "0 4px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {children}
            </motion.main>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

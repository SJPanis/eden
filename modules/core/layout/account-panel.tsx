"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { EdenRole } from "@/modules/core/config/role-nav";
import { roleMeta } from "@/modules/core/config/role-nav";

type AccountPanelProps = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  isPersistentAuth: boolean;
  user: {
    initials: string;
    username: string;
    displayName: string;
    role: EdenRole;
    edenBalanceCredits: number;
  };
  currentRole: EdenRole;
};

type PanelView = "main" | "referrals" | "switch-role";

type ReferralStats = {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalEarned: number;
};

const roleColors: Record<EdenRole, string> = {
  consumer: "rgba(45,212,191,0.85)",
  business: "rgba(168,85,247,0.85)",
  owner: "rgba(245,158,11,0.85)",
};

export function AccountPanel({
  open,
  onClose,
  onSignOut,
  isSigningOut,
  isPersistentAuth,
  user,
  currentRole,
}: AccountPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PanelView>("main");
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  // Reset view when panel closes
  useEffect(() => {
    if (!open) {
      // Small delay so animation finishes before resetting
      const t = setTimeout(() => setView("main"), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const loadReferralStats = useCallback(async () => {
    if (referralStats) return;
    setReferralLoading(true);
    try {
      const res = await fetch("/api/referrals/stats");
      const data = await res.json();
      if (data.ok) {
        setReferralStats(data);
      }
    } catch {
      // Silently fail — panel still works
    } finally {
      setReferralLoading(false);
    }
  }, [referralStats]);

  function handleCopyLink() {
    const link = referralStats?.referralLink ?? `https://edencloud.app/join?ref=${user.username}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const menuItemStyle = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/60 transition-all hover:text-white group";

  const roleLabel = roleMeta[currentRole]?.label ?? currentRole;
  const roleColor = roleColors[currentRole] ?? roleColors.consumer;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-0 top-full z-[200] mt-2 w-[280px] overflow-hidden rounded-[20px]"
          style={{
            background: "rgba(13,30,46,0.95)",
            border: "1px solid rgba(45,212,191,0.15)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 16px 48px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {view === "main" ? (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Header: avatar + user info */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{
                        border: "1px solid rgba(45,212,191,0.38)",
                        background: "rgba(45,212,191,0.12)",
                      }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{user.displayName}</p>
                      <Link
                        href={`/profile/${user.username}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-[#2dd4bf]"
                      >
                        @{user.username} <span className="text-[10px]">&#8594;</span>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        color: roleColor,
                        border: `1px solid ${roleColor.replace("0.85", "0.3")}`,
                        background: roleColor.replace("0.85", "0.08"),
                      }}
                    >
                      {roleLabel}
                    </span>
                    <span className="text-xs text-white/50">
                      <span style={{ color: "#2dd4bf" }}>&#10022;</span>{" "}
                      {user.edenBalanceCredits.toLocaleString()} Leaf&apos;s
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Menu items */}
                <div className="p-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isPersistentAuth) {
                        window.location.href = currentRole === "business" ? "/business?tab=earnings" : "/consumer?tab=payouts";
                        onClose();
                        return;
                      }
                      try {
                        const res = await fetch("/api/payouts/connect/onboard", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        });
                        const data = await res.json();
                        if (data.ok && data.onboardingUrl) {
                          window.location.href = data.onboardingUrl;
                        } else {
                          window.location.href = currentRole === "business" ? "/business?tab=earnings" : "/consumer?tab=payouts";
                        }
                      } catch {
                        window.location.href = currentRole === "business" ? "/business?tab=earnings" : "/consumer?tab=payouts";
                      }
                      onClose();
                    }}
                    className={menuItemStyle}
                    style={{ borderLeft: "2px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = "#2dd4bf";
                      e.currentTarget.style.background = "rgba(45,212,191,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "";
                    }}
                  >
                    <span className="w-5 text-center text-sm">&#127974;</span>
                    Bank &amp; Payouts
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("referrals");
                      void loadReferralStats();
                    }}
                    className={menuItemStyle}
                    style={{ borderLeft: "2px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = "#2dd4bf";
                      e.currentTarget.style.background = "rgba(45,212,191,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "";
                    }}
                  >
                    <span className="w-5 text-center text-sm">&#128101;</span>
                    Refer Friends
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("switch-role")}
                    className={menuItemStyle}
                    style={{ borderLeft: "2px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = "#2dd4bf";
                      e.currentTarget.style.background = "rgba(45,212,191,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "";
                    }}
                  >
                    <span className="w-5 text-center text-sm">&#9889;</span>
                    Switch Role
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Footer */}
                <div className="p-2 space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={onClose}
                    className={menuItemStyle}
                    style={{ borderLeft: "2px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = "#2dd4bf";
                      e.currentTarget.style.background = "rgba(45,212,191,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "";
                    }}
                  >
                    <span className="w-5 text-center text-sm">&#9881;</span>
                    Account Settings
                  </Link>

                  {isPersistentAuth ? (
                    <button
                      type="button"
                      onClick={() => { onClose(); onSignOut(); }}
                      disabled={isSigningOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/35 transition-all hover:text-white/60 disabled:opacity-50"
                      style={{ borderLeft: "2px solid transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderLeftColor = "rgba(244,63,94,0.5)";
                        e.currentTarget.style.background = "rgba(244,63,94,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderLeftColor = "transparent";
                        e.currentTarget.style.background = "";
                      }}
                    >
                      <span className="w-5" />
                      {isSigningOut ? "Leaving..." : "Sign out"}
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : view === "referrals" ? (
              <motion.div
                key="referrals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Referral sub-panel header */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                  <button
                    type="button"
                    onClick={() => setView("main")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    &#8592;
                  </button>
                  <p className="text-sm font-medium text-white">Refer Friends</p>
                </div>

                <div className="mx-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                <div className="px-4 py-3 space-y-4">
                  {/* Referral link */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1.5">Your referral link</p>
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ background: "rgba(45,212,191,0.05)", border: "1px solid rgba(45,212,191,0.15)" }}
                    >
                      <span className="flex-1 truncate font-mono text-[11px] text-white/60">
                        {referralStats?.referralLink ?? `edencloud.app/join?ref=${user.username}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all"
                        style={{
                          color: copied ? "#0b1622" : "#2dd4bf",
                          background: copied ? "#2dd4bf" : "rgba(45,212,191,0.12)",
                          border: `1px solid ${copied ? "#2dd4bf" : "rgba(45,212,191,0.3)"}`,
                        }}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3">
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-lg font-semibold text-white">
                        {referralLoading ? "—" : (referralStats?.totalReferred ?? 0)}
                      </p>
                      <p className="text-[10px] text-white/35">friends referred</p>
                    </div>
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-lg font-semibold" style={{ color: "#2dd4bf" }}>
                        {referralLoading ? "—" : (referralStats?.totalEarned ?? 0)}
                      </p>
                      <p className="text-[10px] text-white/35">Leaf&apos;s earned</p>
                    </div>
                  </div>

                  {/* How it works */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-2">How it works</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px]" style={{ color: "#2dd4bf" }}>&#10022;</span>
                        <p className="text-xs text-white/50">
                          You earn <span className="text-white/80 font-medium">1%</span> of every Leaf your friends spend
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px]" style={{ color: "#2dd4bf" }}>&#10022;</span>
                        <p className="text-xs text-white/50">
                          If they refer others, you earn a smaller % too
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="switch-role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Switch role sub-panel */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                  <button
                    type="button"
                    onClick={() => setView("main")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    &#8592;
                  </button>
                  <p className="text-sm font-medium text-white">Switch Role</p>
                </div>

                <div className="mx-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                <div className="p-2 space-y-0.5">
                  {(["consumer", "business", "owner"] as const).map((r) => {
                    const isActive = r === currentRole;
                    const meta = roleMeta[r];
                    const color = roleColors[r];
                    return (
                      <Link
                        key={r}
                        href={r === "consumer" ? "/consumer" : r === "business" ? "/business" : "/owner"}
                        onClick={onClose}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${isActive ? "text-white" : "text-white/50 hover:text-white"}`}
                        style={{
                          background: isActive ? roleColors[r].replace("0.85", "0.08") : undefined,
                          borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderLeftColor = color;
                            e.currentTarget.style.background = color.replace("0.85", "0.05");
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderLeftColor = "transparent";
                            e.currentTarget.style.background = "";
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium">{meta.label}</p>
                          <p className="text-[11px] text-white/30">{meta.subheading}</p>
                        </div>
                        {isActive ? (
                          <span className="shrink-0 text-[10px] uppercase tracking-widest" style={{ color }}>
                            Active
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                <div className="px-4 pb-3 pt-1">
                  <p className="text-[10px] text-white/25">
                    Role access is granted server-side based on your account status.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

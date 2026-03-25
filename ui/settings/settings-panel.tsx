"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";

type SettingsPanelProps = {
  displayName: string;
  username: string;
  role: string;
  balanceLabel: string;
  authSource: "persistent" | "mock" | "mock_fallback";
};

type Section = "profile" | "password" | "account";

export function SettingsPanel({ displayName, username, role, balanceLabel, authSource }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const isPersistent = authSource === "persistent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl space-y-5"
    >
      {/* Header */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#14989a]/30 bg-[#14989a]/10 text-lg font-bold text-[#14989a]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{displayName}</p>
            <p className="text-sm text-white/40">@{username}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full border border-[#14989a]/30 bg-[#14989a]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#14989a]">
              {role}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">Balance</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{balanceLabel}</p>
          </div>
          {!isPersistent && (
            <div className="ml-auto rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              Demo session — sign in to edit
            </div>
          )}
        </div>
      </div>

      {/* Section nav */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {(["profile", "password", "account"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              activeSection === s
                ? "border border-[#14989a]/40 bg-[#14989a]/15 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {s === "profile" ? "Profile" : s === "password" ? "Password" : "Account"}
          </button>
        ))}
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        {activeSection === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <ProfileSection
              initialDisplayName={displayName}
              initialUsername={username}
              disabled={!isPersistent}
            />
          </motion.div>
        )}
        {activeSection === "password" && (
          <motion.div key="password" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <PasswordSection disabled={!isPersistent} />
          </motion.div>
        )}
        {activeSection === "account" && (
          <motion.div key="account" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <AccountSection isPersistent={isPersistent} role={role} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({
  initialDisplayName,
  initialUsername,
  disabled,
}: {
  initialDisplayName: string;
  initialUsername: string;
  disabled: boolean;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName !== initialDisplayName ? displayName : undefined,
          username: username !== initialUsername ? username : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not update profile.");
      } else {
        setSuccess("Profile updated.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
      <p className="mb-4 text-sm font-semibold text-white">Profile</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Display Name" disabled={disabled}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={disabled}
            placeholder="Your name in Eden"
            className={fieldClass(disabled)}
          />
        </FormField>
        <FormField label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={disabled}
            placeholder="your.username"
            className={fieldClass(disabled)}
          />
          <p className="mt-1 text-[11px] text-white/30">Changing your username will update your sign-in credentials.</p>
        </FormField>

        <Feedback error={error} success={success} />

        <button type="submit" disabled={isPending || disabled} className={submitClass}>
          {isPending ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

// ── Password section ─────────────────────────────────────────────────────────

function PasswordSection({ disabled }: { disabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not update password.");
      } else {
        setSuccess("Password updated. You may need to sign in again.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
      <p className="mb-4 text-sm font-semibold text-white">Change Password</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Current Password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={disabled}
            autoComplete="current-password"
            placeholder="Your current password"
            className={fieldClass(disabled)}
          />
        </FormField>
        <FormField label="New Password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={disabled}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={fieldClass(disabled)}
          />
        </FormField>
        <FormField label="Confirm New Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={disabled}
            autoComplete="new-password"
            placeholder="Repeat new password"
            className={fieldClass(disabled)}
          />
        </FormField>

        <Feedback error={error} success={success} />

        <button type="submit" disabled={isPending || disabled} className={submitClass}>
          {isPending ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}

// ── Account section ──────────────────────────────────────────────────────────

function AccountSection({ isPersistent, role }: { isPersistent: boolean; role: string }) {
  const [signing, setSigning] = useState(false);

  async function handleSignOut() {
    setSigning(true);
    await signOut({ callbackUrl: "/" });
  }

  const roleDescriptions: Record<string, string> = {
    CONSUMER: "Consumer accounts can browse services, use Ask Eden, and manage their workspace.",
    BUSINESS: "Business accounts can publish services and manage their business on Eden.",
    OWNER: "Owner accounts have full platform access including the control room.",
  };

  return (
    <div className="space-y-4">
      {/* Role info */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
        <p className="mb-3 text-sm font-semibold text-white">Account Role</p>
        <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <span className="mt-0.5 rounded-full border border-[#14989a]/30 bg-[#14989a]/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#14989a]">
            {role}
          </span>
          <p className="text-sm text-white/60">
            {roleDescriptions[role] ?? "Your access level is configured server-side."}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-white/30">
          Innovator and owner access are granted server-side. Contact the Eden team to request an upgrade.
        </p>
      </div>

      {/* Sign out */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
        <p className="mb-1 text-sm font-semibold text-white">Sign Out</p>
        <p className="mb-4 text-sm text-white/40">Sign out of your current Eden session.</p>
        {isPersistent ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signing}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signing ? "Signing out…" : "Sign Out"}
          </button>
        ) : (
          <p className="text-sm text-white/30">Demo session — sign in to manage your account.</p>
        )}
      </div>
    </div>
  );
}

// ── Shared UI primitives ─────────────────────────────────────────────────────

function FormField({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className={`text-xs uppercase tracking-[0.12em] ${disabled ? "text-white/25" : "text-white/40"}`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>
        </motion.div>
      )}
      {success && (
        <motion.div key="ok" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{success}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const fieldClass = (disabled?: boolean) =>
  `mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20 ${disabled ? "cursor-not-allowed opacity-50" : ""}`;

const submitClass =
  "rounded-xl border border-[#14989a]/50 bg-[#14989a]/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14989a]/30 disabled:cursor-not-allowed disabled:opacity-50";

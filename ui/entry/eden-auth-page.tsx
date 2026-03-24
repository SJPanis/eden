"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";

type EdenAuthPageProps = {
  maintenanceMode: boolean;
  initialMode: "signin" | "signup";
  callbackUrl: string;
  earlyAccessEnabled?: boolean;
};

type AuthMode = "signin" | "signup" | "waitlist";

export function EdenAuthPage({
  maintenanceMode,
  initialMode,
  callbackUrl,
  earlyAccessEnabled = false,
}: EdenAuthPageProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const resolvedCallbackUrl = useMemo(() => callbackUrl || "/consumer", [callbackUrl]);

  function handleModeSwitch(next: AuthMode) {
    setMode(next);
    setSubmitError(null);
    setSuccessNote(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessNote(null);
    if (mode === "waitlist") {
      startTransition(() => {
        void handleWaitlist();
      });
    } else {
      startTransition(() => {
        void (mode === "signup" ? handleSignUp() : handleSignIn());
      });
    }
  }

  async function handleWaitlist() {
    const response = await fetch("/api/auth/join-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: waitlistEmail, name: waitlistName }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      alreadyRegistered?: boolean;
      error?: string;
    } | null;
    if (!response.ok) {
      setSubmitError(body?.error ?? "Unable to join the waitlist.");
      return;
    }
    setSuccessNote(
      body?.alreadyRegistered
        ? "You're already on the waitlist — we'll reach out soon."
        : "You're on the waitlist! We'll send your access code when a spot opens.",
    );
  }

  async function handleSignUp() {
    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        displayName,
        password,
        accessCode: accessCode || undefined,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      requiresCode?: boolean;
    } | null;
    if (!response.ok) {
      setSubmitError(body?.error ?? "Unable to create your Eden account.");
      return;
    }
    setSuccessNote("Account created. Signing you in now.");
    await handleSignIn();
  }

  async function handleSignIn() {
    try {
      const response = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: resolvedCallbackUrl,
      });
      if (!response) {
        setSubmitError("Eden could not complete sign-in. Please try again.");
        setSuccessNote(null);
        return;
      }
      if (response.error) {
        setSubmitError(
          response.error === "CredentialsSignin"
            ? "Invalid username or password."
            : "Sign-in is temporarily unavailable. Please try again.",
        );
        setSuccessNote(null);
        return;
      }
      if (!response.ok || !response.url) {
        setSubmitError("Eden could not complete sign-in. Please try again.");
        setSuccessNote(null);
        return;
      }
      setSuccessNote("Signed in. Taking you to your workspace.");
      window.location.assign(response.url);
    } catch {
      setSubmitError("Eden could not complete sign-in. Please try again.");
      setSuccessNote(null);
    }
  }

  return (
    <div
      className="eden-grid min-h-screen px-4 py-10 md:px-8"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {maintenanceMode ? (
          <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="font-semibold">Maintenance active.</span> Some actions may be limited.
          </div>
        ) : null}

        <Link
          href="/"
          className="mb-7 flex w-fit items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/30 transition-colors hover:text-white/70"
        >
          <span>←</span>
          <span>Eden</span>
        </Link>

        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[rgba(20,152,154,0.35)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.18),rgba(13,31,48,0.97))] shadow-[0_4px_20px_-6px_rgba(20,152,154,0.45)]">
            <EdenLogoMark size={28} />
          </div>
          <div>
            <p className="font-semibold text-white">Eden</p>
            <p className="text-xs text-white/40">AI service economy</p>
          </div>
        </div>

        {mode !== "waitlist" ? (
          <div className="mb-6 flex rounded-2xl border border-white/8 bg-white/[0.04] p-1">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeSwitch(m)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "border border-[#14989a]/40 bg-[#14989a]/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-white/8 bg-white/[0.05] p-6 backdrop-blur-xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {mode === "waitlist" ? (
                <>
                  <p className="text-lg font-semibold text-white">Join the waitlist</p>
                  <p className="mt-1 text-sm text-white/40">
                    We&apos;ll send your access code when a spot opens.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-white">
                    {mode === "signup" ? "Create your Eden account" : "Welcome back to Eden"}
                  </p>
                  <p className="mt-1 text-sm text-white/40">
                    {mode === "signup"
                      ? earlyAccessEnabled
                        ? "Early access — an invite code is required."
                        : "New accounts start in the consumer layer."
                      : "Sign in to access your workspace."}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <AnimatePresence initial={false}>
              {mode === "waitlist" ? (
                <motion.div
                  key="waitlist-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.12em] text-white/40">Email</label>
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                      Name <span className="text-white/20">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      autoComplete="name"
                      placeholder="Your name"
                      className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.12em] text-white/40">Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="your.username"
                      className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {mode === "signup" ? (
                      <motion.div
                        key="display-name"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden space-y-1"
                      >
                        <label className="text-xs uppercase tracking-[0.12em] text-white/40">Display name</label>
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          autoComplete="nickname"
                          placeholder="Your name in Eden"
                          className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.12em] text-white/40">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                      className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {mode === "signup" && earlyAccessEnabled ? (
                      <motion.div
                        key="access-code"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden space-y-1"
                      >
                        <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                          Early Access Code
                        </label>
                        <input
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                          autoComplete="off"
                          placeholder="EDEN-XXXX-XXXX"
                          className="mt-1 w-full rounded-xl border border-[#14989a]/25 bg-[#14989a]/5 px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                        />
                        <p className="mt-1 text-[11px] text-white/30">
                          No code?{" "}
                          <button
                            type="button"
                            onClick={() => handleModeSwitch("waitlist")}
                            className="text-[#14989a]/70 underline hover:text-[#14989a]"
                          >
                            Join the waitlist
                          </button>
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {submitError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {submitError}
                  </div>
                </motion.div>
              ) : null}
              {successNote ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    {successNote}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl border border-[#14989a]/50 bg-[#14989a]/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? mode === "signup"
                  ? "Creating account…"
                  : mode === "waitlist"
                    ? "Joining…"
                    : "Signing in…"
                : mode === "signup"
                  ? "Create Account"
                  : mode === "waitlist"
                    ? "Join Waitlist"
                    : "Sign In"}
            </button>

            {mode === "waitlist" ? (
              <button
                type="button"
                onClick={() => handleModeSwitch("signup")}
                className="w-full text-center text-xs text-white/30 transition-colors hover:text-white/60"
              >
                ← Back to sign up
              </button>
            ) : null}
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-white/30">
          {earlyAccessEnabled
            ? "Eden is in early access. Invite codes are required to create an account."
            : "Innovator and owner access are granted server-side after sign-in."}
        </p>
      </motion.div>
    </div>
  );
}

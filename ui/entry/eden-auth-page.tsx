"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";
import { ParticleCanvas } from "@/modules/core/components/particle-canvas";

type EdenAuthPageProps = {
  maintenanceMode: boolean;
  initialMode: "signin" | "signup";
  callbackUrl: string;
  earlyAccessEnabled?: boolean;
};

type AuthMode = "signin" | "invite" | "signup" | "waitlist";

export function EdenAuthPage({
  maintenanceMode,
  initialMode,
  callbackUrl,
  earlyAccessEnabled = false,
}: EdenAuthPageProps) {
  const [isPending, startTransition] = useTransition();
  const startMode: AuthMode =
    initialMode === "signup" ? "invite" : initialMode;
  const [mode, setMode] = useState<AuthMode>(startMode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [validatedCode, setValidatedCode] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteShake, setInviteShake] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const resolvedCallbackUrl = useMemo(() => callbackUrl || "/consumer", [callbackUrl]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setPendingReferralCode(ref);
      try { sessionStorage.setItem("eden_pending_referral", ref); } catch {}
    } else {
      try {
        const stored = sessionStorage.getItem("eden_pending_referral");
        if (stored) setPendingReferralCode(stored);
      } catch {}
    }
  }, [searchParams]);

  function handleModeSwitch(next: AuthMode) {
    setMode(next);
    setSubmitError(null);
    setSuccessNote(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessNote(null);
    if (mode === "invite") {
      startTransition(() => {
        void handleValidateInvite();
      });
    } else if (mode === "waitlist") {
      startTransition(() => {
        void handleWaitlist();
      });
    } else {
      startTransition(() => {
        void (mode === "signup" ? handleSignUp() : handleSignIn());
      });
    }
  }

  async function handleValidateInvite() {
    const response = await fetch("/api/auth/validate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteInput }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      code?: string;
      error?: string;
    } | null;
    if (!response.ok || !body?.ok) {
      setSubmitError(body?.error ?? "This code isn't valid or has already been used.");
      setInviteShake(true);
      setTimeout(() => setInviteShake(false), 500);
      return;
    }
    setValidatedCode(body.code ?? inviteInput.trim().toUpperCase());
    setAccessCode(body.code ?? inviteInput.trim().toUpperCase());
    setSubmitError(null);
    handleModeSwitch("signup");
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
        referralCode: pendingReferralCode || undefined,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      requiresCode?: boolean;
      welcomeLeaves?: number;
    } | null;
    if (!response.ok) {
      setSubmitError(body?.error ?? "Unable to create your Eden account.");
      return;
    }
    try { sessionStorage.removeItem("eden_pending_referral"); } catch {}
    const leaves = body?.welcomeLeaves ?? 0;
    setSuccessNote(
      leaves > 0
        ? `Account created! You've been gifted ${leaves} Leaf's. Signing you in now.`
        : "Account created. Signing you in now.",
    );
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

  const isSignupTab = mode === "signup" || mode === "invite";

  return (
    <div
      className="relative min-h-screen"
      style={{ backgroundColor: "#0b1622" }}
    >
      <ParticleCanvas />

      {/* Grain overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
        aria-hidden
      />

      {/* Ambient glow behind card */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(45,212,191,0.05) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div
        className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {maintenanceMode ? (
            <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <span className="font-semibold">Maintenance active.</span> Some actions may be limited.
            </div>
          ) : null}

          <Link
            href="/"
            className="mb-8 flex w-fit items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/30 transition-colors hover:text-white/60"
          >
            <span>←</span>
            <span>Eden</span>
          </Link>

          {/* Logo + brand */}
          <div className="mb-8 flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px]"
              style={{
                background:
                  "radial-gradient(circle at 35% 25%, rgba(45,212,191,0.2), rgba(11,22,34,0.97))",
                border: "1px solid rgba(45,212,191,0.3)",
                boxShadow:
                  "0 0 24px -4px rgba(45,212,191,0.35), 0 4px 20px -6px rgba(45,212,191,0.2)",
              }}
            >
              <EdenLogoMark size={30} />
            </div>
            <div>
              <p
                className="text-xl text-white"
                style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
              >
                Eden
              </p>
              <p className="text-xs text-white/40">AI service economy</p>
            </div>
          </div>

          {/* Mode tabs — show for signin/signup/invite, hide on waitlist */}
          {mode !== "waitlist" ? (
            <div
              className="mb-6 flex rounded-2xl p-1"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {(["signup", "signin"] as const).map((m) => {
                const isActive = m === "signup" ? isSignupTab : mode === "signin";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      handleModeSwitch(
                        m === "signup" ? "invite" : "signin",
                      )
                    }
                    className="flex-1 rounded-xl py-2 text-sm font-medium transition-colors"
                    style={
                      isActive
                        ? {
                            background: "rgba(45,212,191,0.14)",
                            border: "1px solid rgba(45,212,191,0.35)",
                            color: "#fff",
                          }
                        : { color: "rgba(255,255,255,0.38)", border: "1px solid transparent" }
                    }
                  >
                    {m === "signup" ? "Create account" : "Sign in"}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Card */}
          <div
            className="rounded-[28px] p-7 backdrop-blur-xl"
            style={{
              background: "rgba(13,30,46,0.82)",
              border: "1px solid rgba(45,212,191,0.15)",
              boxShadow:
                "0 8px 40px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode + "-heading"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {mode === "waitlist" ? (
                  <>
                    <p
                      className="text-xl text-white"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Join the waitlist
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      We&apos;ll send your access code when a spot opens.
                    </p>
                  </>
                ) : mode === "invite" ? (
                  <>
                    <p
                      className="text-xl text-white"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Enter your invite code
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      Eden is in early access — an invite code is required.
                    </p>
                  </>
                ) : mode === "signup" ? (
                  <>
                    <p
                      className="text-xl text-white"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Create your Eden account
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      {validatedCode ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="rounded-md px-2 py-0.5 font-mono text-xs"
                            style={{
                              background: "rgba(45,212,191,0.12)",
                              border: "1px solid rgba(45,212,191,0.3)",
                              color: "#2dd4bf",
                            }}
                          >
                            {validatedCode}
                          </span>
                          <span>invite accepted</span>
                        </span>
                      ) : (
                        "New accounts start in the consumer layer."
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="text-xl text-white"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Welcome back to Eden
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      Sign in to access your workspace.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <AnimatePresence initial={false} mode="wait">
                {mode === "invite" ? (
                  <motion.div
                    key="invite-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                        Invite Code
                      </label>
                      <motion.div
                        animate={{ x: inviteShake ? [-10, 10, -8, 8, -4, 4, 0] : 0 }}
                        transition={{ duration: 0.45, ease: "easeInOut" as const }}
                      >
                        <input
                          value={inviteInput}
                          onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                          autoComplete="off"
                          placeholder="EDEN-XXXX-XXXX"
                          className="mt-1 w-full rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition"
                          style={{
                            background: "rgba(45,212,191,0.05)",
                            border: submitError
                              ? "1px solid rgba(239,68,68,0.5)"
                              : "1px solid rgba(45,212,191,0.25)",
                            boxShadow: submitError
                              ? "0 0 0 3px rgba(239,68,68,0.1)"
                              : undefined,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.border = submitError
                              ? "1px solid rgba(239,68,68,0.6)"
                              : "1px solid rgba(45,212,191,0.55)";
                            e.currentTarget.style.boxShadow = submitError
                              ? "0 0 0 3px rgba(239,68,68,0.12)"
                              : "0 0 0 3px rgba(45,212,191,0.15)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.border = submitError
                              ? "1px solid rgba(239,68,68,0.5)"
                              : "1px solid rgba(45,212,191,0.25)";
                            e.currentTarget.style.boxShadow = submitError
                              ? "0 0 0 3px rgba(239,68,68,0.1)"
                              : "none";
                          }}
                        />
                      </motion.div>
                      <p className="mt-2 text-[11px] text-white/30">
                        No code?{" "}
                        <button
                          type="button"
                          onClick={() => handleModeSwitch("waitlist")}
                          className="underline transition-colors"
                          style={{ color: "rgba(45,212,191,0.65)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#2dd4bf")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "rgba(45,212,191,0.65)")
                          }
                        >
                          Join the waitlist
                        </button>
                      </p>
                    </div>
                  </motion.div>
                ) : mode === "waitlist" ? (
                  <motion.div
                    key="waitlist-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                        Email
                      </label>
                      <input
                        type="email"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="mt-1 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(45,212,191,0.5)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px rgba(45,212,191,0.12)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
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
                        className="mt-1 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(45,212,191,0.5)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px rgba(45,212,191,0.12)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
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
                      <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                        Username
                      </label>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder="your.username"
                        className="mt-1 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(45,212,191,0.5)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px rgba(45,212,191,0.12)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
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
                          <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                            Display name
                          </label>
                          <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            autoComplete="nickname"
                            placeholder="Your name in Eden"
                            className="mt-1 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.border =
                                "1px solid rgba(45,212,191,0.5)";
                              e.currentTarget.style.boxShadow =
                                "0 0 0 3px rgba(45,212,191,0.12)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.border =
                                "1px solid rgba(255,255,255,0.08)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={
                          mode === "signup" ? "new-password" : "current-password"
                        }
                        placeholder={
                          mode === "signup" ? "At least 8 characters" : "Your password"
                        }
                        className="mt-1 w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(45,212,191,0.5)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px rgba(45,212,191,0.12)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border =
                            "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error / success banners */}
              <AnimatePresence initial={false}>
                {submitError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-xl px-4 py-3 text-sm text-rose-300"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                      }}
                    >
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
                    <div
                      className="rounded-xl px-4 py-3 text-sm text-emerald-400"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      {successNote}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isPending}
                whileHover={{ scale: isPending ? 1 : 1.015 }}
                whileTap={{ scale: isPending ? 1 : 0.985 }}
                className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(45,212,191,0.85) 0%, rgba(45,212,191,0.9) 100%)",
                  border: "1px solid rgba(45,212,191,0.4)",
                  boxShadow: "0 4px 20px -4px rgba(45,212,191,0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!isPending) {
                    e.currentTarget.style.boxShadow =
                      "0 6px 28px -4px rgba(45,212,191,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px -4px rgba(45,212,191,0.3)";
                }}
              >
                {isPending
                  ? mode === "invite"
                    ? "Validating…"
                    : mode === "signup"
                      ? "Creating account…"
                      : mode === "waitlist"
                        ? "Joining…"
                        : "Signing in…"
                  : mode === "invite"
                    ? "Continue →"
                    : mode === "signup"
                      ? "Create Account"
                      : mode === "waitlist"
                        ? "Join Waitlist"
                        : "Sign In"}
              </motion.button>

              {mode === "waitlist" ? (
                <button
                  type="button"
                  onClick={() => handleModeSwitch("invite")}
                  className="w-full text-center text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
                  }
                >
                  ← Back to invite code
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
    </div>
  );
}

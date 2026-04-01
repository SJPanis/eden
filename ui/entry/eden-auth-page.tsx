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
    initialMode === "signup" ? "signup" : initialMode;
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
        referralCode: pendingReferralCode || accessCode || undefined,
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
      leaves >= 500
        ? `Welcome to Eden. You've been granted ${leaves} Leafs to get started.`
        : leaves > 0
          ? `Account created! You've been gifted ${leaves} Leafs. Signing you in now.`
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
                        m === "signup" ? "signup" : "signin",
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
                      Enter an invite code if you have one.
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

            {/* Google OAuth button */}
            {(mode === "signin" || mode === "signup") && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: resolvedCallbackUrl })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "11px 0",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    marginBottom: 16,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.3z"/>
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z"/>
                    <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.7C1 16.9 0 20.3 0 24s1 7.1 2.7 10.2l8.1-5.4z"/>
                    <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.5 0 24 0 14.8 0 6.7 5.2 2.7 13.8l8.1 6.2C12.7 13.6 17.9 9.5 24 9.5z"/>
                  </svg>
                  Continue with Google
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  or continue with email
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>
              </div>
            )}

            <form className={`${mode === "signin" || mode === "signup" ? "mt-0" : "mt-6"} space-y-4`} onSubmit={handleSubmit}>
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
                    {mode === "signup" && pendingReferralCode ? (
                      <div
                        className="rounded-xl px-3 py-2 text-xs text-white/70"
                        style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)" }}
                      >
                        🌿 You were invited by <span className="font-medium text-white/90">{pendingReferralCode}</span>. Sign up to get <span className="font-semibold" style={{ color: "#2dd4bf" }}>500 bonus Leafs</span>.
                      </div>
                    ) : null}
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

                    {mode === "signup" && !pendingReferralCode && (
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-[0.12em] text-white/40">
                          Referral code <span className="normal-case text-white/20">(optional)</span>
                        </label>
                        <input
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                          autoComplete="off"
                          placeholder="EDEN-XXXX"
                          className="mt-1 w-full rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.border = "1px solid rgba(45,212,191,0.4)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,212,191,0.08)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        />
                      </div>
                    )}
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
            Eden is open — create your account and start building.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

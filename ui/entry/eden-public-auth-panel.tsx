"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";

type EdenPublicAuthPanelProps = {
  maintenanceMode: boolean;
};

type AuthMode = "signin" | "signup";

const audienceCards = [
  {
    id: "builders",
    icon: "◈",
    label: "Builders",
    tag: "Publish & earn",
    detail:
      "Package your AI workflows as services. Set a visible price, publish to discovery, and earn Leaf's every time someone runs your service.",
  },
  {
    id: "consumers",
    icon: "◉",
    label: "Consumers",
    tag: "Discover & run",
    detail:
      "Browse or Ask Eden to find the right service. Top up Leaf's once — then run services with visible pricing and no hidden charges.",
  },
  {
    id: "contributors",
    icon: "◊",
    label: "Contributors",
    tag: "Improve & earn",
    detail:
      "Submit code, design, or ideas to Eden itself. Approved contributions earn score and Leaf's from the contribution pool each period.",
  },
];

const edenLoopSteps = [
  { id: "publish",    step: "01", label: "Builders publish",          detail: "Services appear in discovery only after visible pricing and publish state are set. Builders earn 70% of every run." },
  { id: "discover",  step: "02", label: "Consumers discover & run",   detail: "Ask Eden or browse the marketplace. Leaf's cover every run — no hidden checkout, no surprises during service use." },
  { id: "earn",      step: "03", label: "Economy distributes",        detail: "Each purchase splits automatically: builder earnings, platform fee, provider reserve, and contribution pool — all in Leaf's." },
  { id: "contribute",step: "04", label: "Contributors improve Eden",  detail: "Submit contributions to the platform itself. The contribution pool is distributed based on approved contribution scores each period." },
];

export function EdenPublicAuthPanel({ maintenanceMode }: EdenPublicAuthPanelProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("auth") === "signin" ? "signin" : "signup",
  );
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const callbackUrl = useMemo(() => "/consumer", []);

  function handleModeSwitch(next: AuthMode) {
    setMode(next);
    setSubmitError(null);
    setSuccessNote(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessNote(null);
    startTransition(() => {
      void (mode === "signup" ? handleSignUp() : handleSignIn());
    });
  }

  async function handleSignUp() {
    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password }),
    });
    const responseBody = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok) {
      setSubmitError(responseBody?.error ?? "Unable to create your Eden account.");
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
        callbackUrl,
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
            : response.error === "Configuration" || response.error === "CallbackRouteError"
              ? "Sign-in is temporarily unavailable. Please try again in a moment."
              : "Eden could not complete sign-in. Please try again.",
        );
        setSuccessNote(null);
        return;
      }
      if (!response.ok || !response.url) {
        setSubmitError("Eden could not complete sign-in. Please try again.");
        setSuccessNote(null);
        return;
      }
      setSuccessNote("Signed in. Redirecting to your Eden workspace.");
      window.location.assign(response.url);
    } catch (error) {
      console.error("[eden-auth] credentials sign-in failed", error);
      setSubmitError("Eden could not complete sign-in. Please try again.");
      setSuccessNote(null);
    }
  }

  return (
    <div className="eden-grid min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="font-semibold">Platform maintenance notice.</span>{" "}
            Public access is still available, but some platform actions may be limited.
          </div>
        ) : null}

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[rgba(20,152,154,0.35)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.18),rgba(13,31,48,0.97))]">
              <EdenLogoMark size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Eden</p>
              <p className="text-[10px] text-white/35">AI service economy</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => handleModeSwitch("signin")}
            className="rounded-full border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-[#14989a]/40 hover:text-white"
          >
            Sign in
          </button>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">

          {/* Left: info */}
          <section className="flex flex-col gap-5">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(135deg,rgba(20,152,154,0.10),rgba(13,31,48,0.6)_60%,rgba(20,152,154,0.04))] p-7"
            >
              {/* Dot-grid overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{ backgroundImage: "radial-gradient(circle, #14989a 1px, transparent 1px)", backgroundSize: "28px 28px" }}
              />
              <div className="relative">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">Eden Platform</p>
                <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-white">
                  The AI service<br />economy.{" "}
                  <span className="text-eden-accent">Open to builders.</span>
                </h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-white/50">
                  Eden connects builders who publish AI services with consumers who discover and run them — with transparent Leaf's pricing, no hidden charges, and a contribution economy built in.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Publish AI services", "Visible pricing before every run", "Contribution economy", "No hidden charges"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* How Eden works */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">How Eden works</p>
                  <p className="mt-1.5 text-sm text-white/50">One closed loop: builders publish, consumers run, economy distributes, contributors improve.</p>
                </div>
                <span className="shrink-0 rounded-full border border-[rgba(20,152,154,0.25)] bg-[rgba(20,152,154,0.06)] px-3 py-1 text-xs text-eden-accent">The Eden loop</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {edenLoopSteps.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                  >
                    <p className="font-mono text-[10px] tracking-[0.18em] text-eden-accent/60">{item.step}</p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1.5 text-xs leading-5 text-white/40">{item.detail}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Who it's for */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">Who Eden is for</p>
              <p className="mt-1.5 text-sm text-white/50">Three ways to participate in the Eden economy.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {audienceCards.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-eden-accent/70">{item.icon}</span>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                      </div>
                      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40">{item.tag}</span>
                    </div>
                    <p className="mt-2.5 text-xs leading-5 text-white/40">{item.detail}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </section>

          {/* Right: auth card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
            className="self-start xl:sticky xl:top-6"
          >
            <div className="rounded-[28px] border border-white/8 bg-white/[0.05] p-6 backdrop-blur-xl">

              {/* Mode toggle */}
              <div className="flex rounded-2xl border border-white/8 bg-white/[0.04] p-1">
                {(["signup", "signin"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeSwitch(m)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all duration-150 ${
                      mode === m
                        ? "border border-[#14989a]/40 bg-[#14989a]/15 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {m === "signup" ? "Create account" : "Sign in"}
                  </button>
                ))}
              </div>

              {/* Heading */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="mt-5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Join Eden</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {mode === "signup" ? "Create your account" : "Welcome back"}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/40">
                    {mode === "signup"
                      ? "New accounts start in the consumer layer. Builder and owner access are role-based and resolved server-side."
                      : "Sign in to access your Eden workspace — consumer, builder, or owner based on your role."}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Form */}
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-white/35">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="your.username"
                    className="mt-2 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
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
                      className="overflow-hidden"
                    >
                      <label className="text-xs uppercase tracking-[0.12em] text-white/35">Display name</label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        autoComplete="nickname"
                        placeholder="Your name in Eden"
                        className="mt-2 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-white/35">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    className="mt-2 w-full rounded-xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-[#14989a]/20"
                  />
                </div>

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
                    ? mode === "signup" ? "Creating account…" : "Signing in…"
                    : mode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </form>

              {/* Access info */}
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold text-white/60">How access works</p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-white/40">
                  {mode === "signup" ? (
                    <>
                      <li>Account created with a securely hashed password.</li>
                      <li>New accounts start in the consumer layer.</li>
                      <li>Builder and owner access are granted server-side.</li>
                    </>
                  ) : (
                    <>
                      <li>Verified through Auth.js with your credentials.</li>
                      <li>You land in the correct dashboard for your role.</li>
                      <li>Protected routes stay blocked without a valid session.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href="/consumer"
                  className="text-xs text-white/35 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70"
                >
                  Explore marketplace first
                </Link>
                <p className="text-[10px] text-white/25">Role resolved server-side</p>
              </div>

            </div>
          </motion.section>

        </div>
      </div>
    </div>
  );
}

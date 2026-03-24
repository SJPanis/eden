"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";

type EdenPublicAuthPanelProps = {
  maintenanceMode: boolean;
};

type AuthMode = "signin" | "signup";

const audienceCards = [
  {
    id: "builders",
    label: "Builders",
    tag: "Publish & earn",
    detail:
      "Package your AI workflows, automations, or tools as services. Set a visible price, publish to Eden discovery, and earn Leaf's every time someone runs your service.",
  },
  {
    id: "consumers",
    label: "Consumers",
    tag: "Discover & run",
    detail:
      "Browse or Ask Eden to find the right service. Top up Leaf's once — then run services confidently with visible pricing and no hidden charges during use.",
  },
  {
    id: "contributors",
    label: "Contributors",
    tag: "Improve & earn",
    detail:
      "Submit code improvements, design work, bug fixes, or ideas to Eden itself. Approved contributions earn Contribution Score and Leaf's from the contribution pool every period.",
  },
];

const edenLoopSteps = [
  {
    id: "publish",
    step: "01",
    label: "Builders publish",
    detail:
      "Services appear in discovery only after visible pricing and publish state are set. Builders earn 70% of every run.",
  },
  {
    id: "discover",
    step: "02",
    label: "Consumers discover & run",
    detail:
      "Ask Eden or browse the marketplace. Leaf's cover every run — no hidden checkout, no surprises during service use.",
  },
  {
    id: "earn",
    step: "03",
    label: "Economy distributes",
    detail:
      "Each service purchase splits automatically: builder earnings, platform fee, provider reserve, and contribution pool — all in Leaf's.",
  },
  {
    id: "contribute",
    step: "04",
    label: "Contributors improve Eden",
    detail:
      "Submit contributions to the platform itself. Each period, the contribution pool is distributed based on approved contribution scores.",
  },
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_180%_100%_at_top_left,rgba(20,152,154,0.10),rgba(255,255,255,0.97)_48%,rgba(210,223,235,0.35))] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Platform maintenance notice.</span>{" "}
            Public access is still available, but some platform actions may be limited.
          </div>
        ) : null}

        {/* Top nav strip */}
        <div className="flex items-center justify-between">
          <EdenBrandLockup size="sm" label="Eden" subtitle="AI service economy" />
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="rounded-full border border-eden-edge bg-white/90 px-4 py-2 text-sm font-medium text-eden-ink transition-colors hover:border-eden-ring hover:text-eden-accent"
          >
            Sign in
          </button>
        </div>

        {/* Hero + auth grid */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">

          {/* Left: hero and info */}
          <section className="flex flex-col gap-6">

            {/* Hero */}
            <div className="rounded-[28px] border border-eden-edge bg-white/88 p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
                Eden Platform
              </p>
              <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.12] tracking-tight text-eden-ink">
                The AI service economy.<br />
                <span className="text-eden-accent">Open to builders.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-eden-muted">
                Eden is a living ecosystem — builders publish and price AI services,
                consumers discover and run them with transparent Leaf's pricing,
                and contributors shape the platform itself and earn from it.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[rgba(20,152,154,0.30)] bg-[rgba(20,152,154,0.07)] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-eden-accent">
                  Publish AI services
                </span>
                <span className="rounded-full border border-eden-edge bg-white/80 px-3 py-1.5 text-xs text-eden-muted">
                  Visible pricing before every run
                </span>
                <span className="rounded-full border border-eden-edge bg-white/80 px-3 py-1.5 text-xs text-eden-muted">
                  Contribution economy
                </span>
                <span className="rounded-full border border-eden-edge bg-white/80 px-3 py-1.5 text-xs text-eden-muted">
                  No hidden charges
                </span>
              </div>
            </div>

            {/* Eden loop */}
            <div className="rounded-[28px] border border-eden-edge bg-[linear-gradient(135deg,rgba(20,152,154,0.05),rgba(255,255,255,0.97))] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
                    How Eden works
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    One closed loop: builders publish, consumers run, the economy distributes,
                    contributors improve Eden.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[rgba(20,152,154,0.25)] bg-[rgba(20,152,154,0.06)] px-3 py-1 text-xs font-medium text-eden-accent">
                  The Eden loop
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {edenLoopSteps.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-eden-edge bg-white/92 p-4"
                  >
                    <p className="font-mono text-[10px] tracking-[0.18em] text-eden-accent/70">
                      {item.step}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-eden-ink">{item.label}</p>
                    <p className="mt-1.5 text-sm leading-6 text-eden-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Who it's for */}
            <div className="rounded-[28px] border border-eden-edge bg-white/88 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
                    Who Eden is for
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Three ways to participate in the Eden economy.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {audienceCards.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-eden-edge bg-white/92 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                      <span className="rounded-full border border-eden-edge bg-white px-2 py-0.5 text-[10px] text-eden-muted">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-eden-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* Right: auth */}
          <section className="flex flex-col gap-0 rounded-[28px] border border-eden-edge bg-white/94 p-6 self-start sticky top-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Join Eden
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-eden-ink">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              {mode === "signup"
                ? "New accounts start in the consumer layer. Builder and owner access are role-based and resolved server-side after sign-in."
                : "Sign in to access your Eden workspace — consumer, builder, or owner dashboard based on your role."}
            </p>

            <div className="mt-5 flex gap-2">
              {(["signup", "signin"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => {
                    setMode(nextMode);
                    setSubmitError(null);
                    setSuccessNote(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    mode === nextMode
                      ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                      : "border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                  }`}
                >
                  {nextMode === "signup" ? "Create Account" : "Sign In"}
                </button>
              ))}
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm text-eden-muted">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                  placeholder="your.username"
                />
              </label>

              {mode === "signup" ? (
                <label className="flex flex-col gap-2 text-sm text-eden-muted">
                  <span>Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="nickname"
                    className="rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                    placeholder="Your name in Eden"
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-2 text-sm text-eden-muted">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                />
              </label>

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}
              {successNote ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successNote}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl border border-eden-ring bg-eden-accent-soft px-5 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/75 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "signup"
                    ? "Create Account"
                    : "Sign In"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
              <p className="text-sm font-semibold text-eden-ink">How access works</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-eden-muted">
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

            <p className="mt-4 text-xs leading-5 text-eden-muted">
              By continuing, you enter the live Eden authentication flow. Builder and owner
              access depend on server-side role resolution after sign-in.
            </p>

            <div className="mt-4">
              <Link
                href="/consumer"
                className="text-sm font-medium text-eden-ink underline decoration-eden-ring underline-offset-4 transition-colors hover:text-eden-accent"
              >
                Explore the marketplace first
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

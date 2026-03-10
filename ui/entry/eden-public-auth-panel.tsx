"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";

type EdenPublicAuthPanelProps = {
  maintenanceMode: boolean;
};

type AuthMode = "signin" | "signup";

const publicAudienceCards = [
  {
    id: "builders",
    label: "For builders",
    detail:
      "Create, price, and publish services so they become published and available in Eden discovery.",
  },
  {
    id: "consumers",
    label: "For consumers",
    detail:
      "Explore published services, check visible pricing, add Eden Leaves only if needed, and run without hidden charges during service use.",
  },
];

const howEdenWorksSteps = [
  {
    id: "publish",
    label: "1. Builders publish services",
    detail: "Services appear in discovery only after publish state and visible pricing are set.",
  },
  {
    id: "discover",
    label: "2. Consumers explore",
    detail: "Marketplace cards and Ask Eden show published availability, visible pricing, and trust cues.",
  },
  {
    id: "run",
    label: "3. Eden Leaves power usage",
    detail:
      "Consumers top up Leaves first, then run services with no hidden checkout during usage.",
  },
];

export function EdenPublicAuthPanel({ maintenanceMode }: EdenPublicAuthPanelProps) {
  const router = useRouter();
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
  const callbackUrl = useMemo(
    () => {
      const rawCallbackUrl = searchParams.get("callbackUrl");
      return rawCallbackUrl && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
        ? rawCallbackUrl
        : "/";
    },
    [searchParams],
  );

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        displayName,
        password,
      }),
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
    const response = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!response?.ok || response.error) {
      setSubmitError("Invalid username or password.");
      setSuccessNote(null);
      return;
    }

    router.push(response.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,237,213,0.8),rgba(255,255,255,0.95)_42%,rgba(219,234,254,0.9))] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Platform maintenance notice.</span> Public access is
            still available, but some live platform actions may be limited.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <section className="rounded-[32px] border border-eden-edge bg-white/88 p-6">
            <EdenBrandLockup
              size="md"
              label="Eden"
              subtitle="Launchable AI service platform"
            />
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Eden launch
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-eden-ink">
              Discover published AI services and run them with visible pricing.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
              Eden connects builders who publish services with consumers who discover, fund, and
              use them through Eden Leaves. Pricing is visible before every run, and service usage
              stays {edenLaunchLabels.creditsOnlyBilling.toLowerCase()} with no hidden charges
              during service use.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Published and available
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                {edenLaunchLabels.visiblePricing}
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                {edenLaunchLabels.creditsOnlyBilling}
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                No hidden charges during service use
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,255,255,0.98))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    How Eden works
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    One loop connects builder publishing, consumer discovery, and Leaves-funded
                    service usage.
                  </p>
                </div>
                <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                  One visible system
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {howEdenWorksSteps.map((step) => (
                  <div key={step.id} className="rounded-2xl border border-eden-edge bg-white/92 p-4">
                    <p className="text-sm font-semibold text-eden-ink">{step.label}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(239,246,255,0.8),rgba(255,255,255,0.96))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Who Eden is for
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Builders publish and improve services. Consumers discover them, top up Leaves,
                    and run them confidently.
                  </p>
                </div>
                <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                  Builders and consumers
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {publicAudienceCards.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-eden-edge bg-white/92 p-4">
                    <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-eden-edge bg-white/92 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Access Eden
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-eden-ink">
              Create an Eden account or sign in
            </h2>
            <p className="mt-3 text-sm leading-6 text-eden-muted">
              Username and password stay inside Eden. New accounts start in the consumer layer, and
              dashboard access still comes from the server-backed role system.
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
                  autoComplete={mode === "signup" ? "username" : "username"}
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

              <div className="rounded-2xl border border-eden-edge bg-eden-bg/70 p-4">
                <p className="text-sm font-semibold text-eden-ink">What happens next</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-eden-muted">
                  {mode === "signup" ? (
                    <>
                      <li>Your account is created with a securely hashed password.</li>
                      <li>You start in the consumer role unless trusted server-side role logic says otherwise.</li>
                      <li>Owner access stays separately authorized.</li>
                    </>
                  ) : (
                    <>
                      <li>Your username and password are verified through Auth.js.</li>
                      <li>You land in the correct dashboard for your server-backed role.</li>
                      <li>Protected routes stay blocked without an authenticated session.</li>
                    </>
                  )}
                </ul>
              </div>

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

            <div className="mt-6 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(219,234,254,0.38))] p-4">
              <p className="text-sm font-semibold text-eden-ink">Security note</p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">
                Owner access remains separately authorized. Creating an account does not grant
                owner privileges.
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-eden-muted">
              By continuing, you enter the live Eden authentication flow. Builder and owner access
              still depend on trusted server-side role resolution after sign-in.
            </p>

            <div className="mt-5">
              <Link
                href="/consumer"
                className="text-sm font-medium text-eden-ink underline decoration-eden-ring underline-offset-4 transition-colors hover:text-eden-accent"
              >
                Explore the public consumer marketplace first
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

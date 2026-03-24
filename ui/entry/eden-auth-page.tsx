"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signIn } from "next-auth/react";

type EdenAuthPageProps = {
  maintenanceMode: boolean;
  initialMode: "signin" | "signup";
  callbackUrl: string;
};

type AuthMode = "signin" | "signup";

export function EdenAuthPage({ maintenanceMode, initialMode, callbackUrl }: EdenAuthPageProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const resolvedCallbackUrl = useMemo(() => callbackUrl || "/consumer", [callbackUrl]);

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
    const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_160%_90%_at_top,rgba(20,152,154,0.10),rgba(255,255,255,0.98)_50%,rgba(210,223,235,0.3))] px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">

        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="font-semibold">Platform maintenance notice.</span>{" "}
            Some actions may be limited.
          </div>
        ) : null}

        {/* Back to homepage */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white w-fit"
        >
          <span className="text-base leading-none">←</span>
          <span>Back to Eden</span>
        </Link>

        {/* Brand */}
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-950/20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(20,83,45,0.96))] shadow-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/eden-logo.png" alt="Eden" className="h-7 w-7 object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {mode === "signup" ? "Create your Eden account" : "Welcome back to Eden"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {mode === "signup"
              ? "New accounts start in the consumer layer. Builder and owner access are granted server-side."
              : "Sign in to access your Eden workspace."}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setSubmitError(null); setSuccessNote(null); }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "border-eden-ring bg-eden-accent-soft text-white"
                  : "border-white/8 bg-white/[0.06] text-white/50 hover:border-eden-ring hover:text-white"
              }`}
            >
              {m === "signup" ? "Create Account" : "Sign In"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/94 p-6 shadow-[0_8px_32px_-12px_rgba(16,37,58,0.10)]"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm text-white/50">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="rounded-2xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/30"
              placeholder="your.username"
            />
          </label>

          {mode === "signup" ? (
            <label className="flex flex-col gap-2 text-sm text-white/50">
              <span>Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                className="rounded-2xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/30"
                placeholder="Your name in Eden"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-2 text-sm text-white/50">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="rounded-2xl border border-white/8 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/30"
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
          </label>

          {submitError ? (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {submitError}
            </div>
          ) : null}
          {successNote ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {successNote}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-2xl bg-eden-ink px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? mode === "signup" ? "Creating account..." : "Signing in..."
              : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-white/50">
          Builder and owner access are granted server-side after sign-in.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";

type EdenHomepageProps = {
  maintenanceMode: boolean;
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const audienceCards = [
  {
    id: "innovators",
    icon: "◈",
    label: "Innovators",
    tag: "Publish & earn",
    detail:
      "Package AI workflows as services, set visible pricing, publish to Eden discovery. Earn 70% of every run — automatically.",
  },
  {
    id: "consumers",
    icon: "◇",
    label: "Consumers",
    tag: "Discover & run",
    detail:
      "Browse or Ask Eden to find the right service. Top up Leaf's once, then run with no hidden charges — visible pricing before every use.",
  },
  {
    id: "contributors",
    icon: "◉",
    label: "Contributors",
    tag: "Improve & earn",
    detail:
      "Submit code, design, or ideas to Eden itself. Approved contributions earn Contribution Score and Leaf's from the pool each period.",
  },
];

const trustSignals = [
  { label: "Visible pricing before every run" },
  { label: "No hidden charges during service use" },
  { label: "4-bucket fee split, transparent on-chain" },
  { label: "Owner-authenticated platform control" },
];

// ── Intro Gate Component ───────────────────────────────────────────────────────
function EdenIntroGate({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"logo" | "opening" | "done">("logo");

  useEffect(() => {
    // Phase 1: show logo for 1.1s
    const t1 = setTimeout(() => setPhase("opening"), 1100);
    // Phase 2: gates open over 0.9s, then signal done
    const t2 = setTimeout(() => {
      setPhase("done");
      onDone();
    }, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== "done" ? (
        <motion.div
          key="gate-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0a1825]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Ambient teal glow behind logo */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#14989a]/12 blur-[80px]"
            animate={{
              scale: phase === "opening" ? 2.5 : 1,
              opacity: phase === "opening" ? 0 : 1,
            }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Left gate panel */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/2 bg-[#0a1825]"
            style={{
              borderRight: "1px solid rgba(20,152,154,0.15)",
            }}
            animate={{
              x: phase === "opening" ? "-100%" : "0%",
            }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          />

          {/* Right gate panel */}
          <motion.div
            className="absolute right-0 top-0 h-full w-1/2 bg-[#0a1825]"
            style={{
              borderLeft: "1px solid rgba(20,152,154,0.15)",
            }}
            animate={{
              x: phase === "opening" ? "100%" : "0%",
            }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          />

          {/* Dot grid overlay on gates */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(20,152,154,0.08) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Center logo — fades out as gates open */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            animate={{
              opacity: phase === "opening" ? 0 : 1,
              scale: phase === "opening" ? 0.85 : 1,
            }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            {/* Logo mark with pulse ring */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-[24px] border border-[#14989a]/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[rgba(20,152,154,0.4)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.22),rgba(10,24,37,0.98))] shadow-[0_0_40px_rgba(20,152,154,0.3)]">
                <EdenLogoMark size={38} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-center"
            >
              <p className="text-lg font-semibold tracking-tight text-white">Eden</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#14989a]/70">
                AI service economy
              </p>
            </motion.div>
          </motion.div>

          {/* Gate edge glow lines */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(20,152,154,0.5)_30%,rgba(20,152,154,0.5)_70%,transparent)]"
            animate={{ opacity: phase === "opening" ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Waitlist inline section ────────────────────────────────────────────────────
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/auth/join-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        alreadyRegistered?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        setMsg(body?.error ?? "Something went wrong.");
        setState("error");
      } else {
        setMsg(
          body?.alreadyRegistered
            ? "You're already on the waitlist — we'll reach out soon."
            : "You're on the waitlist! We'll send your invite code when a spot opens.",
        );
        setState("done");
      }
    } catch {
      setMsg("Something went wrong. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center"
          >
            <p className="text-sm font-semibold text-emerald-400">You're in!</p>
            <p className="mt-1 text-sm text-white/50">{msg}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={(e) => { void handleSubmit(e); }}
            className="space-y-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="flex-1 rounded-xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#14989a]/40 focus:ring-1 focus:ring-[#14989a]/20"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="flex-1 rounded-xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#14989a]/40 focus:ring-1 focus:ring-[#14989a]/20"
              />
            </div>
            {state === "error" ? (
              <p className="text-xs text-rose-400">{msg}</p>
            ) : null}
            <button
              type="submit"
              disabled={state === "loading"}
              className="w-full rounded-xl border border-[#14989a]/40 bg-[#14989a]/15 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/25 disabled:opacity-60"
            >
              {state === "loading" ? "Joining…" : "Request early access"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Parallax hero visual ───────────────────────────────────────────────────────
function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <motion.div ref={ref} style={{ y }} className="relative mx-auto mt-16 max-w-3xl">
      <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 border-b border-white/8 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#14989a] shadow-[0_0_6px_rgba(20,152,154,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Eden live network
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Innovators", count: "—", sublabel: "services published" },
            { label: "Consumers", count: "—", sublabel: "Leaf's in circulation" },
            { label: "Contributors", count: "—", sublabel: "contributions pending" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">{item.label}</p>
              <p className="mt-1.5 text-xl font-semibold text-white/80">{item.count}</p>
              <p className="mt-1 text-[10px] text-white/30">{item.sublabel}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-2xl border border-[#14989a]/20 bg-[#14989a]/6 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#14989a]/70">Fee split</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-full bg-white/8 h-1.5">
                <div className="h-full w-[70%] rounded-full bg-[#14989a]/70" />
              </div>
              <span className="text-xs font-semibold text-[#14989a]">70% to innovators</span>
            </div>
            <p className="mt-1.5 text-[10px] text-white/30">
              15% platform · 10% provider reserve · 5% contribution pool
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main homepage ──────────────────────────────────────────────────────────────
export function EdenHomepage({ maintenanceMode }: EdenHomepageProps) {
  const [introPlayed, setIntroPlayed] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Only play once per session
    const played = sessionStorage.getItem("eden_intro_played");
    if (played) {
      setIntroPlayed(true);
      setContentVisible(true);
    }
  }, []);

  function handleIntroDone() {
    sessionStorage.setItem("eden_intro_played", "1");
    setIntroPlayed(true);
    setTimeout(() => setContentVisible(true), 100);
  }

  return (
    <div className="min-h-screen bg-[#0d1f30] text-white">
      {/* Gate intro — only shown once per session */}
      {!introPlayed ? <EdenIntroGate onDone={handleIntroDone} /> : null}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {maintenanceMode ? (
          <div className="border-b border-amber-800/40 bg-amber-950/60 px-4 py-2.5 text-center text-sm text-amber-300">
            <span className="font-semibold">Platform maintenance.</span> Some actions may be limited.
          </div>
        ) : null}

        {/* ── Nav ── */}
        <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0d1f30]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-[rgba(20,152,154,0.3)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.15),rgba(10,24,37,0.95))]">
                <EdenLogoMark size={20} />
              </div>
              <span className="text-base font-semibold tracking-tight text-white">Eden</span>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-white/50 md:flex">
              <Link href="/consumer" className="transition-colors hover:text-white/80">Explore</Link>
              <Link href="#how-it-works" className="transition-colors hover:text-white/80">How it works</Link>
              <Link href="#economy" className="transition-colors hover:text-white/80">Economy</Link>
              <Link href="#waitlist" className="transition-colors hover:text-white/80">Early access</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/auth?auth=signin"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="#waitlist"
                className="rounded-full bg-[#14989a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/85"
              >
                Get early access
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-5 pb-24 pt-20 md:pb-32 md:pt-28">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#14989a]/10 blur-[100px]" />
            <div className="absolute -right-32 top-40 h-64 w-64 rounded-full bg-[#14989a]/6 blur-[80px]" />
          </div>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: "radial-gradient(circle, #14989a 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <span className="inline-block rounded-full border border-[#14989a]/30 bg-[#14989a]/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#14989a]">
                Eden Platform — Early Access
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              The AI service economy.
              <br />
              <span className="text-[#14989a]">Open to innovators.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55"
            >
              Eden connects innovators who publish AI services with consumers who discover
              and run them — all through a transparent Leaf&apos;s economy where contributors
              who improve Eden earn from it too.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.34 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="#waitlist"
                className="rounded-full bg-[#14989a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(20,152,154,0.35)] transition-all hover:bg-[#14989a]/90 hover:shadow-[0_0_48px_rgba(20,152,154,0.5)]"
              >
                Request early access
              </Link>
              <Link
                href="/consumer"
                className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Explore services →
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-3"
            >
              {trustSignals.map((signal) => (
                <span
                  key={signal.label}
                  className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/40"
                >
                  {signal.label}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={contentVisible ? "visible" : "hidden"}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          >
            <HeroVisual />
          </motion.div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="border-t border-white/8 px-5 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
                The Eden loop
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                One closed economy
              </h2>
              <p className="mt-4 text-base text-white/45">
                Innovators publish. Consumers discover and run. The economy distributes automatically.
                Contributors improve Eden and earn from it.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-4 md:grid-cols-4">
              {[
                {
                  step: "01",
                  label: "Innovators publish",
                  detail: "Services appear in discovery once visible pricing and publish state are set.",
                  accent: false,
                },
                {
                  step: "02",
                  label: "Consumers discover",
                  detail: "Ask Eden or browse the marketplace. Visible pricing, no hidden checkout.",
                  accent: false,
                },
                {
                  step: "03",
                  label: "Economy distributes",
                  detail: "Every run triggers an automatic 4-bucket split in Leaf's.",
                  accent: true,
                },
                {
                  step: "04",
                  label: "Contributors improve",
                  detail: "Submit improvements to Eden itself. Earn from the contribution pool each period.",
                  accent: false,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                  className={`rounded-[20px] border p-5 ${
                    item.accent
                      ? "border-[#14989a]/30 bg-[#14989a]/8"
                      : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <p className={`font-mono text-[11px] tracking-[0.2em] ${item.accent ? "text-[#14989a]" : "text-white/25"}`}>
                    {item.step}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/45">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it's for ── */}
        <section className="border-t border-white/8 px-5 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
                Who Eden is for
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Three ways to participate
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {audienceCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                  className="group rounded-[24px] border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-[#14989a]/30 hover:bg-[#14989a]/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl text-[#14989a]/60 transition-colors group-hover:text-[#14989a]">
                      {card.icon}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/40">
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{card.label}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/45">{card.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Economy section ── */}
        <section id="economy" className="border-t border-white/8 px-5 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
                  Eden Leaf&apos;s
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  A transparent currency for AI services
                </h2>
                <p className="mt-4 text-base leading-7 text-white/45">
                  Eden Leaf&apos;s are the platform&apos;s internal credit unit. Top up once, spend
                  on services with visible pricing, and earn them back through innovator
                  payouts or contribution rewards.
                </p>
                <Link
                  href="#waitlist"
                  className="mt-8 inline-block rounded-full bg-[#14989a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(20,152,154,0.3)] transition-all hover:bg-[#14989a]/90"
                >
                  Join Eden
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#14989a]">
                  Per service run
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Innovator earnings", pct: 70, color: "bg-[#14989a]" },
                    { label: "Platform fee", pct: 15, color: "bg-white/20" },
                    { label: "Provider reserve", pct: 10, color: "bg-white/14" },
                    { label: "Contribution pool", pct: 5, color: "bg-[#14989a]/40" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm text-white/60">{item.label}</span>
                        <span className="font-mono text-sm font-semibold text-white">{item.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Early access / Waitlist ── */}
        <section id="waitlist" className="border-t border-white/8 px-5 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[32px] border border-[#14989a]/25 bg-[linear-gradient(135deg,rgba(20,152,154,0.10),rgba(13,31,48,0.95))] px-8 py-14"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-[#14989a]/12 blur-[60px]" />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: "radial-gradient(circle, #14989a 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative">
                <div className="text-center">
                  <span className="inline-block rounded-full border border-[#14989a]/30 bg-[#14989a]/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
                    Early access
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Be among the first in Eden
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
                    Eden is launching with a small cohort of invited innovators, consumers, and
                    contributors. Join the waitlist and we&apos;ll send your invite code when a
                    spot opens.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
                      Invite-only signup
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
                      Already have a code?{" "}
                      <Link href="/auth" className="text-[#14989a]/70 hover:text-[#14989a]">
                        Sign up →
                      </Link>
                    </span>
                  </div>
                </div>

                <div className="mt-10">
                  <WaitlistForm />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/8 px-5 py-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg border border-[rgba(20,152,154,0.25)] bg-[radial-gradient(circle_at_35%_25%,rgba(20,152,154,0.12),rgba(10,24,37,0.95))]">
                <EdenLogoMark size={14} />
              </div>
              <span className="text-sm font-medium text-white/40">Eden</span>
            </div>
            <p className="text-xs text-white/25">
              AI service economy platform. Built for innovators, consumers, and contributors.
            </p>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

// v9 - force redeploy
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";
import { OrbitalDiagram } from "@/modules/core/components/orbital-diagram";
import { ParticleCanvas } from "@/modules/core/components/particle-canvas";

type EdenHomepageProps = {
  maintenanceMode: boolean;
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT = "#2dd4bf";
const ACCENT_RGB = "45, 212, 191";
const BG = "#0b1622";

// ── Static copy ────────────────────────────────────────────────────────────────
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
      "Browse or Ask Eden to find the right service. Top up Leafs once, then run with no hidden charges — visible pricing before every use.",
  },
  {
    id: "contributors",
    icon: "◉",
    label: "Contributors",
    tag: "Improve & earn",
    detail:
      "Submit code, design, or ideas to Eden itself. Approved contributions earn Contribution Score and Leafs from the pool each period.",
  },
];

const trustSignals = [
  { label: "Visible pricing before every run" },
  { label: "No hidden charges during service use" },
  { label: "4-bucket fee split, transparent on-chain" },
  { label: "Owner-authenticated platform control" },
];

const loopCards = [
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
    detail: "Every run triggers an automatic 4-bucket split in Leafs.",
    accent: true,
  },
  {
    step: "04",
    label: "Contributors improve",
    detail: "Submit improvements to Eden itself. Earn from the contribution pool each period.",
    accent: false,
  },
];

const feeSplit = [
  { label: "Innovator earnings", pct: 70, color: `rgba(${ACCENT_RGB}, 0.8)` },
  { label: "Platform fee", pct: 15, color: "rgba(255,255,255,0.22)" },
  { label: "Provider reserve", pct: 10, color: "rgba(255,255,255,0.14)" },
  { label: "Contribution pool", pct: 5, color: `rgba(${ACCENT_RGB}, 0.45)` },
];

// ── Shared animation variants ──────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ── Custom Cursor ──────────────────────────────────────────────────────────────
function CustomCursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const springX = useSpring(x, { stiffness: 120, damping: 18 });
  const springY = useSpring(y, { stiffness: 120, damping: 18 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setActive(true);
    document.documentElement.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.style.cursor = "";
    };
  }, [x, y]);

  if (!active) return null;

  return (
    <>
      {/* 8px dot — exact position */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[200] rounded-full"
        style={{
          width: 8,
          height: 8,
          background: ACCENT,
          x,
          y,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
      {/* 32px ring — spring lag */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[199] rounded-full"
        style={{
          width: 32,
          height: 32,
          border: `1.5px solid rgba(${ACCENT_RGB}, 0.45)`,
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
    </>
  );
}

// ── Grain Overlay ──────────────────────────────────────────────────────────────
function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2]"
      style={{ opacity: 0.038 }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="eden-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#eden-grain)" />
      </svg>
    </div>
  );
}

// ── Animated Fee Split Bar ──────────────────────────────────────────────────────
function FeeSplitBar({
  label,
  pct,
  bgColor,
  delay = 0,
}: {
  label: string;
  pct: number;
  bgColor: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm text-white/60">{label}</span>
        <span className="font-mono text-sm font-semibold text-white">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: bgColor }}
          initial={{ width: "0%" }}
          animate={{ width: inView ? `${pct}%` : "0%" }}
          transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

// ── Network Stats Panel ─────────────────────────────────────────────────────────
function NetworkStatsPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 55]);

  return (
    <motion.div ref={ref} style={{ y }} className="relative mx-auto mt-16 max-w-3xl">
      <div
        className="rounded-[28px] p-6 backdrop-blur-sm"
        style={{
          border: `1px solid rgba(255,255,255,0.07)`,
          background: "rgba(255,255,255,0.025)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: ACCENT,
                boxShadow: `0 0 6px rgba(${ACCENT_RGB}, 0.8)`,
              }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Eden live network
            </span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-full bg-white/10" />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Innovators", count: "—", sublabel: "services published" },
            { label: "Consumers", count: "—", sublabel: "Leafs in circulation" },
            { label: "Contributors", count: "—", sublabel: "contributions pending" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl p-4"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">{item.label}</p>
              <p className="mt-1.5 text-xl font-semibold text-white/80">{item.count}</p>
              <p className="mt-1 text-[10px] text-white/30">{item.sublabel}</p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div
            className="flex-1 rounded-2xl p-4"
            style={{
              border: `1px solid rgba(${ACCENT_RGB}, 0.18)`,
              background: `rgba(${ACCENT_RGB}, 0.05)`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.14em]"
              style={{ color: `rgba(${ACCENT_RGB}, 0.7)` }}
            >
              Fee split
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="flex-1 overflow-hidden rounded-full h-1.5"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "70%", background: `rgba(${ACCENT_RGB}, 0.7)` }}
                />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: ACCENT }}
              >
                70% to innovators
              </span>
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

// ── Intro Gate ──────────────────────────────────────────────────────────────────
function EdenIntroGate({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"logo" | "opening" | "done">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"), 1100);
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
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: BG }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Ambient glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
            style={{ background: `rgba(${ACCENT_RGB}, 0.1)` }}
            animate={{ scale: phase === "opening" ? 2.5 : 1, opacity: phase === "opening" ? 0 : 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Left gate */}
          <motion.div
            aria-hidden
            className="absolute left-0 top-0 h-full w-1/2"
            style={{ background: BG, borderRight: `1px solid rgba(${ACCENT_RGB}, 0.12)` }}
            animate={{ x: phase === "opening" ? "-100%" : "0%" }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          />

          {/* Right gate */}
          <motion.div
            aria-hidden
            className="absolute right-0 top-0 h-full w-1/2"
            style={{ background: BG, borderLeft: `1px solid rgba(${ACCENT_RGB}, 0.12)` }}
            animate={{ x: phase === "opening" ? "100%" : "0%" }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          />

          {/* Dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(${ACCENT_RGB}, 0.06) 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          />

          {/* Center logo */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            animate={{ opacity: phase === "opening" ? 0 : 1, scale: phase === "opening" ? 0.85 : 1 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <div className="relative">
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-[24px]"
                style={{ border: `1px solid rgba(${ACCENT_RGB}, 0.2)` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[20px]"
                style={{
                  border: `1px solid rgba(${ACCENT_RGB}, 0.4)`,
                  background: `radial-gradient(circle at 35% 25%, rgba(${ACCENT_RGB}, 0.2), rgba(11,22,34,0.98))`,
                  boxShadow: `0 0 40px rgba(${ACCENT_RGB}, 0.22)`,
                }}
              >
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
              <p
                className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em]"
                style={{ color: `rgba(${ACCENT_RGB}, 0.65)` }}
              >
                AI service economy
              </p>
            </motion.div>
          </motion.div>

          {/* Center seam line */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
            style={{
              background: `linear-gradient(to bottom, transparent, rgba(${ACCENT_RGB}, 0.4) 30%, rgba(${ACCENT_RGB}, 0.4) 70%, transparent)`,
            }}
            animate={{ opacity: phase === "opening" ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Waitlist Form ───────────────────────────────────────────────────────────────
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
            <p className="text-sm font-semibold text-emerald-400">You&apos;re in!</p>
            <p className="mt-1 text-sm text-white/50">{msg}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="flex-1 rounded-xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#2dd4bf]/40 focus:ring-1 focus:ring-[#2dd4bf]/20"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="flex-1 rounded-xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#2dd4bf]/40 focus:ring-1 focus:ring-[#2dd4bf]/20"
              />
            </div>
            {state === "error" ? <p className="text-xs text-rose-400">{msg}</p> : null}
            <button
              type="submit"
              disabled={state === "loading"}
              className="w-full rounded-xl border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20 disabled:opacity-60"
            >
              {state === "loading" ? "Joining\u2026" : "Get started"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Homepage ────────────────────────────────────────────────────────────────
export function EdenHomepage({ maintenanceMode }: EdenHomepageProps) {
  const [introPlayed, setIntroPlayed] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  // Hero headline parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroHeadlineY = useTransform(heroScroll, [0, 1], [0, -38]);

  useEffect(() => {
    const played = sessionStorage.getItem("eden_intro_played");
    if (played) {
      setIntroPlayed(true);
      setContentVisible(true);
    }
  }, []);

  const handleIntroDone = useCallback(() => {
    sessionStorage.setItem("eden_intro_played", "1");
    setIntroPlayed(true);
    setTimeout(() => setContentVisible(true), 100);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: BG, color: "#e8f1f8" }}
    >
      {/* Fixed background layers */}
      <ParticleCanvas />
      <GrainOverlay />

      {/* Custom cursor */}
      <CustomCursor />

      {/* Intro gate — once per session */}
      {!introPlayed ? <EdenIntroGate onDone={handleIntroDone} /> : null}

      {/* Page content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-[10]"
      >
        {maintenanceMode ? (
          <div className="border-b border-amber-800/40 bg-amber-950/60 px-4 py-2.5 text-center text-sm text-amber-300">
            <span className="font-semibold">Platform maintenance.</span> Some actions may be limited.
          </div>
        ) : null}

        {/* ── Nav ── */}
        <header
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: `rgba(11,22,34,0.88)`,
          }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
                style={{
                  border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
                  background: `radial-gradient(circle at 35% 25%, rgba(${ACCENT_RGB}, 0.14), rgba(11,18,30,0.95))`,
                }}
              >
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
                className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section ref={heroRef} className="relative overflow-hidden px-5 py-20 md:py-28" style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,212,191,0.15), transparent), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(11,22,34,0.8), transparent), #0b1622`,
        }}>
          {/* Glow blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-[120px]"
              style={{ background: `rgba(${ACCENT_RGB}, 0.065)` }}
            />
            <div
              className="absolute -right-32 top-40 h-64 w-64 rounded-full blur-[80px]"
              style={{ background: `rgba(${ACCENT_RGB}, 0.045)` }}
            />
          </div>

          {/* Dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.028]"
            style={{
              backgroundImage: `radial-gradient(circle, ${ACCENT} 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            {/* Glow behind headline */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2"
              style={{ width: 600, height: 300, background: `radial-gradient(ellipse, rgba(${ACCENT_RGB}, 0.08) 0%, transparent 70%)`, filter: "blur(40px)", zIndex: 0 }}
            />

            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="relative z-[1]"
            >
              <span
                className="inline-block rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em]"
                style={{
                  border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
                  background: `rgba(${ACCENT_RGB}, 0.08)`,
                  color: ACCENT,
                }}
              >
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", marginRight: 6 }}></span>EDEN — LIVE
              </span>
            </motion.div>

            {/* H1 with floating parallax */}
            <motion.div style={{ y: heroHeadlineY }} className="relative z-[1]">
              <motion.h1
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="mt-6 font-serif text-5xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-8xl"
              >
                Build the future.
                <br />
                <span className="italic" style={{ color: ACCENT }}>Get paid for it.</span>
              </motion.h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="relative z-[1] mx-auto mt-6 max-w-2xl text-xl leading-8 text-white/70"
            >
              AI agents do the work. You collect the Leafs.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              className="relative z-[1] mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="#waitlist"
                className="eden-portal-btn rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: ACCENT,
                  boxShadow: `0 0 32px rgba(${ACCENT_RGB}, 0.28)`,
                }}
              >
                Enter Eden &rarr;
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                See how it works
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-3"
            >
              {trustSignals.map((signal) => (
                <span
                  key={signal.label}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40"
                >
                  {signal.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Network stats panel */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
          >
            <NetworkStatsPanel />
          </motion.div>
        </section>

        {/* ── How it works (Eden Loop) ── */}
        <section
          id="how-it-works"
          className="border-t px-5 py-20 md:py-28"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{ color: ACCENT }}
              >
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
              {loopCards.map((item, i) => (
                <motion.div
                  key={item.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                  className="rounded-[20px] p-5"
                  style={{
                    border: `1px solid ${item.accent ? `rgba(${ACCENT_RGB}, 0.28)` : "rgba(255,255,255,0.06)"}`,
                    background: item.accent ? `rgba(${ACCENT_RGB}, 0.065)` : "rgba(255,255,255,0.022)",
                  }}
                >
                  <p
                    className="font-mono text-[11px] tracking-[0.2em]"
                    style={{ color: item.accent ? ACCENT : "rgba(255,255,255,0.2)" }}
                  >
                    {item.step}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/45">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it's for (Role cards with spring) ── */}
        <section
          className="border-t px-5 py-20 md:py-28"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{ color: ACCENT }}
              >
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
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: i * 0.1,
                  }}
                  className="group rounded-[24px] p-6 transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-2xl"
                      style={{ color: `rgba(${ACCENT_RGB}, 0.6)` }}
                    >
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

        {/* ── Economy (Orbital diagram + fee split) ── */}
        <section
          id="economy"
          className="border-t px-5 py-20 md:py-28"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto max-w-5xl">
            {/* Orbital diagram */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-12 flex justify-center overflow-visible"
            >
              <OrbitalDiagram />
            </motion.div>

            {/* Leafs copy + fee split bars */}
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: ACCENT }}
                >
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
                  className="mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    background: ACCENT,
                    boxShadow: `0 0 24px rgba(${ACCENT_RGB}, 0.22)`,
                  }}
                >
                  Join Eden
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                className="rounded-[24px] p-6"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Per service run
                </p>
                <div className="mt-5 space-y-4">
                  {feeSplit.map((item, i) => (
                    <FeeSplitBar
                      key={item.label}
                      label={item.label}
                      pct={item.pct}
                      bgColor={item.color}
                      delay={i * 0.1}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Sign Up CTA ── */}
        <section
          id="waitlist"
          className="border-t px-5 py-20 md:py-28"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[32px] px-8 py-14"
              style={{
                border: `1px solid rgba(${ACCENT_RGB}, 0.18)`,
                background: `linear-gradient(135deg, rgba(${ACCENT_RGB}, 0.07), rgba(11,22,34,0.96))`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[32px]"
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full blur-[60px]"
                style={{ background: `rgba(${ACCENT_RGB}, 0.09)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.022]"
                style={{
                  backgroundImage: `radial-gradient(circle, ${ACCENT} 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative">
                <div className="text-center">
                  <span
                    className="inline-block rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em]"
                    style={{
                      border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
                      background: `rgba(${ACCENT_RGB}, 0.08)`,
                      color: ACCENT,
                    }}
                  >
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
                      <Link
                        href="/auth"
                        style={{ color: `rgba(${ACCENT_RGB}, 0.7)` }}
                        className="hover:underline"
                      >
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

        {/* ── Download Section ── */}
        <section
          className="border-t px-5 py-20 md:py-28"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[32px] px-8 py-14"
              style={{
                border: `1px solid rgba(${ACCENT_RGB}, 0.15)`,
                background: "rgba(13,30,46,0.82)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full blur-[50px]"
                style={{ background: `rgba(${ACCENT_RGB}, 0.08)` }}
              />

              <div className="relative text-center">
                <span
                  className="inline-block rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em]"
                  style={{
                    border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
                    background: `rgba(${ACCENT_RGB}, 0.08)`,
                    color: ACCENT,
                  }}
                >
                  Desktop App
                </span>
                <h2
                  className="mt-5 text-3xl tracking-tight text-white md:text-4xl"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Download Eden
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
                  Run Eden as a native desktop app. No browser required.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/api/download/windows"
                    className="group flex items-center gap-3 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all"
                    style={{
                      background: `linear-gradient(135deg, rgba(${ACCENT_RGB}, 0.85), rgba(${ACCENT_RGB}, 0.6))`,
                      border: `1px solid rgba(${ACCENT_RGB}, 0.4)`,
                      boxShadow: `0 4px 20px -4px rgba(${ACCENT_RGB}, 0.3)`,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 5.5L10.5 4.4V11.4H3V5.5Z" fill="currentColor" />
                      <path d="M11.5 4.2L21 3V11.4H11.5V4.2Z" fill="currentColor" />
                      <path d="M3 12.6H10.5V19.6L3 18.5V12.6Z" fill="currentColor" />
                      <path d="M11.5 12.6H21V21L11.5 19.8V12.6Z" fill="currentColor" />
                    </svg>
                    Download for Windows
                  </Link>
                  <Link
                    href="/api/download/mac"
                    className="flex items-center gap-3 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(${ACCENT_RGB}, 0.25)`,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M18.7 12.6c0-2.7 2.2-4 2.3-4.1-1.3-1.9-3.2-2.1-3.9-2.2-1.7-.2-3.2 1-4.1 1s-2.1-1-3.5-1c-1.8 0-3.4 1-4.3 2.6-1.9 3.2-.5 8 1.3 10.7.9 1.3 2 2.8 3.4 2.7 1.4-.1 1.9-.9 3.5-.9s2.1.9 3.5.8c1.5 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1-2.8-4z"
                        fill="currentColor"
                      />
                      <path
                        d="M16.1 4.8c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.2.1 2.3-.6 3-1.5z"
                        fill="currentColor"
                      />
                    </svg>
                    Download for Mac
                  </Link>
                </div>

                <p className="mt-6 text-xs text-white/30">
                  Open source · MIT license ·{" "}
                  <a
                    href="https://github.com/SJPanis/eden"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white/50"
                    style={{ color: `rgba(${ACCENT_RGB}, 0.5)` }}
                  >
                    github.com/SJPanis/eden
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="border-t px-5 py-8"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg"
                style={{
                  border: `1px solid rgba(${ACCENT_RGB}, 0.22)`,
                  background: `radial-gradient(circle at 35% 25%, rgba(${ACCENT_RGB}, 0.1), rgba(11,18,30,0.95))`,
                }}
              >
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

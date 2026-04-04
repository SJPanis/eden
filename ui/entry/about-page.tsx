"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";
import { ParticleCanvas } from "@/modules/core/components/particle-canvas";

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT = "#2dd4bf";
const ACCENT_RGB = "45, 212, 191";

// ── Animation ──────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const sectionTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

// ── Grain overlay (same SVG noise as homepage) ─────────────────────────────────
function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2]"
      style={{ opacity: 0.038 }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="about-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#about-grain)" />
      </svg>
    </div>
  );
}

// ── Economy cards ──────────────────────────────────────────────────────────────
const economyCards = [
  {
    step: "01",
    label: "Innovators publish",
    detail:
      "Package AI workflows as services with visible pricing. Earn 70\u0025 of every run.",
  },
  {
    step: "02",
    label: "Consumers discover",
    detail:
      "Browse the marketplace, pay with Leafs. No hidden fees, no surprises.",
  },
  {
    step: "03",
    label: "Economy distributes",
    detail: "Every run triggers the 4-bucket split automatically.",
  },
  {
    step: "04",
    label: "Contributors improve",
    detail:
      "Submit improvements, earn from the contribution pool each period.",
  },
];

// ── Glance rows ────────────────────────────────────────────────────────────────
const glanceRows = [
  { label: "Founded", value: "2025" },
  { label: "Founder", value: "Sonny Panis" },
  { label: "Entity", value: "EdenOS LLC, Kansas" },
  { label: "Stack", value: "Next.js, React, Prisma, Stripe" },
  { label: "Currency", value: "Leafs (fiat-backed)" },
  { label: "License", value: "MIT (open source)" },
  { label: "Status", value: "Live" },
];

// ── Main component ─────────────────────────────────────────────────────────────
export function AboutPage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ color: "#e8f1f8" }}
    >
      {/* Fixed background layers */}
      <ParticleCanvas />
      <GrainOverlay />

      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(11,22,34,0.88)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
              style={{
                border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
                background: `radial-gradient(circle at 35% 25%, rgba(${ACCENT_RGB}, 0.14), rgba(11,18,30,0.95))`,
              }}
            >
              <EdenLogoMark size={20} />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Eden
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/50 md:flex">
            <Link
              href="/"
              className="transition-colors hover:text-white/80"
            >
              Home
            </Link>
            <span
              className="text-white"
              style={{ borderBottom: `2px solid ${ACCENT}`, paddingBottom: 2 }}
            >
              About
            </span>
            <Link
              href="/#how-it-works"
              className="transition-colors hover:text-white/80"
            >
              How it works
            </Link>
            <Link
              href="/#waitlist"
              className="transition-colors hover:text-white/80"
            >
              Early access
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth?auth=signin"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/auth?auth=signup"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden px-5 py-20 md:py-28"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(${ACCENT_RGB},0.15), transparent)`,
        }}
      >
        {/* Ambient glow blob */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: `rgba(${ACCENT_RGB}, 0.065)` }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Glow behind headline */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 600,
              height: 300,
              background: `radial-gradient(ellipse, rgba(${ACCENT_RGB}, 0.08) 0%, transparent 70%)`,
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />

          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ ...sectionTransition, delay: 0.1 }}
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
              About Eden
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ ...sectionTransition, delay: 0.2 }}
            className="relative z-[1] mt-6 font-serif text-5xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl"
          >
            One person. One vision.
            <br />
            One platform.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ ...sectionTransition, delay: 0.3 }}
            className="relative z-[1] mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55"
          >
            Eden is built by Sonny Panis — an 18-year-old founder who taught AI
            agents to build an entire economy.
          </motion.p>
        </div>
      </section>

      {/* ── Story ── */}
      <section
        className="border-t px-5 py-20 md:py-28"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
          {/* Left — narrative */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={sectionTransition}
          >
            <span
              className="inline-block font-mono text-[11px] uppercase tracking-[0.2em]"
              style={{ color: ACCENT }}
            >
              The story
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white md:text-4xl">
              How Eden came to be
            </h2>
            <div className="mt-8 space-y-5 text-base leading-7 text-white/55">
              <p>
                Eden started as a question: what happens when you stop writing
                code and start directing AI to build for you? Not as an
                experiment — as a real platform, with real money, real services,
                and a real economy.
              </p>
              <p>
                I&apos;m Sonny Panis, 18 years old, sole founder and owner of
                EdenOS LLC. I built Eden after school, directing AI agents
                instead of writing code line by line. Every service, every
                feature, every pixel on this platform was designed by a human and
                executed by AI.
              </p>
              <p>
                Eden is a closed AI service economy. Innovators publish
                AI-powered services. Consumers discover and run them using Leafs
                — Eden&apos;s internal currency backed by real money through
                Stripe. Contributors improve the platform and earn from it.
                Every transaction splits automatically: 70% to the creator, 15%
                platform, 10% reserve, 5% contribution pool.
              </p>
              <p>
                This isn&apos;t a demo. Eden is live at edencloud.app with real
                services, real transactions, and an autonomous agent loop that
                proposes new services every five minutes. The future of software
                isn&apos;t written — it&apos;s directed.
              </p>
            </div>
          </motion.div>

          {/* Right — glance card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ ...sectionTransition, delay: 0.15 }}
            className="flex items-start"
          >
            <div
              className="w-full rounded-[24px] p-6"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <h3 className="text-sm font-semibold text-white">
                Eden at a glance
              </h3>
              <div className="mt-5 space-y-3">
                {glanceRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-white/40">{row.label}</span>
                    <span className="text-sm text-white">{row.value}</span>
                  </div>
                ))}
              </div>
              <a
                href="https://github.com/SJPanis/eden"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block text-xs transition-opacity hover:opacity-80"
                style={{ color: ACCENT }}
              >
                github.com/SJPanis/eden
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Economy ── */}
      <section
        className="border-t px-5 py-20 md:py-28"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={sectionTransition}
            className="text-center"
          >
            <span
              className="inline-block font-mono text-[11px] uppercase tracking-[0.2em]"
              style={{ color: ACCENT }}
            >
              The Leaf economy
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white md:text-4xl">
              How value flows through Eden
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {economyCards.map((card) => (
              <motion.div
                key={card.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={sectionTransition}
                className="rounded-[20px] p-5"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <span
                  className="font-mono text-xs"
                  style={{ color: ACCENT }}
                >
                  {card.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-white">
                  {card.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {card.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="border-t px-5 py-20 md:py-28"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={sectionTransition}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            See it for yourself
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/consumer"
              className="rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: ACCENT,
                boxShadow: `0 0 32px rgba(${ACCENT_RGB}, 0.28)`,
              }}
            >
              Enter Eden
            </Link>
            <a
              href="https://github.com/SJPanis/eden"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              View source
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 text-center text-xs text-white/20">
        Eden — Built by Sonny Panis
      </footer>
    </div>
  );
}

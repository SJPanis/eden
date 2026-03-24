"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type EdenHomepageProps = {
  maintenanceMode: boolean;
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const audienceCards = [
  {
    id: "builders",
    icon: "◈",
    label: "Builders",
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

export function EdenHomepage({ maintenanceMode }: EdenHomepageProps) {
  return (
    <div className="min-h-screen bg-[#0d1f30] text-white">

      {/* Maintenance banner */}
      {maintenanceMode ? (
        <div className="border-b border-amber-800/40 bg-amber-950/60 px-4 py-2.5 text-center text-sm text-amber-300">
          <span className="font-semibold">Platform maintenance.</span> Some actions may be limited.
        </div>
      ) : null}

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0d1f30]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-emerald-950/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(20,83,45,0.96))] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/eden-logo.png" alt="Eden" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">Eden</span>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 text-sm text-white/50 md:flex">
            <Link href="/consumer" className="transition-colors hover:text-white/80">Explore</Link>
            <Link href="#how-it-works" className="transition-colors hover:text-white/80">How it works</Link>
            <Link href="#economy" className="transition-colors hover:text-white/80">Economy</Link>
          </nav>

          {/* CTA pair */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth?auth=signin"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-[#14989a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/85"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-5 pb-24 pt-20 md:pb-32 md:pt-28">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#14989a]/10 blur-[100px]" />
          <div className="absolute -right-32 top-40 h-64 w-64 rounded-full bg-[#14989a]/6 blur-[80px]" />
        </div>

        {/* Dot grid */}
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
            animate="visible"
          >
            <span className="inline-block rounded-full border border-[#14989a]/30 bg-[#14989a]/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#14989a]">
              Eden Platform — Open Beta
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.08 }}
            className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl"
          >
            The AI service economy.
            <br />
            <span className="text-[#14989a]">Open to builders.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55"
          >
            Eden connects builders who publish AI services with consumers who discover
            and run them — all through a transparent Leaf's economy where contributors
            who improve Eden earn from it too.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.24 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/auth"
              className="rounded-full bg-[#14989a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(20,152,154,0.35)] transition-all hover:bg-[#14989a]/90 hover:shadow-[0_0_48px_rgba(20,152,154,0.5)]"
            >
              Start building free
            </Link>
            <Link
              href="/consumer"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              Explore services →
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.32 }}
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

        {/* Visual: floating node graph */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-3xl"
        >
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
                { label: "Builders", count: "—", sublabel: "services published" },
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
                  <span className="text-xs font-semibold text-[#14989a]">70% to builders</span>
                </div>
                <p className="mt-1.5 text-[10px] text-white/30">
                  15% platform · 10% provider reserve · 5% contribution pool
                </p>
              </div>
            </div>
          </div>
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
            className="text-center"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
              The Eden loop
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              One closed economy
            </h2>
            <p className="mt-4 text-base text-white/45">
              Builders publish. Consumers discover and run. The economy distributes automatically.
              Contributors improve Eden and earn from it.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {[
              {
                step: "01",
                label: "Builders publish",
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
                transition={{ duration: 0.5, ease: [0.22,1,0.36,1], delay: i * 0.08 }}
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
                transition={{ duration: 0.5, ease: [0.22,1,0.36,1], delay: i * 0.1 }}
                className="group rounded-[24px] border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-[#14989a]/30 hover:bg-[#14989a]/5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl text-[#14989a]/60 group-hover:text-[#14989a] transition-colors">
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
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
                Eden Leaf's
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                A transparent currency for AI services
              </h2>
              <p className="mt-4 text-base leading-7 text-white/45">
                Eden Leaf's are the platform's internal credit unit. Top up once, spend
                on services with visible pricing, and earn them back through builder
                payouts or contribution rewards.
              </p>
              <Link
                href="/auth"
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
              transition={{ duration: 0.55, ease: [0.22,1,0.36,1], delay: 0.12 }}
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#14989a]">
                Per service run
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Builder earnings", pct: 70, color: "bg-[#14989a]" },
                  { label: "Platform fee", pct: 15, color: "bg-white/20" },
                  { label: "Provider reserve", pct: 10, color: "bg-white/14" },
                  { label: "Contribution pool", pct: 5, color: "bg-[#14989a]/40" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm text-white/60">{item.label}</span>
                      <span className="font-mono text-sm font-semibold text-white">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-white/8 px-5 py-20 md:py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-[#14989a]/25 bg-[linear-gradient(135deg,rgba(20,152,154,0.10),rgba(13,31,48,0.95))] px-8 py-14 text-center"
        >
          <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-[#14989a]/12 blur-[60px]" />
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#14989a]">
              Get started today
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Build, discover, and contribute.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/45">
              Join Eden and become part of the AI service economy — whether you're
              publishing your first service, running others, or improving the platform itself.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/auth"
                className="rounded-full bg-[#14989a] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(20,152,154,0.4)] transition-all hover:bg-[#14989a]/90 hover:shadow-[0_0_48px_rgba(20,152,154,0.55)]"
              >
                Create free account
              </Link>
              <Link
                href="/consumer"
                className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
              >
                Explore first
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 px-5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg border border-emerald-950/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(20,83,45,0.96))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/eden-logo.png" alt="Eden" className="h-4 w-4 object-contain" />
            </div>
            <span className="text-sm font-medium text-white/40">Eden</span>
          </div>
          <p className="text-xs text-white/25">
            AI service economy platform. Built for builders, consumers, and contributors.
          </p>
        </div>
      </footer>

    </div>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

type DetailAction = {
  label: string;
  href: string;
  tone?: "primary" | "secondary";
};

type DetailMetadata = {
  label: string;
  value: string;
};

type DetailStatusTone = "default" | "success" | "warning" | "info" | "danger";

type DetailPlaceholderPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  statusTone?: DetailStatusTone;
  tags: string[];
  summary: string;
  metadata: DetailMetadata[];
  actions: DetailAction[];
  backHref: string;
  backLabel: string;
  note?: string;
  children?: ReactNode;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function getStatusClasses(statusTone: DetailStatusTone) {
  if (statusTone === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (statusTone === "warning") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (statusTone === "info") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (statusTone === "danger") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

export function DetailPlaceholderPanel({
  eyebrow,
  title,
  description,
  status,
  statusTone = "default",
  tags,
  summary,
  metadata,
  actions,
  backHref,
  backLabel,
  note,
  children,
}: DetailPlaceholderPanelProps) {
  return (
    <div className="space-y-5">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.74),rgba(255,255,255,0.96)_52%,rgba(255,237,213,0.78))] p-5 md:p-6"
      >
        <Link
          href={backHref}
          className="inline-flex rounded-full border border-white/8 bg-white/80 px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-eden-ring hover:text-white"
        >
          {backLabel}
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50 md:text-base">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusClasses(
              statusTone,
            )}`}
          >
            {status}
          </span>
          {tags.map((tag) => (
            <span
              key={`${title}-${tag}`}
              className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.04 }}
          className="rounded-[28px] border border-white/8 bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Summary
          </p>
          <p className="mt-3 text-sm leading-7 text-white/50 md:text-base">{summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${title}-${action.label}`}
                href={action.href}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  action.tone === "secondary"
                    ? "border border-white/8 bg-white/[0.06] text-white/50 hover:border-eden-ring hover:text-white"
                    : "border border-eden-ring bg-eden-accent-soft text-white hover:bg-eden-accent-soft/70"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
          {note ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
              {note}
            </div>
          ) : null}
        </motion.section>

        <motion.aside
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
          className="rounded-[28px] border border-white/8 bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Related Actions
          </p>
          <div className="mt-4 grid gap-3">
            {metadata.map((item) => (
              <div
                key={`${title}-${item.label}`}
                className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.aside>
      </div>

      {children ? (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
          className="rounded-[28px] border border-white/8 bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          {children}
        </motion.section>
      ) : null}
    </div>
  );
}

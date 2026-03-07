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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statusTone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statusTone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (statusTone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
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
        className="overflow-hidden rounded-[30px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.74),rgba(255,255,255,0.96)_52%,rgba(255,237,213,0.78))] p-5 md:p-6"
      >
        <Link
          href={backHref}
          className="inline-flex rounded-full border border-eden-edge bg-white/80 px-3 py-2 text-xs font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
        >
          {backLabel}
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-eden-muted md:text-base">
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
              className="rounded-full border border-eden-edge bg-white/82 px-3 py-1 text-xs text-eden-muted"
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
          className="rounded-[28px] border border-eden-edge bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Summary
          </p>
          <p className="mt-3 text-sm leading-7 text-eden-muted md:text-base">{summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${title}-${action.label}`}
                href={action.href}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  action.tone === "secondary"
                    ? "border border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                    : "border border-eden-ring bg-eden-accent-soft text-eden-ink hover:bg-eden-accent-soft/70"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
          {note ? (
            <div className="mt-5 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
              {note}
            </div>
          ) : null}
        </motion.section>

        <motion.aside
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
          className="rounded-[28px] border border-eden-edge bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Related Actions
          </p>
          <div className="mt-4 grid gap-3">
            {metadata.map((item) => (
              <div
                key={`${title}-${item.label}`}
                className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
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
          className="rounded-[28px] border border-eden-edge bg-white/84 p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5"
        >
          {children}
        </motion.section>
      ) : null}
    </div>
  );
}

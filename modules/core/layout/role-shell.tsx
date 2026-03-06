"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { roleMeta, topNavItems, type EdenRole } from "@/modules/core/config/role-nav";

type RoleShellProps = {
  role: EdenRole;
  children: ReactNode;
};

export function RoleShell({ role, children }: RoleShellProps) {
  const pathname = usePathname();
  const roleDetails = roleMeta[role];

  return (
    <div className="eden-grid min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="eden-shell flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-eden-edge bg-white text-sm font-semibold text-eden-ink">
              E
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-eden-muted">Eden v1</p>
              <p className="text-sm font-medium text-eden-ink">AI-First Platform Shell</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {topNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                      : "border-eden-edge bg-white/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-eden-muted">
                {roleDetails.label} Layer
              </p>
              <p className="text-sm text-eden-ink">Profile</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-eden-edge bg-white text-sm font-semibold text-eden-ink">
              PB
            </div>
          </div>
        </header>

        <section className="eden-shell p-5 md:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-muted">
            {roleDetails.label}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink md:text-3xl">
            {roleDetails.heading}
          </h1>
          <p className="mt-2 text-sm text-eden-muted md:text-base">{roleDetails.subheading}</p>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="eden-shell p-5 md:p-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

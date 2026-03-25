"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

type AccessCode = {
  id: string;
  code: string;
  label: string | null;
  maxUses: number;
  useCount: number;
  isActive: boolean;
  createdAt: string;
};

const BETA_WELCOME_LEAVES = 100;

export function OwnerAccessCodesPanel() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create form
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadCodes() {
    setLoading(true);
    const res = await fetch("/api/owner/access-codes");
    const data = (await res.json().catch(() => null)) as { ok: boolean; codes?: AccessCode[] } | null;
    if (data?.ok && data.codes) {
      setCodes(data.codes);
    } else {
      setError("Could not load access codes.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadCodes();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setNewCode(null);
    startTransition(async () => {
      const res = await fetch("/api/owner/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || undefined, maxUses }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; code?: AccessCode; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setCreateError(data?.error ?? "Failed to create code.");
        return;
      }
      if (data.code) {
        setNewCode(data.code.code);
        setCodes((prev) => [data.code!, ...prev]);
        setLabel("");
        setMaxUses(1);
      }
    });
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/owner/access-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    const data = (await res.json().catch(() => null)) as { ok: boolean; code?: AccessCode } | null;
    if (data?.ok && data.code) {
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c)));
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Create new code */}
      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-5">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#2dd4bf]">Generate Code</p>
        <form onSubmit={(e) => { void handleCreate(e); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-white/40">Label (optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Teacher batch, Friend invite"
                className="mt-1 w-full rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-white/40">Max Uses</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/20"
              />
            </div>
          </div>

          {/* Welcome gift note */}
          <div className="flex items-center gap-2 rounded-xl border border-[#2dd4bf]/20 bg-[#2dd4bf]/[0.06] px-4 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#2dd4bf]">
              <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            <p className="text-xs text-[#2dd4bf]/80">
              Each code grants <span className="font-semibold">{BETA_WELCOME_LEAVES} free Leaf&apos;s</span> to the user on sign-up.
            </p>
          </div>

          <AnimatePresence>
            {createError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
                  {createError}
                </div>
              </motion.div>
            )}
            {newCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 rounded-xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-4 py-3">
                  <span className="flex-1 font-mono text-sm font-semibold tracking-widest text-[#2dd4bf]">
                    {newCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(newCode)}
                    className="rounded-lg border border-[#2dd4bf]/30 bg-[#2dd4bf]/15 px-3 py-1.5 text-xs text-[#2dd4bf] transition hover:bg-[#2dd4bf]/25"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2dd4bf]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Generate Invite Code"}
          </button>
        </form>
      </div>

      {/* Code list */}
      <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-5">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#2dd4bf]">
          All Codes <span className="text-white/30">({codes.length})</span>
        </p>

        {loading ? (
          <p className="text-sm text-white/30">Loading…</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-white/30">No codes yet. Generate one above.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((code) => {
              const usagePercent = Math.min(100, Math.round((code.useCount / code.maxUses) * 100));
              const exhausted = code.useCount >= code.maxUses;

              return (
                <div
                  key={code.id}
                  className={`rounded-xl border px-4 py-3 transition ${
                    code.isActive && !exhausted
                      ? "border-white/8 bg-white/[0.03]"
                      : "border-white/[0.04] bg-white/[0.02] opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Code */}
                    <span className="flex-1 font-mono text-sm font-semibold tracking-widest text-white">
                      {code.code}
                    </span>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {exhausted ? (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-400">
                          Exhausted
                        </span>
                      ) : code.isActive ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/30">
                          Disabled
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-white/40">
                        {code.useCount}/{code.maxUses}
                      </span>

                      {!exhausted && (
                        <button
                          type="button"
                          onClick={() => void toggleActive(code.id, code.isActive)}
                          className="rounded-lg border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40 transition hover:text-white/70"
                        >
                          {code.isActive ? "Disable" : "Enable"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => copyCode(code.code)}
                        className="rounded-lg border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40 transition hover:text-white/70"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        exhausted ? "bg-rose-500/50" : "bg-[#2dd4bf]/50"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  {code.label && (
                    <p className="mt-1.5 text-[11px] text-white/30">{code.label}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

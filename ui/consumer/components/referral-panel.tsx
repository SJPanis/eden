"use client";

import { useEffect, useState } from "react";

type Referral = {
  id: string;
  name: string | null;
  username: string;
  totalEarned: number;
};

type ReferralStats = {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalEarned: number;
  referrals: Referral[];
};

export function ReferralPanel() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/stats")
      .then((r) => r.json())
      .then((d: { ok?: boolean } & Partial<ReferralStats>) => {
        if (d.ok) setStats(d as ReferralStats);
      })
      .catch(() => {});
  }, []);

  async function handleCopy() {
    if (!stats) return;
    await navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div>
        <p className="text-xs font-mono uppercase text-white/30" style={{ letterSpacing: "0.3em" }}>
          Refer &amp; Earn
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>
          Grow Eden. Earn forever.
        </h2>
        <p className="mt-2 text-sm text-white/40">
          Share your link. When someone signs up, they get 500 free Leafs
          and you earn 1% of every Leaf they spend — forever.
        </p>
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl p-5" style={{
        background: "rgba(45,212,191,0.05)",
        border: "1px solid rgba(45,212,191,0.15)",
      }}>
        <p className="text-xs font-mono uppercase tracking-wider text-white/30 mb-2">
          Your referral link
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl px-4 py-3 text-sm text-white/70 truncate"
            style={{ background: "rgba(13,30,46,0.8)", border: "1px solid rgba(45,212,191,0.1)" }}>
            {stats.referralLink}
          </div>
          <button
            onClick={() => { void handleCopy(); }}
            className="shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf",
                     border: "1px solid rgba(45,212,191,0.25)" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p className="text-3xl font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.totalReferred}
          </p>
          <p className="text-xs text-white/30 mt-1">People referred</p>
        </div>
        <div className="rounded-2xl p-4" style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p className="text-3xl font-bold text-white"
            style={{ fontVariantNumeric: "tabular-nums", textShadow: "0 0 12px rgba(45,212,191,0.3)" }}>
            {stats.totalEarned}
          </p>
          <p className="text-xs text-white/30 mt-1">Leafs earned from referrals</p>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-wider text-white/30">
          How it works
        </p>
        <div className="space-y-2">
          {[
            { step: "1", text: "Share your link with anyone" },
            { step: "2", text: "They sign up and get 500 free Leafs" },
            { step: "3", text: "Every time they spend Leafs, you earn 1%" },
            { step: "4", text: "Passive income — forever" },
          ].map(item => (
            <div key={item.step} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}>
                {item.step}
              </span>
              <span className="text-sm text-white/50">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral list */}
      {stats.referrals.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
            Your referrals
          </p>
          <div className="space-y-2">
            {stats.referrals.map(ref => (
              <div key={ref.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div>
                  <span className="text-sm text-white">{ref.name || ref.username}</span>
                  <span className="text-xs text-white/20 ml-2">@{ref.username}</span>
                </div>
                <span className="text-xs font-mono text-white/40">
                  {ref.totalEarned} Leafs earned
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

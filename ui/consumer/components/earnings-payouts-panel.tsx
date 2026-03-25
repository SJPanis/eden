"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type PayoutRecord = {
  id: string;
  leafsAmount: number;
  cashAmountCents: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt: string | null;
};

type EarningsPayoutsPanelProps = {
  leafsBalance: number;
  payoutEnabled: boolean;
};

const MIN_PAYOUT_LEAFS = 1000;
const LEAFS_TO_DOLLAR = 0.01;

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "rgba(245,158,11,0.12)", text: "rgb(245,158,11)", label: "Pending" },
  COMPLETED: { bg: "rgba(45,212,191,0.12)", text: "rgb(45,212,191)", label: "Completed" },
  FAILED: { bg: "rgba(239,68,68,0.12)", text: "rgb(239,68,68)", label: "Failed" },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function EarningsPayoutsPanel({
  leafsBalance,
  payoutEnabled,
}: EarningsPayoutsPanelProps) {
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashingOut, setCashingOut] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usdBalance = (leafsBalance * LEAFS_TO_DOLLAR).toFixed(2);
  const canCashOut = payoutEnabled && leafsBalance >= MIN_PAYOUT_LEAFS;

  useEffect(() => {
    fetch("/api/payouts/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setRecords(data.records);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setError(data.error ?? "Unable to start onboarding.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleCashOut() {
    setCashingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leafsAmount: leafsBalance }),
      });
      const data = await res.json();
      if (data.ok && data.payoutRecord) {
        setRecords((prev) => [data.payoutRecord, ...prev]);
      } else {
        setError(data.error ?? "Payout failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCashingOut(false);
    }
  }

  return (
    <div
      className="rounded-[28px] p-5"
      style={{
        border: "1px solid rgba(45,212,191,0.12)",
        background: "rgba(13,30,46,0.55)",
        backdropFilter: "blur(10px)",
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
        Earnings & Payouts
      </p>
      <h2 className="mt-2 text-lg font-semibold text-white">Cash out your Leafs</h2>

      {/* Balance display */}
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-white">
          {leafsBalance.toLocaleString()}
        </span>
        <span className="text-sm text-white/40">Leafs</span>
        <span className="ml-auto text-lg font-semibold text-eden-accent">
          ${usdBalance}
        </span>
        <span className="text-xs text-white/35">USD</span>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex flex-wrap gap-3">
        {!payoutEnabled ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: "rgba(45,212,191,0.85)",
              border: "1px solid rgba(45,212,191,0.4)",
              boxShadow: "0 4px 20px -4px rgba(45,212,191,0.3)",
            }}
          >
            {connecting ? "Connecting..." : "Connect bank account"}
          </button>
        ) : (
          <button
            onClick={handleCashOut}
            disabled={!canCashOut || cashingOut}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: canCashOut ? "rgba(45,212,191,0.85)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${canCashOut ? "rgba(45,212,191,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {cashingOut ? "Processing..." : `Cash out ${leafsBalance.toLocaleString()} Leafs`}
          </button>
        )}
        {payoutEnabled && leafsBalance < MIN_PAYOUT_LEAFS && (
          <p className="self-center text-xs text-white/35">
            Minimum payout: {MIN_PAYOUT_LEAFS.toLocaleString()} Leafs (${(MIN_PAYOUT_LEAFS * LEAFS_TO_DOLLAR).toFixed(0)})
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}

      {/* Payout history */}
      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
          Payout History
        </p>
        {loading ? (
          <p className="mt-3 text-sm text-white/25">Loading...</p>
        ) : records.length === 0 ? (
          <p className="mt-3 text-sm text-white/30">
            No payouts yet. Earn Leafs by publishing services or contributing.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {records.map((record, i) => {
              const badge = statusBadge[record.status] ?? statusBadge.PENDING;
              return (
                <motion.div
                  key={record.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      {record.leafsAmount.toLocaleString()} Leafs
                    </span>
                    <span className="text-xs text-white/35">
                      {new Date(record.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white/60">
                      ${(record.cashAmountCents / 100).toFixed(2)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

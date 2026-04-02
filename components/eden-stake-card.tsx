"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StakeData = {
  adam: { userLeafs: number; totalLeafs: number; percentage: number };
  eve: { userActions: number; totalActions: number; percentage: number };
};

export function EdenStakeCard() {
  const [data, setData] = useState<StakeData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/user/contribution-stats")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-2xl p-4 text-left transition-all"
      style={{
        background: "rgba(45,212,191,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(45,212,191,0.7)" }}>
          Your Eden Stake
        </p>
        <span className="text-[10px] text-white/20">{expanded ? "close" : "details"}</span>
      </div>

      <div className="mt-3 space-y-2">
        {/* Adam / Innovation pool */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-amber-400/60">Adam Pool</p>
            <p className="text-[10px] text-amber-400/30">{data.adam.userLeafs.toLocaleString()} {"🍃"} earned</p>
          </div>
          <p className="text-sm font-semibold text-amber-400">{data.adam.percentage.toFixed(2)}%</p>
        </div>

        {/* Architect / Commitment pool */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-blue-400/60">Architect Pool</p>
            <p className="text-[10px] text-blue-400/30">{data.eve.userActions.toLocaleString()} actions</p>
          </div>
          <p className="text-sm font-semibold text-blue-400">{data.eve.percentage.toFixed(2)}%</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "rgba(45,212,191,0.08)" }}>
          <p className="text-[11px] leading-relaxed text-white/30">
            Your stake in Eden grows as you contribute. The Adam pool tracks service revenue you generate.
            The Architect pool tracks your consistent usage over time.
          </p>
          <div className="space-y-1 text-[10px] font-mono">
            <div className="flex justify-between text-white/30">
              <span>Your service earnings</span>
              <span className="text-amber-400/50">{data.adam.userLeafs.toLocaleString()} {"🍃"}</span>
            </div>
            <div className="flex justify-between text-white/30">
              <span>Total Eden revenue</span>
              <span className="text-white/40">{data.adam.totalLeafs.toLocaleString()} {"🍃"}</span>
            </div>
            <div className="flex justify-between text-white/30">
              <span>Your qualified actions</span>
              <span className="text-blue-400/50">{data.eve.userActions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white/30">
              <span>Total Eden actions</span>
              <span className="text-white/40">{data.eve.totalActions.toLocaleString()}</span>
            </div>
          </div>
          <Link
            href="/garden"
            className="block text-center text-[10px] text-[#2dd4bf]/40 hover:text-[#2dd4bf]/60 transition-colors"
          >
            View in Digital Garden
          </Link>
        </div>
      )}
    </button>
  );
}

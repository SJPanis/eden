"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string;
  request: string;
  prUrl: string;
  summary: string;
  confidence: number;
  submittedAt: string;
};

type Layer2Status = {
  active: boolean;
  currentSimulation: string | null;
  pendingApprovals: number;
  lastSimulationAt: string | null;
  simulationHealth: "healthy" | "degraded" | "offline";
};

export function Layer2Dashboard() {
  const [status, setStatus] = useState<Layer2Status | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/layer2/status").then((r) => r.json()),
      fetch("/api/layer2/pending").then((r) => r.json()),
    ])
      .then(([statusData, pendingData]) => {
        if (statusData.ok) setStatus(statusData);
        if (pendingData.ok && pendingData.submissions) {
          setSubmissions(pendingData.submissions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDecision(approvalId: string, decision: "approve" | "deny") {
    setActionLoading(approvalId);
    try {
      const note = decision === "deny" ? prompt("Reason for denial:") : "";
      if (decision === "deny" && note === null) {
        setActionLoading(null);
        return; // User cancelled prompt
      }
      const res = await fetch("/api/layer2/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision, note: note ?? "" }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== approvalId));
        // Refresh status
        fetch("/api/layer2/status")
          .then((r) => r.json())
          .then((d) => { if (d.ok) setStatus(d); });
      }
    } catch {
      // silent
    }
    setActionLoading(null);
  }

  const healthColor =
    status?.simulationHealth === "healthy"
      ? "#2dd4bf"
      : status?.simulationHealth === "degraded"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#060e1a" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-5"
        style={{ borderColor: "rgba(45,212,191,0.1)", background: "rgba(6,14,26,0.95)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/owner"
              className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors"
            >
              &#8592; Owner
            </Link>
            <div>
              <h1 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Layer 2 — Inner Simulation
              </h1>
              <p className="text-xs text-white/30">
                Review and approve autonomous agent submissions
              </p>
            </div>
          </div>
          {status && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: healthColor, boxShadow: `0 0 6px ${healthColor}` }}
                />
                <span className="text-xs font-mono uppercase text-white/40">
                  {status.simulationHealth}
                </span>
              </div>
              {status.active && (
                <span className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase"
                  style={{ background: "rgba(45,212,191,0.1)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.2)" }}
                >
                  simulating
                </span>
              )}
              <span className="text-xs font-mono text-white/30">
                {status.pendingApprovals} pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Status card */}
        {status?.currentSimulation && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(45,212,191,0.04)", border: "1px solid rgba(45,212,191,0.1)" }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#2dd4bf]/60">
              Currently Simulating
            </p>
            <p className="mt-2 text-sm text-white/70">{status.currentSimulation}</p>
          </div>
        )}

        {/* Pending submissions */}
        {loading ? (
          <p className="text-center text-xs text-white/20 py-12">Loading...</p>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/20 text-sm">No pending approvals</p>
            <p className="mt-2 text-white/10 text-xs">
              Layer 2 submissions will appear here for review
            </p>
          </div>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{sub.request}</p>
                  <p className="mt-1 text-xs text-white/40">{sub.summary}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-mono"
                    style={{
                      background:
                        sub.confidence >= 80
                          ? "rgba(16,185,129,0.1)"
                          : sub.confidence >= 50
                            ? "rgba(245,158,11,0.1)"
                            : "rgba(239,68,68,0.1)",
                      color:
                        sub.confidence >= 80
                          ? "#10b981"
                          : sub.confidence >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                      border: `1px solid ${
                        sub.confidence >= 80
                          ? "rgba(16,185,129,0.2)"
                          : sub.confidence >= 50
                            ? "rgba(245,158,11,0.2)"
                            : "rgba(239,68,68,0.2)"
                      }`,
                    }}
                  >
                    {sub.confidence}% confidence
                  </span>
                </div>
              </div>

              {sub.prUrl && (
                <a
                  href={sub.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-[#2dd4bf]/60 hover:text-[#2dd4bf] transition-colors"
                >
                  View PR on GitHub &#8599;
                </a>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(sub.id, "approve")}
                  disabled={!!actionLoading}
                  className="rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: "#2dd4bf", color: "#060e1a" }}
                >
                  {actionLoading === sub.id ? "..." : "Approve \u2192"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(sub.id, "deny")}
                  disabled={!!actionLoading}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition-all"
                  style={{
                    color: "rgba(239,68,68,0.7)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    background: "rgba(239,68,68,0.04)",
                  }}
                >
                  Deny &#10005;
                </button>
              </div>

              <p className="mt-2 text-[10px] text-white/15">
                Submitted {new Date(sub.submittedAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

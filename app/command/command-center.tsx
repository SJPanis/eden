"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CommandState = "loading" | "setup" | "locked" | "active";

type Layer2Submission = {
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
  simulationHealth: "healthy" | "degraded" | "offline";
};

export function CommandCenter({ username }: { username: string }) {
  const [state, setState] = useState<CommandState>("loading");
  const [commandToken, setCommandToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState("");

  // Setup state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // TOTP input state
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Active state
  const [l2Status, setL2Status] = useState<Layer2Status | null>(null);
  const [submissions, setSubmissions] = useState<Layer2Submission[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [economyData, setEconomyData] = useState<{ totalRevenue: number; unswept: number } | null>(null);
  const [eveScanResult, setEveScanResult] = useState<string | null>(null);
  const [adamInput, setAdamInput] = useState("");

  // Check TOTP status on mount (non-destructive — does NOT generate a new secret)
  useEffect(() => {
    fetch("/api/auth/totp/status")
      .then((r) => {
        if (r.status === 403) {
          setState("locked");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.totpEnabled) {
          setState("locked"); // TOTP is set up, user needs to enter code
        } else {
          setState("setup"); // TOTP not yet configured, start setup flow
          // Trigger setup to get QR code
          handleStartSetup();
        }
      })
      .catch(() => setState("locked"));
  }, []);

  // Session countdown
  useEffect(() => {
    if (state !== "active" || !expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      if (remaining <= 0) {
        setCommandToken(null);
        setState("locked");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [state, expiresAt]);

  // Fetch data when active
  useEffect(() => {
    if (state !== "active") return;
    let cancelled = false;

    function fetchData() {
      fetch("/api/layer2/status")
        .then((r) => r.json())
        .then((d) => { if (!cancelled && d.ok) setL2Status(d); })
        .catch(() => {});
      fetch("/api/admin/sweep-revenue")
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.ok) {
            setEconomyData({ totalRevenue: d.totalLeafs, unswept: d.totalLeafs });
          }
        })
        .catch(() => {});
    }
    fetchData();
    const poll = setInterval(fetchData, 5000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [state]);

  // Handle digit input
  function handleDigitChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newDigits.every((d) => d)) {
      const code = newDigits.join("");
      if (state === "setup") {
        handleConfirmSetup(code);
      } else {
        handleVerify(code);
      }
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split("");
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      if (state === "setup") {
        handleConfirmSetup(pasted);
      } else {
        handleVerify(pasted);
      }
    }
  }

  async function handleVerify(code: string) {
    setVerifying(true);
    setVerifyError(null);
    console.log("[command] Verifying TOTP code...");
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommandToken(data.commandToken);
        setExpiresAt(Date.now() + data.expiresIn * 1000);
        setState("active");
      } else {
        setVerifyError(data.error ?? "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setVerifyError("Verification failed");
    }
    setVerifying(false);
  }

  // Setup flow
  async function handleStartSetup() {
    setDigits(["", "", "", "", "", ""]);
    setSetupError(null);
    console.log("[command] Starting TOTP setup...");
    try {
      const res = await fetch("/api/auth/totp/setup");
      const data = await res.json();
      console.log("[command] Setup GET response:", data.ok ? "ok" : data.error);
      if (data.ok) {
        setQrCode(data.qrCode);
        setSetupSecret(data.secret);
        setState("setup");
      } else {
        setSetupError(data.error);
      }
    } catch (err) {
      console.error("[command] Setup failed:", err);
      setSetupError("Setup failed");
    }
  }

  async function handleConfirmSetup(autoCode?: string) {
    const code = autoCode ?? digits.join("");
    if (code.length !== 6) return;
    setVerifying(true);
    setSetupError(null);
    console.log("[command] Verifying setup code...");
    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      console.log("[command] Setup verify response:", data);
      if (data.ok) {
        console.log("[command] TOTP enabled successfully");
        setState("locked");
        setDigits(["", "", "", "", "", ""]);
      } else {
        setSetupError(data.error ?? "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setSetupError("Setup failed");
    }
    setVerifying(false);
  }

  // Active state actions
  const handleApproval = useCallback(async (approvalId: string, decision: "approve" | "deny") => {
    if (!commandToken) return;
    setActionLoading(approvalId);
    try {
      const note = decision === "deny" ? prompt("Reason for denial:") : "";
      if (decision === "deny" && note === null) { setActionLoading(null); return; }
      await fetch("/api/layer2/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Command-Token": commandToken,
        },
        body: JSON.stringify({ approvalId, decision, note: note ?? "" }),
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== approvalId));
    } catch { /* silent */ }
    setActionLoading(null);
  }, [commandToken]);

  async function handleEveScan() {
    setEveScanResult("Scanning...");
    try {
      const res = await fetch("/api/agents/eve");
      const data = await res.json();
      setEveScanResult(data.ok
        ? `Found ${data.maintenanceTasks?.length ?? 0} maintenance tasks`
        : "Scan failed");
    } catch {
      setEveScanResult("Scan failed");
    }
  }

  async function handleAdamBuild() {
    if (!adamInput.trim()) return;
    try {
      await fetch("/api/agents/adam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: adamInput }),
      });
      setAdamInput("");
    } catch { /* silent */ }
  }

  async function handleSweep() {
    if (!commandToken) return;
    try {
      await fetch("/api/admin/sweep-revenue", { method: "POST" });
      setEconomyData((prev) => prev ? { ...prev, unswept: 0 } : null);
    } catch { /* silent */ }
  }

  function handleLock() {
    setCommandToken(null);
    setState("locked");
    setDigits(["", "", "", "", "", ""]);
  }

  // ── Digit input component ───────────────────────────────────────────
  const digitInputs = (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleDigitChange(i, e.target.value)}
          onKeyDown={(e) => handleDigitKeyDown(i, e)}
          onPaste={i === 0 ? handleDigitPaste : undefined}
          className="w-12 h-14 text-center text-2xl font-mono font-bold rounded-xl outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: d ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(255,255,255,0.08)",
            color: "white",
          }}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );

  // ── LOADING ─────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#06080f" }}>
        <p className="text-xs text-white/20 font-mono">Loading...</p>
      </div>
    );
  }

  // ── SETUP ───────────────────────────────────────────────────────────
  if (state === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#06080f" }}>
        <div className="w-full max-w-[390px] space-y-6">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#2dd4bf]/60 font-mono">Eden Command</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Set up TOTP</h1>
            <p className="mt-2 text-xs text-white/30">Scan this QR code with Google Authenticator</p>
          </div>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="TOTP QR Code" className="rounded-xl" style={{ width: 200, height: 200 }} />
            </div>
          )}
          {setupSecret && (
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono">Manual entry key</p>
              <p className="mt-1 text-xs font-mono text-white/50 break-all select-all">{setupSecret}</p>
            </div>
          )}
          <div>
            <p className="text-center text-xs text-white/30 mb-3">Enter the 6-digit code to verify</p>
            {digitInputs}
          </div>
          {setupError && <p className="text-center text-xs text-red-400/80">{setupError}</p>}
          <button
            type="button"
            onClick={() => handleConfirmSetup()}
            disabled={verifying || digits.some((d) => !d)}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: "#2dd4bf", color: "#06080f" }}
          >
            {verifying ? "Verifying..." : "Verify & Enable"}
          </button>
        </div>
      </div>
    );
  }

  // ── LOCKED ──────────────────────────────────────────────────────────
  if (state === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#06080f" }}>
        <div className="w-full max-w-[390px] space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: "#2dd4bf", boxShadow: "0 0 12px #2dd4bf" }} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#2dd4bf]/60 font-mono">Eden Command</p>
            <p className="mt-6 text-xs text-white/20">Open Google Authenticator on your phone</p>
          </div>
          {digitInputs}
          {verifyError && <p className="text-center text-xs text-red-400/80">{verifyError}</p>}
          {verifying && <p className="text-center text-xs text-white/20">Verifying...</p>}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleStartSetup}
              className="text-[10px] text-white/15 hover:text-white/30 transition-colors font-mono"
            >
              Set up new TOTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#06080f" }}>
      {/* Header bar */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(6,8,15,0.95)", borderBottom: "1px solid rgba(45,212,191,0.1)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf]/70 font-mono">Eden Command</span>
        <span className="text-[10px] font-mono text-white/30">Session: {timeLeft} remaining</span>
        <button
          type="button"
          onClick={handleLock}
          className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors"
        >
          Lock
        </button>
      </div>

      <div className="mx-auto max-w-[390px] px-4 py-6 space-y-6">
        {/* Section 1 — Layer 2 Queue */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf]/50 font-mono mb-3">
            Layer 2 Queue
            {l2Status && <span className="ml-2 text-white/20">{l2Status.pendingApprovals} pending</span>}
          </p>
          {submissions.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p className="text-xs text-white/15">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-sm font-medium text-white">{sub.request}</p>
                  <p className="mt-1 text-xs text-white/30">{sub.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: sub.confidence >= 80 ? "#10b981" : sub.confidence >= 50 ? "#f59e0b" : "#ef4444" }}
                    >
                      {sub.confidence}%
                    </span>
                    {sub.prUrl && (
                      <a href={sub.prUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#2dd4bf]/40 hover:text-[#2dd4bf]/70">
                        PR &#8599;
                      </a>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproval(sub.id, "approve")}
                      disabled={!!actionLoading}
                      className="flex-1 rounded-lg py-2.5 text-xs font-semibold disabled:opacity-30"
                      style={{ background: "#2dd4bf", color: "#06080f", minHeight: 44 }}
                    >
                      {actionLoading === sub.id ? "..." : "Approve \u2192"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproval(sub.id, "deny")}
                      disabled={!!actionLoading}
                      className="rounded-lg px-4 py-2.5 text-xs disabled:opacity-30"
                      style={{ color: "rgba(239,68,68,0.6)", border: "1px solid rgba(239,68,68,0.12)", minHeight: 44 }}
                    >
                      &#10005;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 — Eden Status */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf]/50 font-mono mb-3">Eden Status</p>
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30">Simulation</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: l2Status?.simulationHealth === "healthy" ? "#2dd4bf" : l2Status?.simulationHealth === "degraded" ? "#f59e0b" : "#ef4444",
                    boxShadow: `0 0 4px ${l2Status?.simulationHealth === "healthy" ? "#2dd4bf" : "#ef4444"}`,
                  }}
                />
                <span className="text-xs font-mono text-white/40">{l2Status?.simulationHealth ?? "offline"}</span>
              </div>
            </div>
            {l2Status?.currentSimulation && (
              <p className="text-xs text-white/20">{l2Status.currentSimulation}</p>
            )}
          </div>
        </div>

        {/* Section 3 — Economy */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf]/50 font-mono mb-3">Economy</p>
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Unswept revenue</span>
              <span className="font-mono text-white/50">{economyData?.unswept.toLocaleString() ?? 0} Leaf&apos;s</span>
            </div>
            <button
              type="button"
              onClick={handleSweep}
              disabled={!economyData?.unswept}
              className="w-full rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-20"
              style={{ background: "rgba(45,212,191,0.1)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.15)", minHeight: 44 }}
            >
              Sweep to EdenOS LLC
            </button>
          </div>
        </div>

        {/* Section 4 — Quick Actions */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf]/50 font-mono mb-3">Quick Actions</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleEveScan}
              className="w-full rounded-xl py-3 text-xs font-semibold transition-all"
              style={{ background: "rgba(59,130,246,0.08)", color: "rgba(96,165,250,0.8)", border: "1px solid rgba(59,130,246,0.12)", minHeight: 44 }}
            >
              Run Eve Maintenance Scan
            </button>
            {eveScanResult && <p className="text-xs text-white/20 text-center">{eveScanResult}</p>}
            <div className="space-y-2">
              <input
                type="text"
                value={adamInput}
                onChange={(e) => setAdamInput(e.target.value)}
                placeholder="Describe what Adam should build..."
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none"
                style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdamBuild(); }}
              />
              <button
                type="button"
                onClick={handleAdamBuild}
                disabled={!adamInput.trim()}
                className="w-full rounded-xl py-3 text-xs font-semibold transition-all disabled:opacity-20"
                style={{ background: "rgba(245,158,11,0.08)", color: "rgba(251,191,36,0.8)", border: "1px solid rgba(245,158,11,0.12)", minHeight: 44 }}
              >
                Trigger Adam Build
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

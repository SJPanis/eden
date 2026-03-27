"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type ImagineAutoPanelProps = {
  username: string;
  displayName: string;
  balanceCredits: number;
};

type Tab = "parts" | "visualize" | "diagnose";

const IA_GOLD = "#f59e0b";
const IA_GOLD_DIM = "rgba(245,158,11,0.15)";
const IA_CARD_BG = "rgba(20,15,5,0.85)";
const IA_CARD_BORDER = "rgba(245,158,11,0.15)";

const tabConfig: { key: Tab; label: string; cost: number }[] = [
  { key: "parts", label: "Find Parts", cost: 10 },
  { key: "visualize", label: "Visualize", cost: 100 },
  { key: "diagnose", label: "Diagnose", cost: 75 },
];

type PartResult = {
  name: string;
  partNumber?: string;
  compatibility: string;
  priceRange: string;
  condition?: string;
  supplier?: string;
  searchUrl?: string;
  description?: string;
};

type DiagResult = {
  severity: "critical" | "warning" | "info";
  issue: string;
  recommendation: string;
  costRange: string;
};

function hashString(str: string): number {
  return str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ImagineAutoPanel({ username, displayName, balanceCredits }: ImagineAutoPanelProps) {
  const [tab, setTab] = useState<Tab>("parts");
  const [balance, setBalance] = useState(balanceCredits);
  const [spendError, setSpendError] = useState<string | null>(null);

  // Find Parts state
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [partNeeded, setPartNeeded] = useState("");
  const [partsResults, setPartsResults] = useState<PartResult[] | null>(null);
  const [partsLoading, setPartsLoading] = useState(false);

  // Visualize state
  const [vizDescription, setVizDescription] = useState("");
  const [vizResult, setVizResult] = useState<string | null>(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [savedVizTime, setSavedVizTime] = useState<string | null>(null);

  // Diagnose state
  const [vinOrIssue, setVinOrIssue] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Load saved visualization on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`imagine-auto-viz-${username}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setVizResult(parsed.result);
        setVizDescription(parsed.description);
        setSavedVizTime(parsed.generatedAt);
      }
    } catch { /* ignore */ }
  }, [username]);

  async function spendAndRun(amount: number, description: string): Promise<boolean> {
    setSpendError(null);
    const res = await fetch("/api/wallet/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description }),
    });
    const data = await res.json();
    if (!data.ok) {
      setSpendError(
        data.error === "Insufficient Leaf balance"
          ? `Not enough Leaf's. You need ${data.required} but have ${data.balance}.`
          : "Something went wrong. Try again.",
      );
      return false;
    }
    setBalance(data.newBalance);
    return true;
  }

  async function callClaude(prompt: string): Promise<string> {
    const res = await fetch("/api/claude/imagine-auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.result ?? "";
  }

  async function handleSearchParts() {
    if (!year || !make || !model || !partNeeded) return;
    setPartsLoading(true);
    setSpendError(null);

    const ok = await spendAndRun(10, "Imagine Auto — Find Parts");
    if (!ok) {
      setPartsLoading(false);
      return;
    }

    try {
      const prompt = `You are an automotive parts expert with knowledge of real parts suppliers.
A user has a ${year} ${make} ${model} and needs: ${partNeeded}.

Return ONLY a JSON array of exactly 3 real parts with this structure:
[
  {
    "name": "Exact part name",
    "partNumber": "OEM or aftermarket part number if known",
    "compatibility": "Fits [year range] [make] [model]",
    "priceRange": "$X–$Y",
    "condition": "OEM|Aftermarket|Remanufactured",
    "supplier": "RockAuto|AutoZone|Amazon|eBay Motors|Advance Auto",
    "searchUrl": "https://www.rockauto.com/en/catalog/[make]/[year]/[model] OR https://www.amazon.com/s?k=[partname]+[year]+[make]+[model] OR https://www.autozone.com/searchresult?searchtext=[partname]+[year]+[make]+[model]",
    "description": "One sentence about this part and why it fits"
  }
]

For searchUrl:
- Use RockAuto for OEM and remanufactured parts
- Use Amazon for aftermarket and performance parts
- Use AutoZone for common wear items
- Build real URLs with the actual year/make/model/part encoded properly

Return ONLY the JSON array. No other text.`;
      const raw = await callClaude(prompt);
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as PartResult[];
        setPartsResults(parsed);
      } else {
        setPartsResults([
          { name: "AI result", compatibility: raw.slice(0, 120), priceRange: "N/A" },
        ]);
      }
    } catch {
      setSpendError("Claude returned an unexpected response. Leaf's were deducted.");
    }
    setPartsLoading(false);
  }

  async function handleVisualize() {
    if (!vizDescription) return;
    setVizLoading(true);
    setSpendError(null);

    const ok = await spendAndRun(100, "Imagine Auto — Visualize");
    if (!ok) {
      setVizLoading(false);
      return;
    }

    try {
      const result = await callClaude(
        `You are a custom automotive parts designer. User wants: ${vizDescription}. Describe the visual render in 2 sentences. Be specific about materials, finish, and fitment. Return ONLY the description.`,
      );
      setVizResult(result);
      const now = new Date().toISOString();
      setSavedVizTime(now);
      try {
        localStorage.setItem(`imagine-auto-viz-${username}`, JSON.stringify({
          result,
          description: vizDescription,
          generatedAt: now,
          username,
        }));
      } catch { /* ignore */ }
    } catch {
      setSpendError("Claude returned an unexpected response. Leaf's were deducted.");
    }
    setVizLoading(false);
  }

  function downloadRender() {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hash = hashString(vizDescription);
    const angle = ((hash % 180) * Math.PI) / 180;
    const grd = ctx.createLinearGradient(0, 0, Math.cos(angle) * 800, Math.sin(angle) * 600);
    grd.addColorStop(0, "#0b1622");
    grd.addColorStop(0.5, `hsla(${(hash % 60) + 20}, 80%, 25%, 1)`);
    grd.addColorStop(1, "#1a0f00");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 800, 600);

    ctx.font = "bold 200px serif";
    ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
    ctx.textAlign = "center";
    ctx.fillText("IA", 400, 380);

    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "center";
    const words = (vizResult ?? "").split(" ");
    let line = "";
    let y = 200;
    for (const word of words) {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > 700 && line) {
        ctx.fillText(line, 400, y);
        line = `${word} `;
        y += 28;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 400, y);

    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(245,158,11,0.6)";
    ctx.textAlign = "right";
    ctx.fillText("IMAGINE AUTO \u2014 AI RENDER", 780, 570);

    const link = document.createElement("a");
    link.download = `imagine-auto-render-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleDiagnose() {
    if (!vinOrIssue || !symptoms) return;
    setDiagLoading(true);
    setSpendError(null);

    const ok = await spendAndRun(75, "Imagine Auto — Diagnose");
    if (!ok) {
      setDiagLoading(false);
      return;
    }

    try {
      const raw = await callClaude(
        `Vehicle/issue: ${vinOrIssue}. Symptoms: ${symptoms}. Return ONLY JSON: {"severity":"warning"|"info"|"critical","issue":"...","recommendation":"...","costRange":"$X\u2013$Y"}`,
      );
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as DiagResult;
        setDiagResult(parsed);
      } else {
        setDiagResult({
          severity: "info",
          issue: "AI Analysis",
          recommendation: raw.slice(0, 300),
          costRange: "See recommendation",
        });
      }
    } catch {
      setSpendError("Claude returned an unexpected response. Leaf's were deducted.");
    }
    setDiagLoading(false);
  }

  const severityColors = {
    critical: { dot: "#ef4444", text: "text-red-400" },
    warning: { dot: IA_GOLD, text: "text-amber-400" },
    info: { dot: "#3b82f6", text: "text-blue-400" },
  };

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.15)] focus:border-[rgba(245,158,11,0.45)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)]";

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/consumer"
          className="text-xs uppercase tracking-[0.14em] transition-colors hover:text-white"
          style={{ color: IA_GOLD }}
        >
          &#8592; Eden
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{displayName}</span>
          <span
            className="rounded-full px-3 py-1 font-mono text-xs font-semibold text-white"
            style={{ border: `1px solid ${IA_CARD_BORDER}`, background: IA_GOLD_DIM }}
          >
            &#127809; {balance.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-5"
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
            style={{
              background: "radial-gradient(circle at 35% 25%, rgba(245,158,11,0.2), rgba(11,22,34,0.97))",
              border: `2px solid ${IA_GOLD}`,
              color: IA_GOLD,
              boxShadow: "0 0 24px -4px rgba(245,158,11,0.35)",
            }}
          >
            IA
          </div>
          <div>
            <h1
              className="text-3xl text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <span style={{ color: IA_GOLD }}>Imagine</span> Auto
            </h1>
            <p className="mt-1 text-sm text-white/50">Find it. Visualize it. Own it.</p>
          </div>
        </motion.div>

        {/* Spend error banner */}
        <AnimatePresence>
          {spendError ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 rounded-xl px-4 py-3 text-sm text-red-300"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {spendError}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mt-8 flex rounded-2xl p-1"
          style={{ border: `1px solid ${IA_CARD_BORDER}`, background: "rgba(245,158,11,0.03)" }}
        >
          {tabConfig.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all"
              style={
                tab === t.key
                  ? { background: IA_GOLD, color: "#0b1622", fontWeight: 600 }
                  : { color: IA_GOLD, background: "transparent" }
              }
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait" initial={false}>
          {tab === "parts" ? (
            <motion.div
              key="parts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <div
                className="rounded-[20px] p-6"
                style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-white/40 mb-4">Vehicle Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year (e.g. 2019)" className={inputCls} />
                  <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make (e.g. Toyota)" className={inputCls} />
                  <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (e.g. Camry)" className={inputCls} />
                  <input value={partNeeded} onChange={(e) => setPartNeeded(e.target.value)} placeholder="Part needed" className={inputCls} />
                </div>
                <button
                  type="button"
                  onClick={handleSearchParts}
                  disabled={partsLoading || !year || !make || !model || !partNeeded}
                  className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: IA_GOLD, color: "#0b1622" }}
                >
                  {partsLoading ? "Searching..." : "Search Parts \u2014 10 \u{1F343}"}
                </button>
              </div>

              <AnimatePresence>
                {partsResults ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-3"
                  >
                    {partsResults.map((part, i) => {
                      const conditionColor =
                        part.condition === "OEM" ? "#2dd4bf" :
                        part.condition === "Aftermarket" ? "#fbbf24" :
                        part.condition === "Remanufactured" ? "#a78bfa" : "#94a3b8";
                      return (
                        <motion.div
                          key={`${part.name}-${i}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="rounded-[16px] p-4"
                          style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold" style={{ color: IA_GOLD }}>{part.name}</p>
                              {part.partNumber ? (
                                <p className="mt-0.5 font-mono text-[11px] text-white/40">{part.partNumber}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-white/60">{part.compatibility}</p>
                            </div>
                            <p className="shrink-0 text-base font-semibold" style={{ color: IA_GOLD }}>{part.priceRange}</p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {part.condition ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ background: `${conditionColor}20`, color: conditionColor, border: `1px solid ${conditionColor}40` }}
                              >
                                {part.condition}
                              </span>
                            ) : null}
                            {part.supplier ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                              >
                                {part.supplier}
                              </span>
                            ) : null}
                          </div>
                          {part.description ? (
                            <p className="mt-2 text-xs italic text-white/50">{part.description}</p>
                          ) : null}
                          {part.searchUrl ? (
                            <a
                              href={part.searchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                border: '1px solid rgba(245,158,11,0.5)',
                                borderRadius: 8,
                                color: '#f59e0b',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                textDecoration: 'none',
                                marginTop: 8,
                                cursor: 'pointer',
                              }}
                            >
                              View on {part.supplier || 'Parts Store'} &rarr;
                            </a>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : !partsLoading ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 text-center text-sm text-white/30"
                  >
                    Enter your vehicle details to search for parts.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : tab === "visualize" ? (
            <motion.div
              key="visualize"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <div
                className="rounded-[20px] p-6"
                style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-white/40 mb-4">Describe Your Custom Part</p>
                <textarea
                  value={vizDescription}
                  onChange={(e) => setVizDescription(e.target.value)}
                  placeholder="e.g. Carbon fiber front splitter for 2020 BMW M3, matte black finish with gold accents..."
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                <div
                  className="mt-3 flex items-center justify-center rounded-xl border-2 border-dashed py-8"
                  style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.02)" }}
                >
                  <p className="text-xs text-white/30">Drop an image for reference (optional)</p>
                </div>
                <button
                  type="button"
                  onClick={handleVisualize}
                  disabled={vizLoading || !vizDescription}
                  className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: IA_GOLD, color: "#0b1622" }}
                >
                  {vizLoading ? "Generating..." : "Generate Render \u2014 100 \u{1F343}"}
                </button>
              </div>

              <AnimatePresence>
                {vizResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4"
                  >
                    <div
                      className="overflow-hidden rounded-[20px]"
                      style={{ border: `1px solid ${IA_CARD_BORDER}` }}
                    >
                      {/* CSS art render — unique gradient based on description hash */}
                      <div
                        className="relative flex h-64 items-center justify-center overflow-hidden"
                        style={{
                          background: `linear-gradient(${hashString(vizDescription) % 180}deg, rgba(245,158,11,0.3) 0%, rgba(20,15,5,0.97) 45%, hsla(${(hashString(vizDescription) % 60) + 20}, 70%, 15%, 0.6) 100%)`,
                        }}
                      >
                        {/* IA watermark */}
                        <span
                          className="absolute text-[140px] font-bold select-none"
                          style={{ color: "rgba(245,158,11,0.06)", fontFamily: "serif" }}
                        >
                          IA
                        </span>
                        {/* Corner badge */}
                        <span
                          className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                          style={{ color: "rgba(245,158,11,0.5)" }}
                        >
                          AI Render
                        </span>
                        {/* Center shape */}
                        <div className="relative z-10">
                          <div
                            className="h-28 w-44 rounded-2xl"
                            style={{
                              background: `linear-gradient(${(hashString(vizDescription) % 90) + 130}deg, rgba(245,158,11,0.45) 0%, rgba(30,20,5,0.92) 60%)`,
                              boxShadow: "0 8px 32px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                              border: "1px solid rgba(245,158,11,0.3)",
                            }}
                          />
                          <div
                            className="absolute -bottom-3 left-3 h-8 w-38 rounded-full opacity-40"
                            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.3), transparent)", width: "152px" }}
                          />
                        </div>
                      </div>
                      <div className="p-4" style={{ background: IA_CARD_BG }}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: IA_GOLD }}>AI-Generated Render</p>
                          {savedVizTime ? (
                            <p className="font-mono text-[10px] text-white/25">Generated {timeAgo(savedVizTime)}</p>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm italic leading-relaxed text-white/60">
                          {vizResult}
                        </p>
                        <p className="mt-2 text-[10px] text-white/25">
                          Disclaimer: This is an AI visualization for reference only. Actual parts may differ.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                            style={{ border: `1px solid ${IA_CARD_BORDER}`, color: IA_GOLD, background: "transparent" }}
                          >
                            Save to Profile
                          </button>
                          <button
                            type="button"
                            onClick={downloadRender}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                            style={{ border: "1px solid rgba(245,158,11,0.4)", color: IA_GOLD, background: "transparent", fontFamily: "monospace" }}
                          >
                            Download Render &#8595;
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="diagnose"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <div
                className="rounded-[20px] p-6"
                style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-white/40 mb-4">Vehicle Diagnostic</p>
                <input
                  value={vinOrIssue}
                  onChange={(e) => setVinOrIssue(e.target.value)}
                  placeholder="VIN or describe the issue (e.g. Check engine light on)"
                  className={inputCls}
                />
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Symptoms: rough idle, misfiring at low RPM, slight vibration..."
                  rows={3}
                  className={`mt-3 ${inputCls} resize-none`}
                />
                <button
                  type="button"
                  onClick={handleDiagnose}
                  disabled={diagLoading || !vinOrIssue || !symptoms}
                  className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: IA_GOLD, color: "#0b1622" }}
                >
                  {diagLoading ? "Analyzing..." : "Run Diagnostic \u2014 75 \u{1F343}"}
                </button>
              </div>

              <AnimatePresence>
                {diagResult ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <div
                      className="rounded-[20px] p-5"
                      style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: severityColors[diagResult.severity].dot, boxShadow: `0 0 8px ${severityColors[diagResult.severity].dot}` }}
                        />
                        <p className={`text-sm font-semibold ${severityColors[diagResult.severity].text}`}>
                          {diagResult.severity === "critical" ? "Critical" : diagResult.severity === "warning" ? "Warning" : "Info"}
                        </p>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-white">{diagResult.issue}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">{diagResult.recommendation}</p>
                      <div
                        className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ background: IA_GOLD_DIM, border: `1px solid ${IA_CARD_BORDER}` }}
                      >
                        <span className="text-xs text-white/50">Estimated Cost</span>
                        <span className="text-sm font-semibold" style={{ color: IA_GOLD }}>{diagResult.costRange}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

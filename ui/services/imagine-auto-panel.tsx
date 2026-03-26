"use client";

import { useState } from "react";
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
  { key: "parts", label: "Find Parts", cost: 50 },
  { key: "visualize", label: "Visualize", cost: 100 },
  { key: "diagnose", label: "Diagnose", cost: 75 },
];

// ── Mock results ───────────────────────────────────────────────────────────────
const mockParts = [
  { name: "OEM Front Brake Rotor", compatibility: "Direct fit — 2019+ Toyota Camry", priceRange: "$85–$120" },
  { name: "Performance Ceramic Brake Pad Set", compatibility: "Compatible — all 2018+ Camry trims", priceRange: "$45–$70" },
  { name: "Brake Caliper Assembly (Front Left)", compatibility: "Remanufactured — fits 2019 Camry LE/SE", priceRange: "$140–$195" },
];

const mockDiagnostic: { severity: "critical" | "warning" | "info"; issue: string; recommendation: string; costRange: string } = {
  severity: "warning",
  issue: "Intermittent Misfire — Cylinder 3",
  recommendation: "Replace ignition coil pack on cylinder 3. Inspect spark plug for carbon fouling. Clear codes and retest after 50 miles.",
  costRange: "$120–$280 (parts + labor)",
};

// ── Component ──────────────────────────────────────────────────────────────────
export function ImagineAutoPanel({ displayName, balanceCredits }: ImagineAutoPanelProps) {
  const [tab, setTab] = useState<Tab>("parts");

  // Find Parts state
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [partNeeded, setPartNeeded] = useState("");
  const [partsResults, setPartsResults] = useState<typeof mockParts | null>(null);
  const [partsLoading, setPartsLoading] = useState(false);

  // Visualize state
  const [vizDescription, setVizDescription] = useState("");
  const [vizResult, setVizResult] = useState(false);
  const [vizLoading, setVizLoading] = useState(false);

  // Diagnose state
  const [vinOrIssue, setVinOrIssue] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagResult, setDiagResult] = useState<typeof mockDiagnostic | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  function handleSearchParts() {
    if (!year || !make || !model || !partNeeded) return;
    setPartsLoading(true);
    setTimeout(() => { setPartsResults(mockParts); setPartsLoading(false); }, 1200);
  }

  function handleVisualize() {
    if (!vizDescription) return;
    setVizLoading(true);
    setTimeout(() => { setVizResult(true); setVizLoading(false); }, 1500);
  }

  function handleDiagnose() {
    if (!vinOrIssue || !symptoms) return;
    setDiagLoading(true);
    setTimeout(() => { setDiagResult(mockDiagnostic); setDiagLoading(false); }, 1300);
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
            &#127809; {balanceCredits.toLocaleString()}
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
              boxShadow: `0 0 24px -4px rgba(245,158,11,0.35)`,
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
                  {partsLoading ? "Searching..." : "Search Parts — 50 \u{1F343}"}
                </button>
              </div>

              <AnimatePresence>
                {partsResults ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-3"
                  >
                    {partsResults.map((part, i) => (
                      <motion.div
                        key={part.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-[16px] p-4"
                        style={{ background: IA_CARD_BG, border: `1px solid ${IA_CARD_BORDER}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{part.name}</p>
                            <p className="mt-1 text-xs text-white/45">{part.compatibility}</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold" style={{ color: IA_GOLD }}>{part.priceRange}</p>
                        </div>
                        <button
                          type="button"
                          className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                          style={{ border: `1px solid ${IA_CARD_BORDER}`, color: IA_GOLD, background: IA_GOLD_DIM }}
                        >
                          View Details
                        </button>
                      </motion.div>
                    ))}
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
                  {vizLoading ? "Generating..." : "Generate Render — 100 \u{1F343}"}
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
                      {/* CSS art render */}
                      <div
                        className="flex h-64 items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(20,15,5,0.95) 50%, rgba(245,158,11,0.1) 100%)",
                        }}
                      >
                        <div className="relative">
                          <div
                            className="h-24 w-40 rounded-2xl"
                            style={{
                              background: "linear-gradient(160deg, rgba(245,158,11,0.5) 0%, rgba(30,20,5,0.9) 60%)",
                              boxShadow: "0 8px 32px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                              border: "1px solid rgba(245,158,11,0.3)",
                            }}
                          />
                          <div
                            className="absolute -bottom-3 left-4 h-8 w-32 rounded-full opacity-40"
                            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.3), transparent)" }}
                          />
                        </div>
                      </div>
                      <div className="p-4" style={{ background: IA_CARD_BG }}>
                        <p className="text-xs uppercase tracking-[0.12em]" style={{ color: IA_GOLD }}>AI-Generated Render</p>
                        <p className="mt-2 text-sm text-white/60">
                          Based on your description: &ldquo;{vizDescription.slice(0, 60)}{vizDescription.length > 60 ? "..." : ""}&rdquo;
                        </p>
                        <p className="mt-2 text-[10px] text-white/25">
                          Disclaimer: This is an AI visualization for reference only. Actual parts may differ.
                        </p>
                        <button
                          type="button"
                          className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                          style={{ border: `1px solid ${IA_CARD_BORDER}`, color: IA_GOLD, background: "transparent" }}
                        >
                          Save to Profile
                        </button>
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
                  {diagLoading ? "Analyzing..." : "Run Diagnostic — 75 \u{1F343}"}
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

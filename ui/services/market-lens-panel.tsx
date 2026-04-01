"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ServiceLoadingBar } from "@/components/service-loading-bar";

type MarketLensPanelProps = {
  username: string;
  displayName: string;
  balanceCredits: number;
};

const ML_GREEN = "#10b981";
const ML_GREEN_DIM = "rgba(16,185,129,0.15)";
const ML_CARD_BG = "rgba(5,20,15,0.85)";
const ML_CARD_BORDER = "rgba(16,185,129,0.15)";
const ML_AMBER = "#f59e0b";
const ML_RED = "#ef4444";

type TickerData = {
  symbol: string;
  name: string;
  currentPrice: number;
  history: number[];
  volume: number[];
  high: number;
  expected: number;
  low: number;
  confidence: number;
  insight: string;
};

const mockTickers: Record<string, TickerData> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    currentPrice: 178.72,
    history: [165, 168, 164, 170, 172, 169, 174, 176, 173, 171, 175, 178, 176, 180, 177, 174, 179, 182, 180, 178, 176, 179, 181, 183, 180, 178, 175, 177, 179, 178.72],
    volume: [42, 38, 51, 44, 36, 48, 39, 55, 41, 37, 46, 52, 43, 38, 47, 50, 44, 36, 42, 53, 48, 39, 45, 41, 50, 44, 38, 46, 43, 47],
    high: 205,
    expected: 192,
    low: 162,
    confidence: 74,
    insight: "AAPL shows strong support at $175 with ascending channel formation. RSI at 58 suggests room for upside. Volume pattern indicates institutional accumulation. The probability cone favors a move toward $192 over the next 90 days with 74% confidence.",
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    currentPrice: 248.50,
    history: [210, 218, 225, 220, 232, 228, 235, 240, 237, 245, 242, 238, 250, 255, 248, 243, 252, 258, 254, 260, 256, 250, 245, 248, 253, 258, 255, 250, 247, 248.50],
    volume: [68, 72, 81, 65, 78, 70, 85, 74, 69, 82, 76, 71, 88, 92, 79, 73, 86, 90, 77, 95, 83, 75, 80, 72, 87, 91, 78, 74, 81, 84],
    high: 310,
    expected: 275,
    low: 195,
    confidence: 62,
    insight: "TSLA exhibits high volatility with wide Bollinger Bands. MACD crossover suggests short-term bullish momentum. Delivery numbers beat expectations. The wider cone reflects uncertainty — 62% confidence in the $275 target.",
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    currentPrice: 875.30,
    history: [720, 735, 750, 745, 760, 775, 770, 790, 800, 795, 810, 825, 818, 830, 845, 840, 855, 860, 850, 865, 870, 858, 845, 860, 872, 868, 855, 862, 870, 875.30],
    volume: [55, 60, 72, 58, 65, 78, 62, 82, 70, 64, 75, 85, 68, 73, 80, 66, 77, 83, 71, 88, 76, 69, 74, 67, 81, 79, 63, 72, 78, 82],
    high: 1050,
    expected: 960,
    low: 780,
    confidence: 71,
    insight: "NVDA continues its AI-driven rally with strong institutional inflows. Fibonacci retracement at $845 holds as support. Data center revenue growth accelerating. Claude projects 71% confidence in reaching $960 within 90 days.",
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    currentPrice: 67420,
    history: [58000, 59500, 61000, 60200, 62500, 63800, 62000, 64500, 65200, 63800, 65000, 66500, 65800, 67000, 66200, 64800, 66000, 67500, 66800, 68000, 67200, 65500, 66800, 67500, 68200, 67800, 66500, 67000, 67200, 67420],
    volume: [35, 42, 55, 38, 48, 60, 44, 62, 52, 40, 50, 58, 46, 54, 48, 42, 52, 62, 50, 65, 55, 44, 52, 48, 58, 54, 42, 50, 52, 56],
    high: 85000,
    expected: 78000,
    low: 52000,
    confidence: 58,
    insight: "BTC consolidating above $65K support after halving cycle. On-chain metrics show accumulation by long-term holders. Hash rate at all-time high. Wide cone reflects crypto volatility — 58% confidence in $78K target.",
  },
  SPY: {
    symbol: "SPY",
    name: "S&P 500 ETF",
    currentPrice: 512.40,
    history: [488, 492, 495, 493, 498, 501, 499, 503, 506, 504, 507, 510, 508, 505, 509, 512, 510, 507, 511, 514, 512, 509, 506, 510, 513, 515, 512, 510, 511, 512.40],
    volume: [30, 32, 38, 28, 35, 40, 33, 42, 36, 31, 37, 44, 34, 32, 38, 41, 35, 30, 36, 43, 38, 33, 37, 34, 40, 42, 35, 33, 36, 39],
    high: 555,
    expected: 538,
    low: 485,
    confidence: 78,
    insight: "SPY in a steady uptrend with low VIX environment. Breadth improving with equal-weight outperformance. Fed pause narrative supportive. Tight probability cone reflects low vol regime — 78% confidence in $538 target.",
  },
};

const months = ["Jan", "Feb", "Mar"];
const futureMonths = ["Apr", "May", "Jun"];

type RealAnalysis = {
  ticker: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  week52High: number;
  week52Low: number;
  analystTarget: number;
  analystConsensus: string;
  sentiment: string;
  outlook: string;
  risks: string[];
  catalysts: string[];
  dataAsOf: string;
  priceTargets?: {
    thirtyDay?: { low: number; base: number; high: number };
    ninetyDay?: { low: number; base: number; high: number };
    oneYear?: { low: number; base: number; high: number };
  };
  history?: { label: string; price: number }[];
};

function ChartSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(16,185,129,0.12)", background: "#060f0b", height: "320px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.04) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
      <svg viewBox="0 0 700 320" width="100%" height="320" style={{ opacity: 0.15 }}>
        <path d="M 55 200 Q 100 180 150 190 Q 200 170 245 160" fill="none" stroke="white" strokeWidth="2" />
        <path d="M 245 160 L 500 80" fill="none" stroke="rgba(16,185,129,1)" strokeWidth="1.5" />
        <path d="M 245 160 L 500 240" fill="none" stroke="rgba(239,68,68,1)" strokeWidth="1.5" />
        <path d="M 245 160 L 700 40" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,3" />
        <path d="M 245 160 L 700 280" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="245" y1="45" x2="245" y2="290" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <circle cx="245" cy="160" r="5" fill="rgba(255,255,255,0.4)" />
      </svg>
      <div style={{ position: "absolute", top: 0, bottom: 0, width: "2px", background: "linear-gradient(to bottom, transparent, rgba(45,212,191,0.6), transparent)", animation: "scan 2s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", fontSize: "11px", color: "rgba(45,212,191,0.5)", fontFamily: "monospace", letterSpacing: "0.1em" }}>
        SEARCHING LIVE MARKET DATA...
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes scan{0%{left:10%}50%{left:85%}100%{left:10%}}`}</style>
    </div>
  );
}

function FlashlightChart({ analysis }: { analysis: RealAnalysis }) {
  const W = 700, H = 320;
  const padL = 55, padR = 70, padT = 45, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const price = analysis.currentPrice ?? 0;
  const pt = analysis.priceTargets;
  const d30 = pt?.thirtyDay ?? { low: price * 0.95, base: price * 1.02, high: price * 1.05 };
  const d90 = pt?.ninetyDay ?? { low: price * 0.88, base: price * 1.05, high: price * 1.12 };
  const d365 = pt?.oneYear ?? { low: price * 0.75, base: price * 1.10, high: price * 1.25 };

  const hist = analysis.history?.length ? analysis.history.map((h) => h.price) : [price, price, price, price, price, price];
  const histLabels = analysis.history?.length ? analysis.history.map((h) => h.label.replace(" ago", "")) : ["30d", "21d", "14d", "7d", "3d", "NOW"];

  const allP = [...hist, price, d30.low, d30.high, d90.low, d90.high, d365.low * 0.95, d365.high * 1.05];
  const minP = Math.min(...allP) * 0.97;
  const maxP = Math.max(...allP) * 1.03;

  const toY = (p: number) => padT + chartH - ((p - minP) / (maxP - minP)) * chartH;
  const todayX = padL + chartW * 0.35;
  const histXStep = (todayX - padL) / (hist.length - 1);
  const histPoints = hist.map((p, i) => ({ x: padL + i * histXStep, y: toY(p) }));

  let histPath = `M ${histPoints[0].x} ${histPoints[0].y}`;
  for (let i = 1; i < histPoints.length; i++) {
    const prev = histPoints[i - 1], curr = histPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    histPath += ` Q ${prev.x + (cpx - prev.x) * 0.8} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
    histPath += ` Q ${curr.x - (curr.x - cpx) * 0.8} ${curr.y} ${curr.x} ${curr.y}`;
  }

  const coneW = padL + chartW - todayX;
  const coneX = (t: number) => todayX + (t / 3) * coneW;
  const cp = [
    { t: 0, low: price, base: price, high: price },
    { t: 1, ...d30 }, { t: 2, ...d90 }, { t: 3, ...d365 },
  ];
  const ip = [{ t: 0, low: price, base: price, high: price }, { t: 1, ...d30 }, { t: 2, ...d90 }];

  const poly = (pts: typeof cp, getHi: (p: typeof cp[0]) => number, getLo: (p: typeof cp[0]) => number) =>
    [...pts.map((p) => `${coneX(p.t)},${toY(getHi(p))}`), ...[...pts].reverse().map((p) => `${coneX(p.t)},${toY(getLo(p))}`)].join(" ");
  const line = (pts: typeof cp, getV: (p: typeof cp[0]) => number) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${coneX(p.t)} ${toY(getV(p))}`).join(" ");

  const changePos = (analysis.change ?? 0) >= 0;
  const changeStr = `${changePos ? "+" : ""}${typeof analysis.change === "number" ? analysis.change.toFixed(2) : "0"} (${typeof analysis.changePercent === "number" ? analysis.changePercent.toFixed(2) : "0"}%)`;

  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const p = minP + (maxP - minP) * (i / ySteps);
    return { y: toY(p), label: `$${Math.round(p)}` };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", background: "#060f0b" }}>
      <polygon points={poly(cp, (p) => p.high * 1.05, (p) => p.low * 0.95)} fill="rgba(255,255,255,0.03)" />
      <polygon points={poly(cp, (p) => p.high, (p) => p.base)} fill="rgba(16,185,129,0.08)" />
      <polygon points={poly(cp, (p) => p.base, (p) => p.low)} fill="rgba(239,68,68,0.08)" />
      <path d={line(cp, (p) => p.high)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
      <path d={line(cp, (p) => p.low)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
      <polygon points={poly(ip, (p) => p.high, (p) => p.base)} fill="rgba(16,185,129,0.15)" />
      <polygon points={poly(ip, (p) => p.base, (p) => p.low)} fill="rgba(239,68,68,0.12)" />
      <path d={line(ip, (p) => p.high)} fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" />
      <path d={line(ip, (p) => p.low)} fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" />
      <path d={line(cp, (p) => p.base)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4,4" />
      <path d={histPath} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      {histPoints.map((hp, i) => <circle key={i} cx={hp.x} cy={hp.y} r="2.5" fill="rgba(255,255,255,0.5)" />)}
      <line x1={todayX} y1={padT} x2={todayX} y2={padT + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <text x={todayX} y={padT - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="monospace">TODAY</text>
      <circle cx={todayX} cy={toY(price)} r="5" fill="white" />
      {histLabels.map((lbl, i) => <text key={i} x={padL + i * histXStep} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">{lbl}</text>)}
      <text x={coneX(1)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">30D</text>
      <text x={coneX(2)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">90D</text>
      <text x={coneX(3)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">1YR</text>
      <text x={W - 6} y={toY(d365.high) + 3} textAnchor="end" fontSize="9" fill="rgba(16,185,129,0.7)" fontFamily="monospace">${Math.round(d365.high)}</text>
      <text x={W - 6} y={toY(d365.base) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="monospace">${Math.round(d365.base)}</text>
      <text x={W - 6} y={toY(d365.low) + 3} textAnchor="end" fontSize="9" fill="rgba(239,68,68,0.7)" fontFamily="monospace">${Math.round(d365.low)}</text>
      {yLabels.map((yl, i) => <text key={i} x={padL - 6} y={yl.y + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">{yl.label}</text>)}
      <text x={padL} y={18} fontSize="11" fontWeight="bold" fill="rgba(45,212,191,0.85)" fontFamily="monospace">{analysis.ticker}</text>
      <text x={padL + 50} y={18} fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="monospace">{analysis.companyName}</text>
      <text x={W - 6} y={18} textAnchor="end" fontSize="12" fontWeight="bold" fill="white" fontFamily="monospace">${price.toFixed(2)}</text>
      <text x={W - 6} y={32} textAnchor="end" fontSize="10" fill={changePos ? "rgba(16,185,129,0.8)" : "rgba(239,68,68,0.8)"} fontFamily="monospace">{changeStr}</text>
    </svg>
  );
}

export function MarketLensPanel({ displayName, balanceCredits }: MarketLensPanelProps) {
  const [query, setQuery] = useState("");
  const [activeTicker, setActiveTicker] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(false);
  // Canvas removed — using SVG chart
  const [realAnalysis, setRealAnalysis] = useState<RealAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [balance, setBalance] = useState(balanceCredits);

  async function handleAnalyze() {
    const symbol = query.trim().toUpperCase();
    if (!symbol) return;

    // Clear all previous state
    setActiveTicker(null);
    setRealAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(true);

    try {
      const res = await fetch("/api/services/market-lens/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, analysisType: "full" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");

      // Deduct Leafs on success
      const spendRes = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 8, description: `Market Lens \u2014 ${symbol}`, serviceId: "market-lens" }),
      });
      const spendData = await spendRes.json();
      if (spendData.ok) {
        setBalance(spendData.newBalance);
        window.dispatchEvent(new CustomEvent("eden:balance-updated", { detail: { newBalance: spendData.newBalance } }));
      }

      setRealAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAnalyze();
  }

  // Suppress unused activeTicker from old mock flow
  void activeTicker;

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.15)] focus:border-[rgba(16,185,129,0.45)] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]";

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#060f0b" }}>
      <ServiceLoadingBar loading={analysisLoading} />
      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/consumer"
          className="text-xs uppercase tracking-[0.14em] transition-colors hover:text-white"
          style={{ color: ML_GREEN }}
        >
          &#8592; Eden
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{displayName}</span>
          <span
            className="rounded-full px-3 py-1 font-mono text-xs font-semibold text-white"
            style={{ border: `1px solid ${ML_CARD_BORDER}`, background: ML_GREEN_DIM }}
          >
            🍃 {balanceCredits.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
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
              background: "radial-gradient(circle at 35% 25%, rgba(16,185,129,0.2), rgba(6,15,11,0.97))",
              border: `2px solid ${ML_GREEN}`,
              color: ML_GREEN,
              boxShadow: "0 0 24px -4px rgba(16,185,129,0.35)",
            }}
          >
            ML
          </div>
          <div>
            <h1 className="text-3xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              <span style={{ color: ML_GREEN }}>Market</span> Lens
            </h1>
            <p className="mt-1 text-sm text-white/50">
              See where the market is going.{" "}
              <span className="text-white/30">Powered by Claude</span>
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mt-8"
        >
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search ticker... AAPL, TSLA, NVDA, BTC, SPY"
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analysisLoading || !query.trim()}
              className="shrink-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: ML_GREEN, color: "#060f0b" }}
            >
              {analysisLoading ? "Analyzing..." : "Analyze — 8 🍃"}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        {analysisError && (
          <p className="mt-4 text-center text-xs text-red-400/70">{analysisError}</p>
        )}
        <AnimatePresence mode="wait">
          {analysisLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
              <ChartSkeleton />
              <p className="mt-3 text-center text-xs text-white/30">Claude is searching live market data...</p>
            </motion.div>
          ) : realAnalysis ? (
            <motion.div key={realAnalysis.ticker} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-4"
            >
              {/* Price + Company */}
              <div className="rounded-xl p-5" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{realAnalysis.companyName}</p>
                    <p className="text-xs text-white/40">{realAnalysis.ticker}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">${typeof realAnalysis.currentPrice === "number" ? realAnalysis.currentPrice.toFixed(2) : realAnalysis.currentPrice}</p>
                    <p className={`text-sm font-semibold ${(realAnalysis.change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(realAnalysis.change ?? 0) >= 0 ? "+" : ""}{typeof realAnalysis.change === "number" ? realAnalysis.change.toFixed(2) : realAnalysis.change} ({typeof realAnalysis.changePercent === "number" ? realAnalysis.changePercent.toFixed(2) : realAnalysis.changePercent}%)
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: realAnalysis.sentiment === "Bullish" ? "rgba(16,185,129,0.15)" : realAnalysis.sentiment === "Bearish" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: realAnalysis.sentiment === "Bullish" ? ML_GREEN : realAnalysis.sentiment === "Bearish" ? ML_RED : ML_AMBER,
                    }}
                  >
                    {realAnalysis.sentiment}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: realAnalysis.analystConsensus?.includes("Buy") ? "rgba(16,185,129,0.15)" : realAnalysis.analystConsensus?.includes("Sell") ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: realAnalysis.analystConsensus?.includes("Buy") ? ML_GREEN : realAnalysis.analystConsensus?.includes("Sell") ? ML_RED : ML_AMBER,
                    }}
                  >
                    {realAnalysis.analystConsensus}
                  </span>
                </div>
              </div>

              {/* SVG Flashlight chart */}
              <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${ML_CARD_BORDER}` }}>
                <FlashlightChart analysis={realAnalysis} />
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Market Cap", value: realAnalysis.marketCap },
                  { label: "P/E Ratio", value: realAnalysis.peRatio },
                  { label: "Analyst Target", value: `$${realAnalysis.analystTarget}` },
                  { label: "52W High", value: `$${realAnalysis.week52High}` },
                  { label: "52W Low", value: `$${realAnalysis.week52Low}` },
                  { label: "Data As Of", value: realAnalysis.dataAsOf ? new Date(realAnalysis.dataAsOf).toLocaleDateString() : "Today" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg p-2.5" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                    <p className="text-[10px] text-white/30">{m.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/70">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Outlook */}
              <div className="rounded-xl p-4" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: ML_GREEN }}>Outlook</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{realAnalysis.outlook}</p>
              </div>

              {/* Catalysts + Risks */}
              <div className="grid grid-cols-2 gap-3">
                {realAnalysis.catalysts?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Catalysts</p>
                    <ul className="mt-2 space-y-1">
                      {realAnalysis.catalysts.map((c, i) => (
                        <li key={i} className="text-xs text-white/50">+ {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {realAnalysis.risks?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                    <p className="text-[10px] uppercase tracking-wider text-red-400/70">Risks</p>
                    <ul className="mt-2 space-y-1">
                      {realAnalysis.risks.map((r, i) => (
                        <li key={i} className="text-xs text-white/50">- {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="text-center text-[10px] text-white/15">
                Analysis by Claude Sonnet + Live Web Data
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 text-center"
            >
              <p className="text-sm text-white/30">
                Enter any ticker — AAPL, TSLA, BTC, NVDA, SPY...
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["AAPL", "TSLA", "NVDA", "BTC", "SPY"].map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => { setQuery(symbol); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{ border: `1px solid ${ML_CARD_BORDER}`, color: ML_GREEN, background: ML_GREEN_DIM }}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

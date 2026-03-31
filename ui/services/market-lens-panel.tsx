"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

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
};

export function MarketLensPanel({ displayName, balanceCredits }: MarketLensPanelProps) {
  const [query, setQuery] = useState("");
  const [activeTicker, setActiveTicker] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [realAnalysis, setRealAnalysis] = useState<RealAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [balance, setBalance] = useState(balanceCredits);

  async function handleRealAnalysis() {
    const symbol = query.trim().toUpperCase() || activeTicker?.symbol;
    if (!symbol) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      // 1. Call real analysis API with web search
      const res = await fetch("/api/services/market-lens/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, analysisType: "full" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");

      // 2. Deduct Leafs
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

  function handleSearch() {
    const symbol = query.trim().toUpperCase();
    const match = mockTickers[symbol];
    if (!match) return;
    setLoading(true);
    setTimeout(() => {
      setActiveTicker(match);
      setLoading(false);
    }, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeTicker) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    // Layout
    const padLeft = 60;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 50;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const historyRatio = 0.55;
    const historyW = chartW * historyRatio;
    const coneW = chartW * (1 - historyRatio);

    const { history, volume, high, expected, low, currentPrice } = activeTicker;
    const allPrices = [...history, high, low];
    const minP = Math.min(...allPrices) * 0.97;
    const maxP = Math.max(...allPrices) * 1.03;
    const priceToY = (p: number) => padTop + chartH - ((p - minP) / (maxP - minP)) * chartH;

    // Grid lines
    ctx.strokeStyle = "rgba(16,185,129,0.07)";
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padTop + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      const price = maxP - ((maxP - minP) / gridSteps) * i;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(price >= 1000 ? `$${(price / 1000).toFixed(1)}K` : `$${price.toFixed(0)}`, padLeft - 8, y + 4);
    }

    // X axis labels — history months
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < months.length; i++) {
      const x = padLeft + (historyW / months.length) * (i + 0.5);
      ctx.fillText(months[i], x, H - padBottom + 20);
    }
    // Future months
    for (let i = 0; i < futureMonths.length; i++) {
      const x = padLeft + historyW + (coneW / futureMonths.length) * (i + 0.5);
      ctx.fillText(futureMonths[i], x, H - padBottom + 20);
    }

    // Volume bars
    const maxVol = Math.max(...volume);
    const volH = chartH * 0.15;
    for (let i = 0; i < volume.length; i++) {
      const barW = historyW / volume.length;
      const barH = (volume[i] / maxVol) * volH;
      const x = padLeft + barW * i;
      const y = padTop + chartH - barH;
      ctx.fillStyle = "rgba(16,185,129,0.12)";
      ctx.fillRect(x, y, barW - 1, barH);
    }

    // Price line
    const stepX = historyW / (history.length - 1);
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = padLeft + stepX * i;
      const y = priceToY(history[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = ML_GREEN;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gradient fill below line
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    gradient.addColorStop(0, "rgba(16,185,129,0.25)");
    gradient.addColorStop(1, "rgba(16,185,129,0)");
    ctx.lineTo(padLeft + historyW, padTop + chartH);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Current price dot
    const curX = padLeft + historyW;
    const curY = priceToY(currentPrice);
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI * 2);
    ctx.fillStyle = ML_GREEN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(curX, curY, 9, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16,185,129,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current price label
    ctx.fillStyle = ML_GREEN;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    const priceLabel = currentPrice >= 1000 ? `$${currentPrice.toLocaleString()}` : `$${currentPrice.toFixed(2)}`;
    ctx.fillText(priceLabel, curX + 14, curY + 4);

    // ── PROBABILITY CONE ──
    const coneStartX = curX;
    const coneEndX = padLeft + chartW;
    const highY = priceToY(high);
    const expectedY = priceToY(expected);
    const lowY = priceToY(low);

    // Outer cone (red — unlikely)
    const outerGrad = ctx.createLinearGradient(coneStartX, 0, coneEndX, 0);
    outerGrad.addColorStop(0, "rgba(239,68,68,0)");
    outerGrad.addColorStop(1, "rgba(239,68,68,0.15)");
    ctx.beginPath();
    ctx.moveTo(coneStartX, curY);
    ctx.lineTo(coneEndX, highY);
    ctx.lineTo(coneEndX, lowY);
    ctx.closePath();
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // Middle band (amber — possible)
    const midHighY = priceToY(expected + (high - expected) * 0.5);
    const midLowY = priceToY(expected - (expected - low) * 0.5);
    const midGrad = ctx.createLinearGradient(coneStartX, 0, coneEndX, 0);
    midGrad.addColorStop(0, "rgba(245,158,11,0)");
    midGrad.addColorStop(1, "rgba(245,158,11,0.35)");
    ctx.beginPath();
    ctx.moveTo(coneStartX, curY);
    ctx.lineTo(coneEndX, midHighY);
    ctx.lineTo(coneEndX, midLowY);
    ctx.closePath();
    ctx.fillStyle = midGrad;
    ctx.fill();

    // Center band (green — most probable)
    const innerHighY = priceToY(expected + (high - expected) * 0.15);
    const innerLowY = priceToY(expected - (expected - low) * 0.15);
    const innerGrad = ctx.createLinearGradient(coneStartX, 0, coneEndX, 0);
    innerGrad.addColorStop(0, "rgba(16,185,129,0)");
    innerGrad.addColorStop(1, "rgba(16,185,129,0.6)");
    ctx.beginPath();
    ctx.moveTo(coneStartX, curY);
    ctx.lineTo(coneEndX, innerHighY);
    ctx.lineTo(coneEndX, innerLowY);
    ctx.closePath();
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // Dashed center line (expected)
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(coneStartX, curY);
    ctx.lineTo(coneEndX, expectedY);
    ctx.strokeStyle = ML_GREEN;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Right edge labels
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    const formatPrice = (p: number) => p >= 1000 ? `$${(p / 1000).toFixed(1)}K` : `$${p.toFixed(0)}`;

    ctx.fillStyle = ML_RED;
    ctx.fillText(`High ${formatPrice(high)}`, coneEndX - 4, highY - 6);
    ctx.fillStyle = ML_GREEN;
    ctx.fillText(`Expected ${formatPrice(expected)}`, coneEndX - 4, expectedY - 6);
    ctx.fillStyle = ML_RED;
    ctx.fillText(`Low ${formatPrice(low)}`, coneEndX - 4, lowY + 16);

    // Now/Future divider
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(curX, padTop);
    ctx.lineTo(curX, padTop + chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NOW", curX, padTop + chartH + 14);
  }, [activeTicker]);

  useEffect(() => {
    drawChart();
    function handleResize() { drawChart(); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawChart]);

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.15)] focus:border-[rgba(16,185,129,0.45)] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]";

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#060f0b" }}>
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
            &#127809; {balanceCredits.toLocaleString()}
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
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="shrink-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: ML_GREEN, color: "#060f0b" }}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </motion.div>

        {/* Chart area */}
        <AnimatePresence mode="wait">
          {activeTicker ? (
            <motion.div
              key={activeTicker.symbol}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {/* Ticker header */}
              <div
                className="flex items-center justify-between rounded-t-[20px] px-6 py-4"
                style={{ background: ML_CARD_BG, borderTop: `1px solid ${ML_CARD_BORDER}`, borderLeft: `1px solid ${ML_CARD_BORDER}`, borderRight: `1px solid ${ML_CARD_BORDER}` }}
              >
                <div>
                  <span className="text-lg font-bold text-white">{activeTicker.symbol}</span>
                  <span className="ml-3 text-sm text-white/40">{activeTicker.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold" style={{ color: ML_GREEN }}>
                    {activeTicker.currentPrice >= 1000
                      ? `$${activeTicker.currentPrice.toLocaleString()}`
                      : `$${activeTicker.currentPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Canvas chart */}
              <div
                className="overflow-hidden"
                style={{ background: ML_CARD_BG, borderLeft: `1px solid ${ML_CARD_BORDER}`, borderRight: `1px solid ${ML_CARD_BORDER}` }}
              >
                <canvas
                  ref={canvasRef}
                  className="h-[320px] w-full"
                  style={{ display: "block" }}
                />
              </div>

              {/* Analysis card */}
              <div
                className="rounded-b-[20px] px-6 py-5"
                style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}
              >
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: ML_GREEN }}>
                  Claude&apos;s Analysis
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {activeTicker.insight}
                </p>
                <div
                  className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: ML_GREEN_DIM, border: `1px solid ${ML_CARD_BORDER}` }}
                >
                  <span className="text-xs text-white/50">Confidence Score</span>
                  <span className="text-sm font-semibold" style={{ color: ML_GREEN }}>
                    {activeTicker.confidence}% confidence in projected range
                  </span>
                </div>
              </div>

              {/* Deep Analysis button — real web data */}
              <button
                type="button"
                onClick={handleRealAnalysis}
                disabled={analysisLoading}
                className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: ML_GREEN, color: "#060f0b" }}
              >
                {analysisLoading ? "Analyzing with live data..." : `Deep Analysis — 8 🍃`}
              </button>
              {analysisError && (
                <p className="mt-2 text-center text-xs text-red-400/70">{analysisError}</p>
              )}

              {/* Real analysis results */}
              {realAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  <div className="rounded-xl p-4" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">{realAnalysis.companyName}</p>
                        <p className="text-xs text-white/40">{realAnalysis.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">${realAnalysis.currentPrice?.toFixed(2)}</p>
                        <p className={`text-sm font-semibold ${(realAnalysis.change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(realAnalysis.change ?? 0) >= 0 ? "+" : ""}{realAnalysis.change?.toFixed(2)} ({realAnalysis.changePercent?.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-white/30">Market Cap</p>
                        <p className="text-xs font-semibold text-white/70">{realAnalysis.marketCap}</p>
                      </div>
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-white/30">P/E Ratio</p>
                        <p className="text-xs font-semibold text-white/70">{realAnalysis.peRatio}</p>
                      </div>
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-white/30">52W Range</p>
                        <p className="text-xs font-semibold text-white/70">${realAnalysis.week52Low} — ${realAnalysis.week52High}</p>
                      </div>
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-white/30">Analyst Target</p>
                        <p className="text-xs font-semibold text-white/70">${realAnalysis.analystTarget}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: realAnalysis.analystConsensus === "Buy" ? "rgba(16,185,129,0.15)" : realAnalysis.analystConsensus === "Sell" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                          color: realAnalysis.analystConsensus === "Buy" ? ML_GREEN : realAnalysis.analystConsensus === "Sell" ? ML_RED : ML_AMBER,
                          border: `1px solid ${realAnalysis.analystConsensus === "Buy" ? "rgba(16,185,129,0.3)" : realAnalysis.analystConsensus === "Sell" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                        }}
                      >
                        {realAnalysis.analystConsensus}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: realAnalysis.sentiment === "Bullish" ? "rgba(16,185,129,0.15)" : realAnalysis.sentiment === "Bearish" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                          color: realAnalysis.sentiment === "Bullish" ? ML_GREEN : realAnalysis.sentiment === "Bearish" ? ML_RED : "rgba(255,255,255,0.5)",
                          border: `1px solid ${realAnalysis.sentiment === "Bullish" ? "rgba(16,185,129,0.3)" : realAnalysis.sentiment === "Bearish" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                        }}
                      >
                        {realAnalysis.sentiment}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ background: ML_CARD_BG, border: `1px solid ${ML_CARD_BORDER}` }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: ML_GREEN }}>Outlook</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{realAnalysis.outlook}</p>
                  </div>

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

                  <p className="text-center text-[10px] text-white/15">
                    Powered by Claude + Live Web Data
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : !loading ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 text-center"
            >
              <p className="text-sm text-white/30">
                Enter a ticker symbol to see its price history and Claude&apos;s probability cone projection.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {Object.keys(mockTickers).map((symbol) => (
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

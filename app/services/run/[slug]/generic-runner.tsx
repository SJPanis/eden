"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceLoadingBar } from "@/components/service-loading-bar";

type ServiceInfo = { slug: string; name: string; description: string; leafCost: number; thumbnailColor: string };

export function GenericServiceRunner({ slug, balance: initialBalance }: { slug: string; balance: number }) {
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    fetch(`/api/services/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setService(d); })
      .catch(() => {});
  }, [slug]);

  async function handleRun() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/services/${slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult(data.result);
      setBalance(data.newBalance);
      window.dispatchEvent(new CustomEvent("eden:balance-updated", { detail: { newBalance: data.newBalance } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service run failed");
    } finally {
      setLoading(false);
    }
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0b1622" }}>
        <p className="text-xs text-white/20 font-mono">Loading service...</p>
      </div>
    );
  }

  const accent = service.thumbnailColor || "#2dd4bf";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      <ServiceLoadingBar loading={loading} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">&larr; Eden</Link>
          <span className="text-xs text-white/30">{"🍃"} {balance.toLocaleString()}</span>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>{service.name}</h1>
          <p className="mt-1 text-sm text-white/40">{service.description}</p>
          <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]" style={{ background: `${accent}15`, color: accent }}>
            {service.leafCost} {"🍃"} per use
          </span>
        </div>

        <div className="mt-8 space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your request..."
            rows={4}
            className="w-full resize-y rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
          />
          <button
            type="button"
            onClick={handleRun}
            disabled={!input.trim() || loading}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: accent, color: "#0b1622" }}
          >
            {loading ? "Running..." : `Run \u2014 ${service.leafCost} 🍃`}
          </button>
        </div>

        {error && <p className="mt-4 text-center text-xs text-red-400/70">{error}</p>}

        {result && (
          <div className="mt-6 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] uppercase tracking-wider text-white/30">Result</p>
            <div className="mt-3 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
}

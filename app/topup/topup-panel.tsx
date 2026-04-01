"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PACKAGES = [
  { id: "starter", name: "Starter", leafs: 275, price: "$10", detail: "10% bonus — best for trying services" },
  { id: "balanced", name: "Balanced", leafs: 1150, price: "$35", detail: "15% bonus — best for regular use", recommended: true },
  { id: "highbalance", name: "High Balance", leafs: 3250, price: "$80", detail: "30% bonus — best value per Leaf" },
];

export function TopUpPanel({ balance }: { balance: number }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("topped_up") === "true";

  async function handleBuy(packageId: string) {
    setLoading(packageId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout");
      }
    } catch {
      setError("Checkout failed. Try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      <div className="mx-auto max-w-lg px-4 py-12">
        <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">
          &larr; Back to Eden
        </Link>

        <h1 className="mt-8 text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
          Top Up Leafs
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Current balance: <span className="font-semibold text-[#2dd4bf]">{balance.toLocaleString()} 🍃</span>
        </p>

        {success && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", color: "#2dd4bf" }}>
            🍃 Leafs added to your account!
          </div>
        )}

        <div className="mt-8 space-y-4">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleBuy(pkg.id)}
              disabled={!!loading}
              className="w-full rounded-2xl p-5 text-left transition-all hover:bg-white/[0.04]"
              style={{
                border: pkg.recommended ? "1px solid rgba(45,212,191,0.3)" : "1px solid rgba(255,255,255,0.06)",
                background: pkg.recommended ? "rgba(45,212,191,0.06)" : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">{pkg.name}</span>
                    {pkg.recommended && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/40">{pkg.detail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{pkg.price}</p>
                  <p className="text-xs text-[#2dd4bf]">{pkg.leafs.toLocaleString()} 🍃</p>
                </div>
              </div>
              {loading === pkg.id && (
                <p className="mt-2 text-xs text-amber-400/60">Opening Stripe checkout...</p>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-red-400/70">{error}</p>
        )}

        <p className="mt-8 text-center text-[10px] text-white/15">
          Payments processed securely by Stripe. Leafs are added instantly after payment.
        </p>
      </div>
    </div>
  );
}

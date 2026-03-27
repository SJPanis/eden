"use client";

import { useState } from "react";
import Link from "next/link";

type PayWithEdenProps = {
  serviceId: string;
  serviceName: string;
  leafCost: number;
  onSuccess: (result: { newBalance: number }) => void;
  disabled?: boolean;
  loadingLabel?: string;
};

const PACKAGES = [
  { id: "credits-275", label: "Starter", price: "$10", leafs: "275", detail: "10% bonus" },
  { id: "credits-1150", label: "Balanced", price: "$35", leafs: "1,150", detail: "15% bonus" },
  { id: "credits-3250", label: "High Balance", price: "$80", leafs: "3,250", detail: "30% bonus" },
];

export function PayWithEden({
  serviceId,
  serviceName,
  leafCost,
  onSuccess,
  disabled = false,
  loadingLabel,
}: PayWithEdenProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [leafLoading, setLeafLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePayWithLeafs() {
    setLeafLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: leafCost,
          description: `${serviceName} run`,
          serviceId,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "Insufficient Leaf balance") {
          setError(`You need ${data.required - data.balance} more Leaf's`);
          setShowTopUp(true);
        } else {
          setError(data.error ?? "Payment failed");
        }
        return;
      }
      window.dispatchEvent(
        new CustomEvent("eden:balance-updated", { detail: { newBalance: data.newBalance } }),
      );
      onSuccess({ newBalance: data.newBalance });
    } catch {
      setError("Payment failed. Try again.");
    } finally {
      setLeafLoading(false);
    }
  }

  async function handlePackageSelect(packageId: string) {
    setCardLoading(packageId);
    setError(null);
    try {
      const res = await fetch("/api/credits/top-up/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: window.location.pathname + "?topup=success",
          packageId,
        }),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error ?? "Could not create checkout session");
      }
    } catch {
      setError("Checkout failed. Try again.");
    } finally {
      setCardLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {/* Pay with Leafs */}
      <button
        type="button"
        onClick={handlePayWithLeafs}
        disabled={disabled || leafLoading}
        className="w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: "#2dd4bf", color: "#060e1a" }}
      >
        {leafLoading
          ? "Processing..."
          : loadingLabel
            ? loadingLabel
            : `\ud83c\udf43 Pay with Leaf's (${leafCost} \ud83c\udf43)`}
      </button>

      {/* Pay with Card */}
      <button
        type="button"
        onClick={() => setShowTopUp(!showTopUp)}
        disabled={disabled}
        className="w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all"
        style={{
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        \ud83d\udcb3 Pay with Card
      </button>

      {/* Powered by Eden */}
      <p className="text-center text-[10px] text-white/20">
        Powered by{" "}
        <Link href="https://edencloud.app" className="text-[#2dd4bf]/40 hover:text-[#2dd4bf]/60 transition-colors">
          \ud83c\udf3f Eden
        </Link>
      </p>

      {/* Error */}
      {error && (
        <p className="text-center text-xs text-red-400/80">{error}</p>
      )}

      {/* Top-up package modal */}
      {showTopUp && (
        <div
          className="mt-2 rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(6,14,26,0.95)",
            border: "1px solid rgba(45,212,191,0.12)",
          }}
        >
          <p className="text-xs font-semibold text-white/60">Choose a Leaf package</p>
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handlePackageSelect(pkg.id)}
              disabled={!!cardLoading}
              className="w-full rounded-lg p-3 text-left transition-all hover:bg-white/[0.04]"
              style={{ border: "1px solid rgba(45,212,191,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-white">{pkg.label}</span>
                  <span className="ml-2 text-xs text-white/40">{pkg.detail}</span>
                </div>
                <span className="text-sm font-semibold text-white">{pkg.price}</span>
              </div>
              <p className="mt-1 text-xs text-[#2dd4bf]/60">{pkg.leafs} Leaf&apos;s</p>
              {cardLoading === pkg.id && (
                <p className="mt-1 text-xs text-amber-400/60">Opening checkout...</p>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowTopUp(false)}
            className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            close
          </button>
        </div>
      )}
    </div>
  );
}

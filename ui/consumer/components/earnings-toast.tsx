"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Toast = { id: string; amount: number };

export function EarningsToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/wallet/balance");
        const data = (await res.json()) as { ok?: boolean; balance?: number };
        if (cancelled || !data.ok || typeof data.balance !== "number") return;
        const current = data.balance;

        if (lastBalanceRef.current === null) {
          lastBalanceRef.current = current;
          return;
        }

        if (current > lastBalanceRef.current) {
          const earned = current - lastBalanceRef.current;
          const id = `toast-${Date.now()}`;
          setToasts((t) => [...t, { id, amount: earned }]);
          setTimeout(() => {
            setToasts((t) => t.filter((toast) => toast.id !== id));
          }, 5000);
        }
        lastBalanceRef.current = current;
      } catch {
        // ignore
      }
    }

    void poll();
    const interval = setInterval(() => { void poll(); }, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[250] flex flex-col-reverse gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{
              background: "rgba(13, 30, 46, 0.95)",
              border: "1px solid rgba(45, 212, 191, 0.4)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 40px -8px rgba(45, 212, 191, 0.5)",
            }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(45, 212, 191, 0.2)" }}
            >
              🍃
            </div>
            <div>
              <p className="text-sm font-bold text-[#2dd4bf]" style={{ fontVariantNumeric: "tabular-nums" }}>
                +{toast.amount} Leafs earned
              </p>
              <p className="text-xs text-white/50">Someone ran your service</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function WelcomeScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("eden_welcomed")) return;
    setShow(true);
    // Claim welcome Leafs
    fetch("/api/user/welcome-grant", { method: "POST" }).catch(() => {});
  }, []);

  function handleDismiss() {
    localStorage.setItem("eden_welcomed", "true");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(11,22,34,0.96)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md w-full mx-4 text-center"
          >
            {/* Logo mark */}
            <div className="flex justify-center mb-6">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)" }}
              >
                <span style={{ color: "#2dd4bf", fontSize: 20 }}>{"🌿"}</span>
              </div>
            </div>

            <h1
              className="text-4xl font-bold text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Welcome to Eden.
            </h1>

            <p className="mt-3 text-lg" style={{ color: "#2dd4bf" }}>
              You have been given 5 free Leafs to get started.
            </p>

            <div className="mt-8 space-y-4 text-left mx-auto max-w-xs">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{"🌿"}</span>
                <p className="text-sm text-white/60">Run AI services — pay with Leafs</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{"🔨"}</span>
                <p className="text-sm text-white/60">Build your own service — earn Leafs forever</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{"💰"}</span>
                <p className="text-sm text-white/60">Improve services — earn a share of every run</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-10 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#2dd4bf", color: "#0b1622" }}
            >
              Enter the Garden &rarr;
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

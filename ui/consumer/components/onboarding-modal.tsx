"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type OnboardingModalProps = {
  initialOpen: boolean;
};

const FEATURED_SERVICES = [
  { slug: "resume-roast", name: "Resume Roast", desc: "Get brutally honest feedback on your resume", color: "#ef4444" },
  { slug: "cold-email-writer", name: "Cold Email Writer", desc: "Generate 3 personalized cold emails", color: "#3b82f6" },
  { slug: "side-hustle-finder", name: "Side Hustle Finder", desc: "5 ways to make money this week", color: "#f59e0b" },
];

export function OnboardingModal({ initialOpen }: OnboardingModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(1);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (step !== 1) return;
    let current = 0;
    const target = 50;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        setCounter(target);
        clearInterval(interval);
      } else {
        setCounter(current);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [step]);

  async function handleDismiss() {
    setOpen(false);
    await fetch("/api/user/onboarding-complete", { method: "POST" }).catch(() => {});
  }

  function handleTryService(slug: string) {
    void handleDismiss();
    router.push(`/services/run/${slug}`);
  }

  function handleBuildService() {
    void handleDismiss();
    router.push("/services/create");
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center px-4"
        style={{ background: "rgba(11, 22, 34, 0.92)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl rounded-3xl p-8 md:p-10"
          style={{
            background: "rgba(13, 30, 46, 0.95)",
            border: "1px solid rgba(45, 212, 191, 0.2)",
            boxShadow: "0 0 80px -20px rgba(45, 212, 191, 0.4)",
          }}
        >
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: s === step ? 24 : 8,
                  background: s <= step ? "#2dd4bf" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                Welcome to Eden
              </p>
              <h2 className="mt-3 text-4xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                You&apos;re in.
              </h2>
              <p className="mt-3 text-sm text-white/50">
                You have <span className="text-[#2dd4bf] font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{counter}</span> free Leafs to spend.
              </p>
              <p className="mt-6 text-sm text-white/40 leading-relaxed">
                Eden is a marketplace of AI services. You can run services with your Leafs,
                or build your own and earn Leafs back. Every Leaf is worth ~$0.03 USD.
              </p>
              <button
                onClick={() => setStep(2)}
                className="mt-8 rounded-full px-8 py-3 text-sm font-semibold text-white transition-all"
                style={{
                  background: "rgba(45,212,191,0.85)",
                  boxShadow: "0 0 30px -8px rgba(45,212,191,0.5)",
                }}
              >
                Show me what I can do →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/40 text-center">
                Step 2 of 3
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white text-center" style={{ fontFamily: "var(--font-serif)" }}>
                Run your first service
              </h2>
              <p className="mt-3 text-sm text-white/50 text-center">
                Tap any of these to try it. They cost just a few Leafs.
              </p>
              <div className="mt-6 space-y-3">
                {FEATURED_SERVICES.map((svc) => (
                  <button
                    key={svc.slug}
                    onClick={() => handleTryService(svc.slug)}
                    className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: `${svc.color}10`,
                      border: `1px solid ${svc.color}30`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{svc.name}</p>
                        <p className="text-xs text-white/50 mt-0.5">{svc.desc}</p>
                      </div>
                      <span className="text-[#2dd4bf] text-sm">→</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Skip for now →
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                One more thing
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                Or build your own
              </h2>
              <p className="mt-3 text-sm text-white/50 leading-relaxed">
                Every time someone runs your service, you earn 70% of their Leafs.
                <br />
                Build once. Earn forever.
              </p>
              <button
                onClick={handleBuildService}
                className="mt-8 rounded-full px-8 py-3 text-sm font-semibold text-white transition-all"
                style={{
                  background: "rgba(45,212,191,0.85)",
                  boxShadow: "0 0 30px -8px rgba(45,212,191,0.5)",
                }}
              >
                Create a service →
              </button>
              <button
                onClick={() => { void handleDismiss(); }}
                className="mt-4 block w-full text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AskSimonSearch } from "@/modules/services/simonos/components/ask-simon-search";
import { CategoryGrid } from "@/modules/services/simonos/components/category-grid";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function SimonOSPage({ balance }: { balance: number }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen" style={{ color: "#f5f0e8" }}>
      {/* Foliage background */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, #1a1208 0%, #0f1a0a 40%, #0d1510 70%, #0a0f0d 100%)",
        }} />
        {/* Animated leaf SVG pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="foliage" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M20,60 Q30,40 50,45 Q40,55 45,70 Q30,65 20,60Z" fill="#4a7a2e" opacity="0.5">
                <animateTransform attributeName="transform" type="translate" values="0,0;3,-2;0,0" dur="8s" repeatCount="indefinite"/>
              </path>
              <path d="M80,30 Q90,15 105,25 Q95,35 100,50 Q85,42 80,30Z" fill="#3d6b24" opacity="0.4">
                <animateTransform attributeName="transform" type="translate" values="0,0;-2,3;0,0" dur="10s" repeatCount="indefinite"/>
              </path>
              <path d="M60,90 Q70,80 85,85 Q78,95 80,105 Q65,100 60,90Z" fill="#5a8a3e" opacity="0.3">
                <animateTransform attributeName="transform" type="translate" values="0,0;2,2;0,0" dur="12s" repeatCount="indefinite"/>
              </path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#foliage)" />
        </svg>
        {/* Warm ambient glow */}
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: "rgba(180,120,40,0.06)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">
            &larr; Eden
          </Link>
          <span className="text-xs text-white/30">{"🍃"} {balance.toLocaleString()}</span>
        </div>

        {/* Hero */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center px-5 pt-12 pb-8"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em]" style={{ color: "#d97706" }}>
            SimonOS
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
            Find your next<br />
            <span className="italic" style={{ color: "#d97706" }}>exotic companion</span>
          </h1>
          <p className="mt-4 text-base text-white/50 max-w-xl mx-auto">
            Search thousands of listings from trusted, licensed breeders and exotic pet stores.
            SimonOS connects buyers with verified sellers — safely.
          </p>
        </motion.section>

        {/* Ask Simon search */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="px-5 pb-10"
        >
          {selectedCategory ? (
            <div>
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  &larr; All categories
                </button>
                <span className="text-sm font-semibold" style={{ color: "#d97706" }}>
                  {selectedCategory}
                </span>
              </div>
              <AskSimonSearch initialCategory={selectedCategory} />
            </div>
          ) : (
            <AskSimonSearch />
          )}
        </motion.div>

        {/* Category grid */}
        {!selectedCategory && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="px-5 pb-12"
          >
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/30 text-center mb-6">
              Browse by category
            </p>
            <CategoryGrid onCategorySelect={setSelectedCategory} />
          </motion.div>
        )}

        {/* Trust & safety */}
        <div className="mx-auto max-w-3xl px-5 py-12 border-t" style={{ borderColor: "rgba(180,140,80,0.1)" }}>
          <p className="text-[10px] text-white/20 leading-relaxed text-center">
            SimonOS is a marketplace connecting buyers and trusted sellers. All sellers attest they are licensed
            where required and that the animal listed is legal in the buyer&apos;s state. Buyers are responsible for
            verifying local exotic pet laws. SimonOS does not ship animals directly.
          </p>
        </div>
      </div>
    </div>
  );
}

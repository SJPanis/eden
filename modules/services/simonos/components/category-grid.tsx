"use client";

import { useState, useRef } from "react";

type Category = {
  label: string;
  icon: string; // SVG path data
  color: string;
};

const CATEGORIES: Category[] = [
  { label: "Exotic Reptiles", icon: "M12 3c-2 4-6 5-8 8 1 3 4 5 8 6 4-1 7-3 8-6-2-3-6-4-8-8z", color: "#22c55e" },
  { label: "Exotic Birds", icon: "M12 4c-3 0-5 2-6 5-1 3 1 5 3 6l3 2 3-2c2-1 4-3 3-6-1-3-3-5-6-5z M10 12l2 5 2-5", color: "#3b82f6" },
  { label: "Exotic Small Mammals", icon: "M8 8a4 4 0 108 0 4 4 0 00-8 0z M6 16c0-3 3-5 6-5s6 2 6 5", color: "#a855f7" },
  { label: "Exotic Amphibians", icon: "M8 10c-2 0-3 2-3 4s2 4 4 4h6c2 0 4-2 4-4s-1-4-3-4 M9 10c0-3 1-5 3-6 2 1 3 3 3 6", color: "#10b981" },
  { label: "Exotic Fish", icon: "M4 12c2-4 6-6 10-6 3 0 5 1 6 3l2-2v4l-2-2c-1 2-3 3-6 3-4 0-8-2-10-6z M17 9a1 1 0 100 2 1 1 0 000-2z", color: "#06b6d4" },
  { label: "Exotic Invertebrates", icon: "M12 6a6 6 0 100 12 6 6 0 000-12z M12 2v4 M12 18v4 M6 12H2 M22 12h-4 M7.8 7.8L5 5 M19 19l-2.8-2.8 M16.2 7.8L19 5 M5 19l2.8-2.8", color: "#f59e0b" },
  { label: "Exotic Cats", icon: "M12 5c-3 0-6 3-6 6v5h3v-3h6v3h3v-5c0-3-3-6-6-6z M8 4l-2-2 M16 4l2-2", color: "#ef4444" },
  { label: "Exotic Dogs", icon: "M12 6c-3 0-5 2-5 5v5h2v-2h6v2h2v-5c0-3-2-5-5-5z M7 4L5 2 M17 4l2-2 M10 14h4", color: "#8b5cf6" },
  { label: "Other", icon: "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z", color: "#d97706" },
];

export function CategoryGrid({ onCategorySelect }: { onCategorySelect: (cat: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function handleMouseMove(e: React.MouseEvent, label: string) {
    const el = cardRefs.current.get(label);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    el.style.transform = `perspective(1000px) rotateX(${y * -6}deg) rotateY(${x * 6}deg) scale(1.03)`;
  }

  function handleMouseLeave(label: string) {
    const el = cardRefs.current.get(label);
    if (el) el.style.transform = "";
    setHovered(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.label}
          ref={(el) => { if (el) cardRefs.current.set(cat.label, el); }}
          type="button"
          onClick={() => onCategorySelect(cat.label)}
          onMouseEnter={() => setHovered(cat.label)}
          onMouseMove={(e) => handleMouseMove(e, cat.label)}
          onMouseLeave={() => handleMouseLeave(cat.label)}
          className="rounded-2xl p-5 text-left transition-all duration-200"
          style={{
            background: hovered === cat.label
              ? `linear-gradient(135deg, ${cat.color}15, rgba(30,20,10,0.7))`
              : "rgba(30,20,10,0.5)",
            border: `1px solid ${hovered === cat.label ? `${cat.color}40` : "rgba(180,140,80,0.1)"}`,
            boxShadow: hovered === cat.label
              ? `0 8px 30px -8px ${cat.color}20`
              : "0 2px 8px -2px rgba(0,0,0,0.3)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all"
              style={{
                background: `${cat.color}15`,
                border: `1px solid ${cat.color}25`,
                boxShadow: hovered === cat.label ? `0 0 12px ${cat.color}30` : "none",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={cat.icon} />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">{cat.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

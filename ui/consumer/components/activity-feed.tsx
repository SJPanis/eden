"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ActivityEvent = {
  id: string;
  type: "publish" | "run";
  createdAt: string;
  title: string;
  subtitle: string;
  color: string;
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchFeed() {
      try {
        const res = await fetch("/api/activity/feed");
        const data = (await res.json()) as { ok?: boolean; events?: ActivityEvent[] };
        if (!cancelled && data.ok && data.events) setEvents(data.events);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchFeed();
    const interval = setInterval(() => { void fetchFeed(); }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/30">
          Live Activity
        </p>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#2dd4bf] opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4bf]" />
        </span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="h-2 w-2 mt-1.5 shrink-0 rounded-full"
                style={{ background: event.color, boxShadow: `0 0 8px ${event.color}` }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 truncate">
                  {event.type === "publish" ? "🌱" : "⚡"} {event.title}
                </p>
                <p className="text-xs text-white/40 truncate mt-0.5">
                  {event.subtitle} · {timeAgo(event.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

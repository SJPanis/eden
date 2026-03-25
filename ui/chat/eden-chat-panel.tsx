"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { EdenAiIdeaResult, EdenAiRouteResult, EdenAiServiceResult } from "@/modules/eden-ai/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "eden";
  text: string;
  result?: EdenAiRouteResult;
  timestamp: number;
};

type EdenChatPanelProps = {
  initialPrompt?: string;
  canUseAi: boolean;
};

// ── Suggestion chips ──────────────────────────────────────────────────────────

const suggestions = [
  "I want to build a fitness coaching service",
  "Help me brainstorm a business idea",
  "What services are available on Eden?",
  "How do I start earning on Eden?",
];

// ── Panel ─────────────────────────────────────────────────────────────────────

export function EdenChatPanel({ initialPrompt, canUseAi }: EdenChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildContext(history: ChatMessage[]): string {
    if (history.length === 0) return "";
    const last = history.slice(-4);
    return last
      .map((m) => `${m.role === "user" ? "User" : "Eden"}: ${m.text}`)
      .join("\n");
  }

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const context = buildContext([...messages, userMsg]);
        const promptWithContext = context ? `${context}\nUser: ${trimmed}` : trimmed;

        const res = await fetch("/api/eden-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptWithContext }),
        });

        const data = (await res.json().catch(() => null)) as { ok: boolean; result?: EdenAiRouteResult; error?: string } | null;

        if (!res.ok || !data?.ok || !data.result) {
          const edenMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "eden",
            text: data?.error ?? "I couldn't process that — please try again.",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, edenMsg]);
          return;
        }

        const edenMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "eden",
          text: data.result.summary,
          result: data.result,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, edenMsg]);
      } catch {
        setError("Eden couldn't connect. Check your connection and try again.");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">

      {/* Empty state / welcome */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#2dd4bf]">
                <path d="M12 3C6.477 3 2 6.925 2 11.75c0 2.282.997 4.35 2.629 5.9L3 21l4.243-1.5C8.605 20.133 10.255 20.5 12 20.5c5.523 0 10-3.925 10-8.75S17.523 3 12 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Chat with Eden</h2>
            <p className="mt-2 max-w-sm text-sm text-white/40">
              Ask about services, explore business ideas, or tell me what you want to build. I can help you get started.
            </p>

            {!canUseAi && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
                Sign in to use Eden AI.{" "}
                <Link href="/auth?callbackUrl=/consumer/chat" className="underline hover:text-amber-200">
                  Sign in
                </Link>
              </div>
            )}

            {/* Suggestion chips */}
            {canUseAi && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 transition hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/10 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message thread */}
      {!isEmpty && (
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] space-y-3 ${msg.role === "user" ? "" : ""}`}>
                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "ml-auto border border-[#2dd4bf]/30 bg-[#2dd4bf]/15 text-white"
                        : "border border-[rgba(45,212,191,0.08)] bg-white/[0.03] text-white/90"
                    }`}
                  >
                    {msg.role === "eden" && (
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#2dd4bf]">Eden</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Rich result cards */}
                  {msg.result && <ResultCards result={msg.result} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pending indicator */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2dd4bf]">Eden</p>
                <div className="mt-2 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]/50"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      <div className="mt-4 shrink-0">
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] focus-within:border-[#2dd4bf]/40 focus-within:ring-2 focus-within:ring-[#2dd4bf]/15 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || !canUseAi}
            placeholder={canUseAi ? "Ask Eden anything… (Enter to send, Shift+Enter for new line)" : "Sign in to chat with Eden"}
            rows={2}
            className="w-full resize-none bg-transparent px-4 py-3.5 pr-16 text-sm text-white placeholder-white/25 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={isPending || !input.trim() || !canUseAi}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-[#2dd4bf]/40 bg-[#2dd4bf]/20 text-[#2dd4bf] transition hover:bg-[#2dd4bf]/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/20">
          Eden uses AI to route your request. Results may include simulated data.
        </p>
      </div>
    </div>
  );
}

// ── Result cards ──────────────────────────────────────────────────────────────

function ResultCards({ result }: { result: EdenAiRouteResult }) {
  const { services, ideas, businesses } = result.results;
  if (!services.length && !ideas.length && !businesses.length) return null;

  return (
    <div className="space-y-3">
      {/* Ideas — most prominent, with "Build it" CTA */}
      {ideas.length > 0 && (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="space-y-2">
          {services.map((svc) => (
            <ServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      )}

      {/* Businesses */}
      {businesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              className="rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-2"
            >
              <p className="text-sm font-semibold text-white">{biz.name}</p>
              <p className="mt-0.5 text-xs text-white/40">{biz.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea }: { idea: EdenAiIdeaResult }) {
  const buildHref = idea.projectArtifact
    ? `/business/create?idea=${encodeURIComponent(idea.title)}&desc=${encodeURIComponent(idea.description)}`
    : `/business/create?idea=${encodeURIComponent(idea.title)}`;

  return (
    <div className="rounded-2xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/[0.07] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#2dd4bf]/70">Idea</p>
          <p className="mt-1 font-semibold text-white">{idea.title}</p>
          <p className="mt-1 text-sm text-white/50">{idea.description}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={buildHref}
          className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2dd4bf]/30"
        >
          Build this idea →
        </Link>
        {idea.projectArtifact?.suggestedAgents && idea.projectArtifact.suggestedAgents.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-2 text-xs text-white/40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5-1.5 1.5m-9 9L4.5 19.5m0-15L6 6m12 12-1.5-1.5" />
            </svg>
            {idea.projectArtifact.suggestedAgents.length} agents suggested
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: EdenAiServiceResult }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="block rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3 transition hover:border-white/15"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{service.title}</p>
          <p className="mt-0.5 text-xs text-white/40">{service.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(45,212,191,0.08)] bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/40">
          {service.pricingLabel}
        </span>
      </div>
    </Link>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function EdenGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/eden-guide/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as { ok: boolean; response: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Pulse ring — only when closed */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[89] pointer-events-none"
          style={{ width: 56, height: 56 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid rgba(45,212,191,0.4)",
              animation: "eden-guide-pulse 2s ease-out infinite",
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes eden-guide-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>

      {/* Floating button — only when closed */}
      {!isOpen && (
        <motion.button
          type="button"
          className="fixed bottom-6 right-6 z-[90] flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, rgba(45,212,191,0.9), rgba(45,212,191,0.6))",
            border: "1px solid rgba(45,212,191,0.5)",
            boxShadow:
              "0 0 30px -5px rgba(45,212,191,0.4), 0 4px 20px -4px rgba(0,0,0,0.5)",
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          aria-label="Open Eden Guide"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path
              d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
              strokeLinecap="round"
              opacity="0.6"
            />
            <circle cx="12" cy="12" r="3" fill="white" stroke="none" opacity="0.9" />
          </svg>
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-[90] flex flex-col"
            style={{
              width: 380,
              maxHeight: 500,
              background: "rgba(11,22,34,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(45,212,191,0.15)",
              borderRadius: 20,
              boxShadow:
                "0 8px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#2dd4bf]/70">
                Eden Guide
              </span>
              <button
                type="button"
                className="text-white/30 hover:text-white/60 transition-colors"
                onClick={() => setIsOpen(false)}
                aria-label="Close Eden Guide"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-5 py-3 space-y-3"
              style={{ minHeight: 200 }}
            >
              {messages.length === 0 ? (
                <p className="text-sm text-white/30 text-center p-6">
                  Ask me anything about Eden. I can help you discover services,
                  understand Leafs, or navigate the platform.
                </p>
              ) : (
                messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div
                        className="ml-8 px-4 py-2.5 text-sm text-white"
                        style={{
                          background: "rgba(45,212,191,0.15)",
                          border: "1px solid rgba(45,212,191,0.2)",
                          borderRadius: "16px 16px 4px 16px",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start">
                      <div
                        className="mr-8 px-4 py-2.5 text-sm text-white/70"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "16px 16px 16px 4px",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ),
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Eden..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
                  style={{
                    background: "rgba(13,30,46,0.8)",
                    border: "1px solid rgba(45,212,191,0.1)",
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl px-3 py-2.5 transition-opacity disabled:opacity-30"
                  style={{
                    background: "rgba(45,212,191,0.2)",
                    color: "#2dd4bf",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

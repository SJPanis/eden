"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceLoadingBar } from "@/components/service-loading-bar";

type ServiceInfo = { slug: string; name: string; description: string; leafCost: number; thumbnailColor: string };

type ParsedEmail = {
  label: string;
  subject: string;
  body: string;
};

function parseEmails(response: string): ParsedEmail[] {
  // Try splitting on numbered patterns like (1), (2), (3) or **1. or 1.
  const sectionPattern = /(?:^|\n)\s*(?:\((\d)\)|(?:\*{0,2})(\d)[\.\):])\s*(.+?)(?=\n)/g;
  const sections: { index: number; num: string; label: string }[] = [];
  let match;
  while ((match = sectionPattern.exec(response)) !== null) {
    sections.push({ index: match.index, num: match[1] || match[2], label: match[3].replace(/\*+/g, "").trim() });
  }

  if (sections.length >= 2) {
    const emails: ParsedEmail[] = [];
    for (let i = 0; i < sections.length; i++) {
      const start = sections[i].index;
      const end = i < sections.length - 1 ? sections[i + 1].index : response.length;
      const block = response.slice(start, end).trim();

      // Extract subject
      const subjMatch = block.match(/[Ss]ubject(?:\s*[Ll]ine)?:\s*(.+)/);
      const subject = subjMatch ? subjMatch[1].replace(/\*+/g, "").trim() : "";

      // Body is everything after subject line, or the whole block minus header
      let body: string;
      if (subjMatch) {
        const afterSubject = block.slice(block.indexOf(subjMatch[0]) + subjMatch[0].length).trim();
        body = afterSubject;
      } else {
        const lines = block.split("\n");
        body = lines.slice(1).join("\n").trim();
      }

      emails.push({
        label: sections[i].label || `Version ${sections[i].num}`,
        subject,
        body: body.replace(/^[\n\r]+/, "").replace(/[\n\r]+$/, ""),
      });
    }
    return emails;
  }

  // Fallback: single card with full response
  return [{ label: "Email", subject: "", body: response }];
}

const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition";
const inputStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

export function ColdEmailRunner({ balance: initialBalance }: { balance: number }) {
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [who, setWho] = useState("");
  const [what, setWhat] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/services/cold-email-writer")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setService(d); })
      .catch(() => {});
  }, []);

  async function handleRun() {
    if (!who.trim() || !what.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setEmails([]);
    try {
      const input = `I'm reaching out to: ${who.trim()}. I want: ${what.trim()}.${context.trim() ? ` About me: ${context.trim()}` : ""}`;
      const res = await fetch("/api/services/cold-email-writer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; result?: string; newBalance?: number };
      if (!data.ok) throw new Error(data.error || "Service run failed");
      const text = data.result ?? "";
      setResult(text);
      setEmails(parseEmails(text));
      if (typeof data.newBalance === "number") {
        setBalance(data.newBalance);
        window.dispatchEvent(new CustomEvent("eden:balance-updated", { detail: { newBalance: data.newBalance } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service run failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  const accent = service?.thumbnailColor || "#2dd4bf";

  return (
    <div className="min-h-screen">
      <ServiceLoadingBar loading={loading} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">&larr; Eden</Link>
          <span className="text-xs text-white/30">{"🍃"} {balance.toLocaleString()}</span>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
            {service?.name ?? "Cold Email Writer"}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {service?.description ?? "Generate 3 tailored cold email versions"}
          </p>
          {service && (
            <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]" style={{ background: `${accent}15`, color: accent }}>
              {service.leafCost} {"🍃"} per use
            </span>
          )}
        </div>

        {/* Structured inputs */}
        <div className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50">Who are you reaching out to?</label>
            <input
              type="text"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="VP of Marketing at Acme Corp"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50">What do you want?</label>
            <input
              type="text"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Schedule a demo of our analytics tool"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50">Context about you (optional)</label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="I run a 10-person analytics startup"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            onClick={() => { void handleRun(); }}
            disabled={!who.trim() || !what.trim() || loading}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: accent, color: "#0b1622" }}
          >
            {loading ? "Writing emails..." : `Generate emails \u2014 ${service?.leafCost ?? "?"} 🍃`}
          </button>
        </div>

        {error && <p className="mt-4 text-center text-xs text-red-400/70">{error}</p>}

        {/* Email cards */}
        {emails.length > 0 && (
          <div className="mt-6 space-y-4">
            {emails.map((email, i) => (
              <div key={i} className="rounded-2xl p-5" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-white/40">
                    {email.label}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { void copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`, i); }}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ background: "rgba(45,212,191,0.1)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.2)" }}
                    >
                      {copied === i ? "Copied!" : "Copy"}
                    </button>
                    {email.subject && (
                      <a
                        href={`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-full transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        Open in Gmail &rarr;
                      </a>
                    )}
                  </div>
                </div>

                {email.subject && (
                  <p className="text-xs text-white/40 mb-2">
                    Subject: <span className="text-white/70">{email.subject}</span>
                  </p>
                )}

                <div className="text-sm text-white/70 leading-7 whitespace-pre-wrap">
                  {email.body}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback: show raw result if parsing produced nothing */}
        {result && emails.length === 0 && (
          <div className="mt-6 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] uppercase tracking-wider text-white/30">Result</p>
            <div className="mt-3 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
}

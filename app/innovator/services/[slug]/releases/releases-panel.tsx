"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Release = { id: string; version: string; notes: string; status: string; createdAt: string };

const ACCENT = "#2dd4bf";

export function ReleasesPanel({ slug }: { slug: string }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [deploy, setDeploy] = useState<"staging" | "production">("staging");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/innovator/services/${slug}/releases`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setReleases(d.releases);
          setServiceName(d.service?.name ?? slug);
        }
      })
      .catch(() => {});
  }, [slug]);

  async function handleCreate() {
    if (!version) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/innovator/services/${slug}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, notes, systemPrompt: systemPrompt || null, deploy }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setReleases((prev) => [data.release, ...prev]);
      setShowNew(false);
      setVersion("");
      setNotes("");
      setSystemPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const statusColor = (s: string) =>
    s === "live" ? "#10b981" : s === "staged" ? "#f59e0b" : "rgba(255,255,255,0.2)";

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition bg-white/[0.03] border border-white/[0.06] focus:border-[rgba(45,212,191,0.3)]";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">&larr; Eden</Link>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>{serviceName}</h1>
            <p className="text-xs text-white/40">Releases for /{slug}</p>
          </div>
          <button type="button" onClick={() => setShowNew(!showNew)}
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-all"
            style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          >
            {showNew ? "Cancel" : "New Release"}
          </button>
        </div>

        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

        {showNew && (
          <div className="mt-6 space-y-4 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-white/40">Version</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.1" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-white/40">Release Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed..." rows={3} className={`mt-1 resize-y ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-white/40">Updated System Prompt (optional)</label>
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Leave empty to keep current prompt" rows={4} className={`mt-1 resize-y ${inputCls}`} />
            </div>
            <div className="flex gap-3">
              {(["staging", "production"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDeploy(d)}
                  className="flex-1 rounded-xl py-2.5 text-xs font-medium transition-all"
                  style={deploy === d ? { background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}40` } : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {d === "staging" ? "Deploy to Staging" : "Deploy to Production"}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleCreate} disabled={saving || !version}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-30"
              style={{ background: ACCENT, color: "#0b1622" }}
            >
              {saving ? "Deploying..." : `Create Release ${version}`}
            </button>
          </div>
        )}

        {/* Release history */}
        <div className="mt-8 space-y-3">
          {releases.length === 0 ? (
            <p className="text-center text-xs text-white/20 py-8">No releases yet</p>
          ) : releases.map((r) => (
            <div key={r.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{r.version}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: `${statusColor(r.status)}20`, color: statusColor(r.status) }}
                  >
                    {r.status}
                  </span>
                </div>
                <span className="text-[10px] text-white/20">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.notes && <p className="mt-1 text-xs text-white/40">{r.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

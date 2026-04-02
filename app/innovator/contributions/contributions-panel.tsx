"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ContribRequest = {
  id: string;
  title: string;
  description: string;
  rewardPercent: number;
  status: string;
  contributions: { id: string; title: string; status: string }[];
};

type ServiceWithContribs = { slug: string; name: string; requests: ContribRequest[] };

const ACCENT = "#2dd4bf";

export function ContributionsPanel() {
  const [services, setServices] = useState<ServiceWithContribs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services/list")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.ok) return;
        const svcs: ServiceWithContribs[] = [];
        for (const svc of data.services) {
          try {
            const res = await fetch(`/api/innovator/services/${svc.slug}/contribution-requests`);
            const d = await res.json();
            if (d.ok) svcs.push({ slug: svc.slug, name: svc.name, requests: d.requests });
          } catch { /* skip */ }
        }
        setServices(svcs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [showForm, setShowForm] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formReward, setFormReward] = useState(5);
  const [saving, setSaving] = useState(false);

  async function handleCreate(slug: string) {
    if (!formTitle) return;
    setSaving(true);
    try {
      await fetch(`/api/innovator/services/${slug}/contribution-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, description: formDesc, rewardPercent: formReward }),
      });
      setShowForm(null);
      setFormTitle("");
      setFormDesc("");
      window.location.reload();
    } catch { /* */ }
    setSaving(false);
  }

  async function handleReview(contribId: string, decision: "accept" | "reject") {
    await fetch(`/api/contributions/${contribId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, rewardPercent: 5 }),
    });
    window.location.reload();
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none bg-white/[0.03] border border-white/[0.06]";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">&larr; Eden</Link>
        <h1 className="mt-8 text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>Contributions</h1>
        <p className="mt-1 text-sm text-white/40">Open your services to contributors who improve them and earn a share.</p>

        {loading ? (
          <p className="mt-12 text-center text-xs text-white/20">Loading...</p>
        ) : services.length === 0 ? (
          <p className="mt-12 text-center text-xs text-white/20">No published services yet. <Link href="/innovator/new-service" className="text-[#2dd4bf]/60 hover:text-[#2dd4bf]">Create one</Link></p>
        ) : (
          <div className="mt-8 space-y-6">
            {services.map((svc) => (
              <div key={svc.slug} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white">{svc.name}</h2>
                  <button type="button" onClick={() => setShowForm(showForm === svc.slug ? null : svc.slug)}
                    className="text-xs font-medium" style={{ color: ACCENT }}
                  >
                    {showForm === svc.slug ? "Cancel" : "+ Request"}
                  </button>
                </div>

                {showForm === svc.slug && (
                  <div className="mt-4 space-y-3">
                    <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="What do you need help with?" className={inputCls} />
                    <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Describe what you need..." rows={3} className={`resize-y ${inputCls}`} />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-white/30">Reward: {formReward}%</label>
                      <input type="range" min={1} max={20} value={formReward} onChange={(e) => setFormReward(Number(e.target.value))} className="flex-1" />
                    </div>
                    <button type="button" onClick={() => handleCreate(svc.slug)} disabled={saving || !formTitle}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-30" style={{ background: ACCENT, color: "#0b1622" }}
                    >
                      {saving ? "Creating..." : "Create Request"}
                    </button>
                  </div>
                )}

                {svc.requests.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {svc.requests.map((req) => (
                      <div key={req.id} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/70">{req.title}</p>
                          <span className="text-[10px] font-mono" style={{ color: ACCENT }}>{req.rewardPercent}% reward</span>
                        </div>
                        <p className="mt-1 text-xs text-white/30">{req.description}</p>
                        {req.contributions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {req.contributions.map((c) => (
                              <div key={c.id} className="flex items-center justify-between text-xs">
                                <span className="text-white/50">{c.title}</span>
                                {c.status === "pending" ? (
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => handleReview(c.id, "accept")} className="text-emerald-400/70 hover:text-emerald-400">Accept</button>
                                    <button type="button" onClick={() => handleReview(c.id, "reject")} className="text-red-400/70 hover:text-red-400">Reject</button>
                                  </div>
                                ) : (
                                  <span className={c.status === "accepted" ? "text-emerald-400/50" : "text-red-400/50"}>{c.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

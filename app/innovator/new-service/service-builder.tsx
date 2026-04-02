"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Finance", "Automotive", "Music", "Productivity", "Creative", "Health", "Education", "Other"];
const ACCENT = "#2dd4bf";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export function ServiceBuilder({ username }: { username: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [thumbnailColor, setThumbnailColor] = useState("#2dd4bf");

  // Step 2
  const [leafCost, setLeafCost] = useState(5);
  const [pricingModel, setPricingModel] = useState("per_use");

  // Step 3
  const [serviceType, setServiceType] = useState("claude");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [outputFormat, setOutputFormat] = useState("text");
  const [externalUrl, setExternalUrl] = useState("");

  // Step 4
  const [visibility, setVisibility] = useState("public");

  function handleNameChange(v: string) {
    setName(v.slice(0, 40));
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  }

  async function handleSave(publish: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/innovator/services/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, description, category, leafCost, pricingModel,
          serviceType, systemPrompt: systemPrompt || null, outputFormat,
          externalUrl: externalUrl || null, thumbnailColor, visibility,
          publish,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (publish) {
        router.push("/consumer?new_service=true");
        return;
      }
      setSuccess(`${name} saved as draft`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition bg-white/[0.03] border border-white/[0.06] focus:border-[rgba(45,212,191,0.3)]";
  const labelCls = "text-xs uppercase tracking-[0.12em] text-white/40";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">&larr; Eden</Link>
          <span className="text-xs text-white/30">{username}</span>
        </div>

        <h1 className="mt-8 text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>Build a Service</h1>
        <p className="mt-1 text-sm text-white/40">Create an AI-powered service that earns Leafs every time someone uses it.</p>

        {/* Stepper */}
        <div className="mt-6 flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <button key={s} type="button" onClick={() => setStep(s)}
              className="flex-1 rounded-lg py-2 text-xs font-medium transition-all"
              style={step === s ? { background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}50` } : { color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
            >
              {s === 1 ? "Identity" : s === 2 ? "Pricing" : s === 3 ? "Service" : "Launch"}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs text-red-400">{error}</p>}
        {success && <p className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs text-emerald-400">{success}</p>}

        <div className="mt-6 space-y-5">
          {/* STEP 1 — Identity */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Service Name</label>
                <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="My AI Service" className={`mt-1 ${inputCls}`} />
                <p className="mt-1 text-[10px] text-white/20">{name.length}/40</p>
              </div>
              <div>
                <label className={labelCls}>Slug (URL path)</label>
                <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="my-ai-service" className={`mt-1 font-mono ${inputCls}`} />
                <p className="mt-1 text-[10px] text-white/20">edencloud.app/services/{slug || "..."}</p>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value.slice(0, 120))} placeholder="What does your service do?" className={`mt-1 ${inputCls}`} />
                <p className="mt-1 text-[10px] text-white/20">{description.length}/120</p>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 ${inputCls}`}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Card Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={thumbnailColor} onChange={(e) => setThumbnailColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 bg-transparent cursor-pointer" />
                  <span className="text-xs font-mono text-white/30">{thumbnailColor}</span>
                  <div className="h-10 flex-1 rounded-lg" style={{ background: `linear-gradient(135deg, ${thumbnailColor}40, rgba(11,22,34,0.95))` }} />
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — Pricing */}
          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Leaf Cost Per Use</label>
                <input type="number" min={1} max={10000} value={leafCost} onChange={(e) => setLeafCost(Number(e.target.value))} className={`mt-1 ${inputCls}`} />
                <p className="mt-1 text-[10px] text-white/20">{"\u2248"} ${(leafCost / 25).toFixed(2)} per use</p>
              </div>
              <div>
                <label className={labelCls}>Pricing Model</label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: "per_use", label: "Pay per use", desc: "User pays each time they run the service" },
                    { id: "subscription", label: "Subscription", desc: "Monthly Leaf amount for unlimited access" },
                    { id: "free", label: "Free with tip jar", desc: "Free to use, users can tip Leafs" },
                  ].map((m) => (
                    <button key={m.id} type="button" onClick={() => setPricingModel(m.id)}
                      className="w-full rounded-xl p-3 text-left transition-all"
                      style={pricingModel === m.id ? { background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-[10px] text-white/30">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — Service Logic */}
          {step === 3 && (
            <>
              <div>
                <label className={labelCls}>Service Type</label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: "claude", label: "Claude-powered", desc: "Claude handles the logic — you write the system prompt" },
                    { id: "custom", label: "Custom code", desc: "Write your own handler function" },
                    { id: "external", label: "External URL", desc: "Point to an existing API endpoint" },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => setServiceType(t.id)}
                      className="w-full rounded-xl p-3 text-left transition-all"
                      style={serviceType === t.id ? { background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-sm font-medium text-white">{t.label}</p>
                      <p className="text-[10px] text-white/30">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {serviceType === "claude" && (
                <>
                  <div>
                    <label className={labelCls}>System Prompt</label>
                    <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value.slice(0, 5000))} placeholder="Describe what your service does and how Claude should behave..." rows={6} className={`mt-1 resize-y ${inputCls}`} />
                    <p className="mt-1 text-[10px] text-white/20">{systemPrompt.length}/5000</p>
                  </div>
                  <div>
                    <label className={labelCls}>Output Format</label>
                    <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className={`mt-1 ${inputCls}`}>
                      <option value="text">Text</option>
                      <option value="json">JSON</option>
                      <option value="image">Image (URL)</option>
                    </select>
                  </div>
                </>
              )}

              {serviceType === "external" && (
                <div>
                  <label className={labelCls}>API Endpoint URL</label>
                  <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://api.example.com/v1/run" className={`mt-1 ${inputCls}`} />
                </div>
              )}

              {serviceType === "custom" && (
                <div>
                  <label className={labelCls}>Handler Code</label>
                  <textarea rows={10} placeholder={"// Your handler function\nexport async function handler(input) {\n  // Process input and return result\n  return { result: 'Hello!' }\n}"} className={`mt-1 resize-y font-mono text-xs ${inputCls}`} />
                </div>
              )}
            </>
          )}

          {/* STEP 4 — Launch */}
          {step === 4 && (
            <>
              <div>
                <label className={labelCls}>Visibility</label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: "public", label: "Public", desc: "Anyone on Eden can find and use your service" },
                    { id: "invite", label: "Invite only", desc: "Only users with the direct link can access" },
                    { id: "private", label: "Private", desc: "Only you can use this service" },
                  ].map((v) => (
                    <button key={v.id} type="button" onClick={() => setVisibility(v.id)}
                      className="w-full rounded-xl p-3 text-left transition-all"
                      style={visibility === v.id ? { background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-sm font-medium text-white">{v.label}</p>
                      <p className="text-[10px] text-white/30">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/30">Summary</p>
                <p className="mt-2 text-sm font-semibold text-white">{name || "Untitled"}</p>
                <p className="text-xs text-white/40">{description || "No description"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full px-2 py-0.5" style={{ background: `${ACCENT}10`, color: ACCENT }}>{category}</span>
                  <span className="rounded-full px-2 py-0.5 text-white/40" style={{ background: "rgba(255,255,255,0.04)" }}>{leafCost} Leafs / use</span>
                  <span className="rounded-full px-2 py-0.5 text-white/40" style={{ background: "rgba(255,255,255,0.04)" }}>{serviceType}</span>
                  <span className="rounded-full px-2 py-0.5 text-white/40" style={{ background: "rgba(255,255,255,0.04)" }}>{visibility}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => handleSave(false)} disabled={saving || !name || !slug}
                  className="flex-1 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-30"
                  style={{ border: `1px solid ${ACCENT}30`, color: ACCENT, background: "transparent" }}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button type="button" onClick={() => handleSave(true)} disabled={saving || !name || !slug}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-30"
                  style={{ background: ACCENT, color: "#0b1622" }}
                >
                  {saving ? "Publishing..." : "Publish Service"}
                </button>
              </div>
            </>
          )}

          {/* Navigation */}
          {step < 4 && (
            <button type="button" onClick={() => setStep(step + 1)}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
              style={{ background: ACCENT, color: "#0b1622" }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

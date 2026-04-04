"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const CATEGORIES = [
  "Finance", "Automotive", "Music", "Productivity",
  "Creative", "Health", "Education", "Other",
];

const COLORS = [
  "#2dd4bf", "#f59e0b", "#a855f7", "#10b981", "#3b82f6", "#ef4444",
];

const inputClass =
  "w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:ring-1 focus:ring-[#2dd4bf]/50";

const inputStyle = {
  background: "rgba(13,30,46,0.8)",
  border: "1px solid rgba(45,212,191,0.1)",
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-white">
        {label}
        {required && <span className="ml-1 text-xs text-white/30">Required</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-white/30">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function ServiceBuilderPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    leafCost: 5,
    systemPrompt: "",
    thumbnailColor: "#2dd4bf",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugEdited) {
        next.slug = toSlug(value as string);
      }
      return next;
    });
  }

  const canSubmit =
    form.name.trim().length > 0 &&
    form.slug.trim().length > 0 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()) &&
    form.description.trim().length > 0 &&
    form.category.length > 0 &&
    form.leafCost >= 1 &&
    form.leafCost <= 10000;

  async function handlePublish() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/innovator/services/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          category: form.category,
          leafCost: form.leafCost,
          pricingModel: "per_use",
          serviceType: "claude",
          systemPrompt: form.systemPrompt.trim() || null,
          thumbnailColor: form.thumbnailColor,
          visibility: "public",
          publish: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Failed to create service");

      router.push("/consumer?new_service=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Header */}
      <div>
        <p
          className="text-xs font-mono uppercase text-white/30"
          style={{ letterSpacing: "0.3em" }}
        >
          Create a Service
        </p>
        <h1
          className="mt-2 text-3xl font-bold text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Publish to Eden
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Create an AI service, set your Leaf price, and publish it to the
          marketplace. You earn 70% of every run.
        </p>
      </div>

      {/* Service name */}
      <Field label="Service name" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value.slice(0, 40))}
          placeholder="e.g. Market Lens"
          maxLength={40}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs text-white/20">{form.name.length}/40</p>
      </Field>

      {/* Slug */}
      <Field label="URL slug" hint={`edencloud.app/services/${form.slug || "your-slug"}`}>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => {
            setSlugEdited(true);
            updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50));
          }}
          placeholder="your-service-slug"
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      {/* Description */}
      <Field label="Description" required>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value.slice(0, 120))}
          placeholder="What does this service do?"
          maxLength={120}
          rows={3}
          className={inputClass}
          style={{ ...inputStyle, resize: "none" }}
        />
        <p className="mt-1 text-xs text-white/20">{form.description.length}/120</p>
      </Field>

      {/* Category */}
      <Field label="Category" required>
        <select
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </Field>

      {/* Leaf cost */}
      <Field label="Leaf cost per use" required hint="How many Leafs users pay each time they run this service">
        <input
          type="number"
          min={1}
          max={10000}
          value={form.leafCost}
          onChange={(e) => updateField("leafCost", Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs text-white/30">
          At current rates, {form.leafCost} Leafs ≈ ${(form.leafCost * 0.03).toFixed(2)} USD
        </p>
      </Field>

      {/* Thumbnail color */}
      <Field label="Accent color">
        <div className="flex gap-3">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateField("thumbnailColor", color)}
              className="h-8 w-8 rounded-full border-2 transition-all"
              style={{
                background: color,
                borderColor: form.thumbnailColor === color ? "white" : "transparent",
                boxShadow: form.thumbnailColor === color ? `0 0 12px ${color}` : "none",
              }}
            />
          ))}
        </div>
      </Field>

      {/* System prompt */}
      <Field label="System prompt" hint="Optional. Instructions for the AI when running this service.">
        <textarea
          value={form.systemPrompt}
          onChange={(e) => updateField("systemPrompt", e.target.value.slice(0, 5000))}
          placeholder="You are a helpful assistant that..."
          rows={4}
          className={inputClass}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      {/* Preview */}
      <div className="eden-service-card rounded-2xl p-4">
        <p
          className="mb-3 text-[10px] font-mono uppercase text-white/30"
          style={{ letterSpacing: "0.2em" }}
        >
          Preview
        </p>
        <h3
          className="text-base font-semibold text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {form.name || "Your service name"}
        </h3>
        <p className="mt-1 text-xs text-white/40">
          {form.description || "Your description will appear here"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-white/20">{form.leafCost} Leafs per use</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              background: `${form.thumbnailColor}20`,
              color: form.thumbnailColor,
            }}
          >
            {form.category || "Category"}
          </span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { void handlePublish(); }}
          disabled={!canSubmit || isSubmitting}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background: "rgba(45,212,191,0.85)",
            border: "1px solid rgba(45,212,191,0.5)",
            boxShadow: "0 0 20px -4px rgba(45,212,191,0.3)",
          }}
        >
          {isSubmitting ? "Publishing..." : "Publish to marketplace"}
        </button>
        <a
          href="/consumer"
          className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
        >
          Cancel
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

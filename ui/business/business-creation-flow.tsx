"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { categories } from "@/modules/core/mock-data";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import type { EdenMockBusinessCreationSource } from "@/modules/core/business/mock-created-business";

type BusinessCreationFlowProps = {
  session: EdenMockSession;
  initialSource: EdenMockBusinessCreationSource;
  initialIdeaTitle?: string;
  initialIdeaDescription?: string;
};

type BusinessCreationFormState = {
  name: string;
  description: string;
  category: string;
  tagsInput: string;
  targetAudience: string;
  monetizationModel: string;
};

const stepVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
};

const monetizationOptions = [
  "Subscription",
  "One-time purchase",
  "Usage-based",
  "Lead generation",
  "Marketplace fee",
];

function parsePlanText(text: string): Partial<BusinessCreationFormState> {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const result: Partial<BusinessCreationFormState> = {};

  // Name: first non-empty line or line after "name:" / "business:"
  for (const line of lines) {
    const m = line.match(/^(?:name|business|app|project)\s*[:\-–]\s*(.+)$/i);
    if (m) { result.name = m[1].trim(); break; }
  }
  if (!result.name && lines.length > 0) result.name = lines[0].replace(/^#+\s*/, "");

  // Description: paragraph after "description:" or longest paragraph
  let descLines: string[] = [];
  let capturing = false;
  for (const line of lines) {
    if (/^(?:description|overview|summary|about)\s*[:\-–]/i.test(line)) {
      const inline = line.replace(/^[^:\-–]+[:\-–]\s*/, "");
      if (inline) descLines.push(inline);
      capturing = true;
    } else if (capturing && line.length > 20) {
      descLines.push(line);
      if (descLines.join(" ").length > 200) break;
    } else if (capturing && /^[a-z]+\s*[:\-–]/i.test(line)) {
      break;
    }
  }
  if (descLines.length === 0) {
    const longLines = lines.filter((l) => l.length > 40 && !/^[a-z\s]+[:\-–]/i.test(l));
    if (longLines.length > 0) descLines = longLines.slice(0, 3);
  }
  if (descLines.length > 0) result.description = descLines.join(" ").slice(0, 400);

  // Tags: look for "tags:", "keywords:", "labels:" patterns
  for (const line of lines) {
    const m = line.match(/^(?:tags?|keywords?|labels?)\s*[:\-–]\s*(.+)$/i);
    if (m) { result.tagsInput = m[1]; break; }
  }

  // Target audience
  for (const line of lines) {
    const m = line.match(/^(?:target\s*audience|audience|users?|for)\s*[:\-–]\s*(.+)$/i);
    if (m) { result.targetAudience = m[1].trim().slice(0, 120); break; }
  }

  // Monetization
  for (const line of lines) {
    const m = line.match(/^(?:monetization|revenue|model|pricing)\s*[:\-–]\s*(.+)$/i);
    if (m) {
      const val = m[1].toLowerCase();
      if (val.includes("subscript")) result.monetizationModel = "Subscription";
      else if (val.includes("one.time") || val.includes("purchase")) result.monetizationModel = "One-time purchase";
      else if (val.includes("usage")) result.monetizationModel = "Usage-based";
      else if (val.includes("lead")) result.monetizationModel = "Lead generation";
      else if (val.includes("marketplace") || val.includes("fee")) result.monetizationModel = "Marketplace fee";
      break;
    }
  }

  return result;
}

export function BusinessCreationFlow({
  session,
  initialSource,
  initialIdeaTitle,
  initialIdeaDescription,
}: BusinessCreationFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [planText, setPlanText] = useState("");
  const [showPlanImport, setShowPlanImport] = useState(false);
  const [formState, setFormState] = useState<BusinessCreationFormState>({
    name: getSeededBusinessName(initialIdeaTitle),
    description: initialIdeaDescription ?? "",
    category: "",
    tagsInput: "",
    targetAudience: "",
    monetizationModel: "",
  });

  const tags = useMemo(
    () =>
      Array.from(
        new Set(
          formState.tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ),
    [formState.tagsInput],
  );
  const canContinue =
    Boolean(formState.name.trim()) &&
    Boolean(formState.description.trim()) &&
    Boolean(formState.category.trim()) &&
    Boolean(formState.targetAudience.trim()) &&
    tags.length > 1;

  function updateField<Key extends keyof BusinessCreationFormState>(
    key: Key,
    value: BusinessCreationFormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleImportPlan() {
    const parsed = parsePlanText(planText);
    setFormState((current) => ({
      ...current,
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.tagsInput ? { tagsInput: parsed.tagsInput } : {}),
      ...(parsed.targetAudience ? { targetAudience: parsed.targetAudience } : {}),
      ...(parsed.monetizationModel ? { monetizationModel: parsed.monetizationModel } : {}),
    }));
    setShowPlanImport(false);
    setPlanText("");
  }

  function handleSubmit() {
    if (!canContinue) {
      setError("Complete the required fields before creating the workspace.");
      return;
    }

    setError(null);
    startTransition(() => {
      void fetch("/api/mock-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          category: formState.category,
          tags,
          targetAudience: formState.targetAudience,
          monetizationModel: formState.monetizationModel || undefined,
          source: initialSource,
          sourceIdeaTitle: initialIdeaTitle || undefined,
          sourceIdeaDescription: initialIdeaDescription || undefined,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(payload.error ?? "Unable to create the mock business.");
          }

          router.push("/business");
          router.refresh();
        })
        .catch((submissionError: unknown) => {
          setError(
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to create the mock business.",
          );
        });
    });
  }

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,rgba(20,152,154,0.08),rgba(16,37,58,0.04)_50%,rgba(255,255,255,0.04))] p-5 md:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Business Creation
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Turn an idea into an Eden workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
              This is a mocked creation flow only. Eden will keep the new business local to the
              current session, switch into the business layer when needed, and open the Business
              Workspace with the new context active.
            </p>
            {initialIdeaTitle ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Ask Eden seed
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{initialIdeaTitle}</p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {initialIdeaDescription ??
                    "This idea came from Ask Eden and is now ready for the mocked business review flow."}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Active session
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{session.user.displayName}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                If this session is not already a business user, Eden will switch into the shared
                business-role test account before opening the workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Flow
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StepPill active={step === 1} label="Details" />
                <StepPill active={step === 2} label="Review" />
                <StepPill active={false} label="Workspace" />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.section
            key="business-creation-form"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="rounded-[28px] border border-white/8 bg-white/[0.06] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Step 1
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Define the business/app
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Capture the core positioning Eden needs before it stages the workspace.
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                Required mock setup
              </span>
            </div>

            {/* Plan import toggle */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowPlanImport((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#14989a]/30 bg-[#14989a]/8 px-4 py-3 text-left transition-colors hover:bg-[#14989a]/12"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Import from plan
                  </p>
                  <p className="mt-0.5 text-sm text-white/50">
                    Paste a business plan, idea notes, or brief — Eden will pre-fill the form fields
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                  {showPlanImport ? "Close" : "Paste plan"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {showPlanImport ? (
                  <motion.div
                    key="plan-import"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-2xl border border-[#14989a]/25 bg-[#14989a]/8 p-4">
                      <p className="text-xs text-white/50">
                        Paste anything — a product description, pitch deck notes, or bullet points. Eden will extract the name, description, tags, audience, and monetization model.
                      </p>
                      <textarea
                        value={planText}
                        onChange={(e) => setPlanText(e.target.value)}
                        rows={7}
                        placeholder={"Business: Northstar Studio\nDescription: An AI-powered habit tracking platform...\nTags: AI, habit, productivity\nTarget audience: Busy professionals\nMonetization: Subscription"}
                        className="mt-3 w-full rounded-xl border border-white/8 bg-[#0d1f30] px-4 py-3 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-[#14989a]/50 focus:ring-1 focus:ring-[#14989a]/30"
                      />
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          onClick={handleImportPlan}
                          disabled={!planText.trim()}
                          className="rounded-xl border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Extract &amp; fill form
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPlanImport(false); setPlanText(""); }}
                          className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-white/50 transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField label="Business or app name" required>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Northstar Builder Studio"
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
              </FormField>

              <FormField label="Category" required>
                <select
                  value={formState.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.label}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Short description"
                required
                className="md:col-span-2"
              >
                <textarea
                  value={formState.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe the product, offer, or builder workspace in one compact paragraph."
                  rows={5}
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
              </FormField>

              <FormField
                label="Tags"
                required
                hint="Comma-separated. Add at least two so the mocked release checklist starts in a usable state."
              >
                <input
                  type="text"
                  value={formState.tagsInput}
                  onChange={(event) => updateField("tagsInput", event.target.value)}
                  placeholder="AI assistant, habit design, consumer app"
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
                {tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </FormField>

              <FormField label="Target audience" required>
                <input
                  type="text"
                  value={formState.targetAudience}
                  onChange={(event) => updateField("targetAudience", event.target.value)}
                  placeholder="Independent creators, busy parents, distributed teams"
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
              </FormField>

              <FormField label="Monetization model" hint="Optional placeholder for future pricing logic.">
                <select
                  value={formState.monetizationModel}
                  onChange={(event) => updateField("monetizationModel", event.target.value)}
                  className="w-full rounded-2xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                >
                  <option value="">Select a placeholder model</option>
                  {monetizationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!canContinue) {
                    setError("Complete the required fields before continuing to review.");
                    return;
                  }

                  setError(null);
                  setStep(2);
                }}
                className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-accent-soft/70"
              >
                Review business plan
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(initialSource === "business_dashboard" ? "/business" : "/consumer")
                }
                className="rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-eden-ring hover:text-white"
              >
                {initialSource === "business_dashboard" ? "Back to workspace" : "Back to Ask Eden"}
              </button>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="business-creation-review"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="rounded-[28px] border border-white/8 bg-white/[0.06] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Step 2
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Review the mocked business plan
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Confirm the planned workspace before Eden activates it in the Business Dashboard.
                </p>
              </div>
              <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                Idea-to-business review
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <div className="space-y-4">
                <ReviewCard
                  label="Business / app"
                  value={formState.name}
                  detail={formState.description}
                />
                <ReviewCard
                  label="Positioning"
                  value={`${formState.category} for ${formState.targetAudience}`}
                  detail={
                    formState.monetizationModel
                      ? `Monetization placeholder: ${formState.monetizationModel}.`
                      : "Monetization is still open and will stay as a placeholder in the workspace."
                  }
                />
                <ReviewCard
                  label="Tags"
                  value={tags.join(", ")}
                  detail="These will be carried into the mocked business metadata, service shell, and discovery framing."
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(239,246,255,0.76),rgba(255,255,255,0.98))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Workspace handoff
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Eden will create:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-white/50">
                    <li>A draft business profile</li>
                    <li>An active service shell</li>
                    <li>A launch project ready for pipeline controls</li>
                    <li>A local activity trail for the release history surfaces</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {initialSource === "ask_eden" ? "Ask Eden idea handoff" : "Business workspace starter"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {initialIdeaTitle
                      ? `${initialIdeaTitle} is the current seed concept for this mocked workspace.`
                      : "This business is being started directly from the Business Dashboard entry state."}
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit}
                className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Creating workspace..." : "Enter Business Workspace"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-eden-ring hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                Back to details
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
};

function FormField({ label, children, required = false, hint, className }: FormFieldProps) {
  return (
    <label className={className}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        {required ? (
          <span className="rounded-full bg-eden-bg px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/50">
            Required
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-white/50">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

type ReviewCardProps = {
  label: string;
  value: string;
  detail: string;
};

function ReviewCard({ label, value, detail }: ReviewCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-eden-bg/55 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/50">{detail}</p>
    </div>
  );
}

type StepPillProps = {
  label: string;
  active: boolean;
};

function StepPill({ label, active }: StepPillProps) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${
        active
          ? "border-eden-ring bg-eden-accent-soft text-white"
          : "border-white/8 bg-white/[0.06] text-white/50"
      }`}
    >
      {label}
    </span>
  );
}

function getSeededBusinessName(seedTitle?: string) {
  if (!seedTitle) {
    return "";
  }

  return seedTitle
    .replace(
      /\b(Launch Sprint|Builder Extension|Membership Path|Workspace Prototype|Builder Sprint|Service Packaging|Growth Path)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

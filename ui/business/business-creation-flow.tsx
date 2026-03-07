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
        className="overflow-hidden rounded-[32px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(255,237,213,0.82),rgba(255,255,255,0.96)_54%,rgba(219,234,254,0.82))] p-5 md:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Business Creation
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
              Turn an idea into an Eden workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
              This is a mocked creation flow only. Eden will keep the new business local to the
              current session, switch into the business layer when needed, and open the Business
              Workspace with the new context active.
            </p>
            {initialIdeaTitle ? (
              <div className="mt-4 rounded-2xl border border-eden-edge bg-white/88 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Ask Eden seed
                </p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">{initialIdeaTitle}</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {initialIdeaDescription ??
                    "This idea came from Ask Eden and is now ready for the mocked business review flow."}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Active session
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">{session.user.displayName}</p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">
                If this session is not already a business user, Eden will switch into the shared
                business-role test account before opening the workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
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
            className="rounded-[28px] border border-eden-edge bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Step 1
                </p>
                <h2 className="mt-2 text-xl font-semibold text-eden-ink">
                  Define the business/app
                </h2>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Capture the core positioning Eden needs before it stages the workspace.
                </p>
              </div>
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Required mock setup
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField label="Business or app name" required>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Northstar Builder Studio"
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
              </FormField>

              <FormField label="Category" required>
                <select
                  value={formState.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
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
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
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
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
                {tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-eden-edge bg-white px-3 py-1 text-xs text-eden-muted"
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
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                />
              </FormField>

              <FormField label="Monetization model" hint="Optional placeholder for future pricing logic.">
                <select
                  value={formState.monetizationModel}
                  onChange={(event) => updateField("monetizationModel", event.target.value)}
                  className="w-full rounded-2xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
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
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
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
                className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
              >
                Review business plan
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(initialSource === "business_dashboard" ? "/business" : "/consumer")
                }
                className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
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
            className="rounded-[28px] border border-eden-edge bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Step 2
                </p>
                <h2 className="mt-2 text-xl font-semibold text-eden-ink">
                  Review the mocked business plan
                </h2>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Confirm the planned workspace before Eden activates it in the Business Dashboard.
                </p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800">
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
                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(239,246,255,0.76),rgba(255,255,255,0.98))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Workspace handoff
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    Eden will create:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-eden-muted">
                    <li>A draft business profile</li>
                    <li>An active service shell</li>
                    <li>A launch project ready for pipeline controls</li>
                    <li>A local activity trail for the release history surfaces</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {initialSource === "ask_eden" ? "Ask Eden idea handoff" : "Business workspace starter"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {initialIdeaTitle
                      ? `${initialIdeaTitle} is the current seed concept for this mocked workspace.`
                      : "This business is being started directly from the Business Dashboard entry state."}
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit}
                className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Creating workspace..." : "Enter Business Workspace"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStep(1)}
                className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink disabled:cursor-not-allowed disabled:opacity-70"
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
        <span className="text-sm font-semibold text-eden-ink">{label}</span>
        {required ? (
          <span className="rounded-full bg-eden-bg px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-eden-muted">
            Required
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-eden-muted">{hint}</p> : null}
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
    <div className="rounded-2xl border border-eden-edge bg-eden-bg/55 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">{label}</p>
      <p className="mt-2 text-base font-semibold text-eden-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-eden-muted">{detail}</p>
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
          ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
          : "border-eden-edge bg-white text-eden-muted"
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

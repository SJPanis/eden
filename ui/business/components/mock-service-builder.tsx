"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createEdenAgent } from "@/modules/eden-ai/eden-agent";
import type { EdenServiceDraftResponse } from "@/modules/eden-ai/eden-types";
import { type EdenDiscoverySnapshot, categories } from "@/modules/core/mock-data";
import {
  type ServiceDraftFormValues,
  parseServiceDraftTags,
} from "@/ui/business/components/service-draft-shared";

type MockServiceBuilderProps = {
  businessId: string;
  businessName: string;
  businessDescription: string;
  activeServiceName?: string;
  defaultCategory: string;
  defaultTags: string[];
  discoverySnapshot: EdenDiscoverySnapshot;
  formValues: ServiceDraftFormValues;
  onFormValuesChange: (nextValues: ServiceDraftFormValues) => void;
  onResetForm: () => void;
  initiallyOpen?: boolean;
};

type GeneratedVariant = {
  id: string;
  response: EdenServiceDraftResponse;
};

const pricingOptions = [
  "Subscription",
  "One-time purchase",
  "Usage-based",
  "Lead generation",
  "Eden Leaf’s",
];
const edenAgent = createEdenAgent();

export function MockServiceBuilder({
  businessId,
  businessName,
  businessDescription,
  activeServiceName,
  defaultCategory,
  defaultTags,
  discoverySnapshot,
  formValues,
  onFormValuesChange,
  onResetForm,
  initiallyOpen = false,
}: MockServiceBuilderProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [error, setError] = useState<string | null>(null);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [variantPrompt, setVariantPrompt] = useState("");
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [appliedVariantId, setAppliedVariantId] = useState<string | null>(null);
  const tags = useMemo(() => parseServiceDraftTags(formValues.tagsInput), [formValues.tagsInput]);
  const canSubmit =
    Boolean(formValues.name.trim()) &&
    Boolean(formValues.description.trim()) &&
    Boolean(formValues.category.trim()) &&
    tags.length >= 2;

  function applyGeneratedDraft(variant: GeneratedVariant) {
    const { response } = variant;

    onFormValuesChange({
      name: response.draft.name,
      description: response.draft.description,
      category: response.draft.category,
      tagsInput: response.draft.suggestedTags.join(", "),
      pricingModel: response.draft.pricingModel,
      pricePerUse: formValues.pricePerUse,
      automationDescription: response.draft.automationSummary,
    });
    setAppliedVariantId(variant.id);
    setIsOpen(true);
  }

  function handleGenerateVariant() {
    const prompt = generatorPrompt.trim();
    const isSamePrompt = variantPrompt === prompt;
    const nextVariantIndex = isSamePrompt ? generatedVariants.length : 0;

    if (!prompt) {
      setError("Enter a short prompt before generating a service idea.");
      return;
    }

    setError(null);
    startGenerating(() => {
      void edenAgent
        .generateServiceDraft({
          prompt,
          timestamp: new Date().toISOString(),
          discoverySnapshot,
          variantIndex: nextVariantIndex,
          context: {
            businessId,
            businessName,
            businessDescription,
            activeServiceName,
            defaultCategory,
            defaultTags,
          },
        })
        .then((response) => {
          const nextVariant = {
            id: `variant-${response.variantIndex + 1}-${response.generatedAt}`,
            response,
          };

          setVariantPrompt(prompt);
          setAppliedVariantId((currentValue) => (isSamePrompt ? currentValue : null));
          setGeneratedVariants((currentVariants) =>
            isSamePrompt ? [...currentVariants, nextVariant] : [nextVariant],
          );
        })
        .catch((generationError: unknown) => {
          setError(
            generationError instanceof Error
              ? generationError.message
              : "Unable to generate a mocked service draft.",
          );
        });
    });
  }

  function handleSubmit() {
    if (!canSubmit) {
      setError("Complete the required service fields before staging this draft.");
      return;
    }

    setError(null);
    startSaving(() => {
      void fetch("/api/mock-services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          name: formValues.name,
          description: formValues.description,
          category: formValues.category,
          tags,
          pricingModel: formValues.pricingModel || undefined,
          pricePerUse: formValues.pricePerUse.trim()
            ? Number.parseInt(formValues.pricePerUse.trim(), 10)
            : undefined,
          pricingType: formValues.pricePerUse.trim() ? "per_use" : undefined,
          pricingUnit: formValues.pricePerUse.trim() ? "credits" : undefined,
          automationDescription: formValues.automationDescription || undefined,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(payload.error ?? "Unable to stage the local service draft.");
          }

          setIsOpen(false);
          setGeneratorPrompt("");
          setVariantPrompt("");
          setGeneratedVariants([]);
          setAppliedVariantId(null);
          onResetForm();
          router.refresh();
        })
        .catch((submissionError: unknown) => {
          setError(
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to stage the local service draft.",
          );
        });
    });
  }

  return (
    <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Service Innovator
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Generate a mocked service idea with Ask Eden or open the editor directly, then stage
            the draft into the existing build, test, ready, and publish workflow.
          </p>
        </div>
        <button
          type="button"
          disabled={isGenerating || isSaving}
          onClick={() => {
            setError(null);
            setIsOpen((value) => !value);
          }}
          className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isOpen ? "Close Editor" : "Open Editor"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Ask Eden Generator
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Generate a mocked service draft from a short business idea, automation concept, or
              tool concept. Compare the variants here, then apply the one you want into the
              editor before saving.
            </p>
          </div>
          <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
            Eden AI adapter
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={generatorPrompt}
            onChange={(event) => setGeneratorPrompt(event.target.value)}
            placeholder="Describe a business idea, automation concept, or tool concept"
            className="w-full rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
          />
          <button
            type="button"
            disabled={isGenerating || isSaving}
            onClick={handleGenerateVariant}
            className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? "Generating..." : "Generate Service Idea"}
          </button>
          <button
            type="button"
            disabled={
              isGenerating ||
              isSaving ||
              !generatorPrompt.trim() ||
              !generatedVariants.length ||
              generatorPrompt.trim() !== variantPrompt
            }
            onClick={handleGenerateVariant}
            className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? "Generating..." : "Regenerate Variant"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/50">
          Try prompts like `AI workflow for habit coaching`, `automation concept for creator QA`,
          or `tool concept for home setup planning`.
        </p>
        {generatedVariants.length > 0 && generatorPrompt.trim() !== variantPrompt ? (
          <p className="mt-2 text-xs leading-5 text-white/50">
            The prompt changed. Generate a new service idea to start a fresh comparison set for
            the updated prompt.
          </p>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {generatedVariants.length ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 12 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Generated Variants
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Compare mocked service directions side by side, then explicitly apply one
                    variant into the editable innovator form.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                    {generatedVariants.length} variants
                  </span>
                  {appliedVariantId ? (
                    <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-300">
                      Variant applied
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {generatedVariants.map((variant) => {
                  const isApplied = appliedVariantId === variant.id;

                  return (
                    <motion.article
                      key={variant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`rounded-2xl border p-4 transition-colors ${
                        isApplied
                          ? "border-[#2dd4bf]/50 bg-white/[0.05]"
                          : "border-[rgba(45,212,191,0.07)] bg-white/[0.025]/50"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                            Variant {variant.response.variantIndex + 1}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {variant.response.draft.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/50">
                            {variant.response.draft.description}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                            Confidence
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {variant.response.routeDecision.confidence}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Category</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {variant.response.draft.category}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Pricing</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {variant.response.draft.pricingModel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">Suggested tags</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {variant.response.draft.suggestedTags.map((tag) => (
                            <span
                              key={`${variant.id}-${tag}`}
                              className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/50"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          Automation summary
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/50">
                          {variant.response.draft.automationSummary}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {variant.response.routeDecision.routes.map((route) => (
                          <span
                            key={`${variant.id}-${route}`}
                            className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50"
                          >
                            {route.replaceAll("_", " ")}
                          </span>
                        ))}
                        {variant.response.routeDecision.signals.map((signal) => (
                          <span
                            key={`${variant.id}-${signal}`}
                            className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/50"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            applyGeneratedDraft(variant);
                          }}
                          className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20"
                        >
                          {isApplied ? "Applied to Form" : "Apply to Form"}
                        </button>
                        <span className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm text-white/50">
                          Generated for {businessName}
                        </span>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 12 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025]/45 p-4">
              <p className="text-sm leading-6 text-white/50">
                {appliedVariantId
                  ? "A generated variant has been applied to the form. Review the fields, adjust the copy, then stage it into the active workspace."
                  : "Manual mode is open. You can fill the draft from scratch or compare generated variants above and apply one to the form first."}
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Service name" required>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      name: event.target.value,
                    })
                  }
                  placeholder="Momentum Studio Session"
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                />
              </Field>

              <Field label="Category" required>
                <select
                  value={formValues.category}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      category: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                >
                  <option value="">Select a category</option>
                  {categories.map((entry) => (
                    <option key={entry.id} value={entry.label}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Short description" required className="md:col-span-2">
                <textarea
                  value={formValues.description}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Describe the service offer, the outcome, and the experience in one compact paragraph."
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                />
              </Field>

              <Field label="Tags" required hint="Comma-separated. Add at least two.">
                <input
                  type="text"
                  value={formValues.tagsInput}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      tagsInput: event.target.value,
                    })
                  }
                  placeholder="focus, AI assistant, workflow"
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                />
              </Field>

              <Field label="Pricing model" hint="Placeholder only.">
                <select
                  value={formValues.pricingModel}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      pricingModel: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                >
                  <option value="">Select a pricing placeholder</option>
                  {pricingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Price per use"
                hint="Optional stored monetization value used for usage analytics and earnings projections."
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formValues.pricePerUse}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      pricePerUse: event.target.value,
                    })
                  }
                  placeholder="120"
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                />
              </Field>

              <Field
                label="AI / automation description"
                hint="Optional. Describe the mock automation layer."
                className="md:col-span-2"
              >
                <textarea
                  value={formValues.automationDescription}
                  onChange={(event) =>
                    onFormValuesChange({
                      ...formValues,
                      automationDescription: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Optional notes on agents, automations, copilots, or AI workflow behavior."
                  className="w-full rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-eden-ring/40"
                />
              </Field>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSaving || isGenerating}
                onClick={handleSubmit}
                className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Staging service..." : "Stage Service Draft"}
              </button>
              <button
                type="button"
                disabled={isSaving || isGenerating}
                onClick={() => {
                  setError(null);
                  setIsOpen(false);
                }}
                className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                Close Editor
              </button>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
};

function Field({ label, children, required = false, hint, className }: FieldProps) {
  return (
    <label className={className}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        {required ? (
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/50">
            Required
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-white/50">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

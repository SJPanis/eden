"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createEdenAgent } from "@/modules/eden-ai/eden-agent";
import type {
  EdenBusinessAssistantAction,
  EdenWorkspaceAssistantDraftPatch,
  EdenWorkspaceAssistantContext,
} from "@/modules/eden-ai/eden-types";
import {
  buildMockBusinessAssistantHistoryEntry,
  type EdenMockBusinessAssistantHistoryEntry,
  upsertMockBusinessAssistantHistoryEntry,
} from "@/modules/core/assistant/mock-business-assistant-history";
import type { EdenDiscoverySnapshot } from "@/modules/core/mock-data";
import {
  formatPipelineTimestamp,
  getPipelineStatusLabel,
} from "@/modules/core/pipeline/mock-pipeline";

type BusinessAiAssistantPanelProps = {
  businessId: string;
  context: EdenWorkspaceAssistantContext;
  discoverySnapshot: EdenDiscoverySnapshot;
  initialHistory: EdenMockBusinessAssistantHistoryEntry[];
  onApplyPatch: (patch: EdenWorkspaceAssistantDraftPatch) => void;
  onOpenEditor?: () => void;
  onResponseFocus?: (entry: EdenMockBusinessAssistantHistoryEntry | null) => void;
};

type AssistantActionCard = {
  action: EdenBusinessAssistantAction;
  title: string;
  description: string;
  resultHint: string;
};

const assistantActionCards: AssistantActionCard[] = [
  {
    action: "generate_description",
    title: "Generate Description",
    description: "Turn the current service draft into sharper marketplace copy.",
    resultHint: "Writes a stronger description back into the editable draft.",
  },
  {
    action: "suggest_improvements",
    title: "Suggest Improvements",
    description: "Tighten tags, pricing framing, and automation positioning.",
    resultHint: "Produces a focused improvement pass with draft updates you can apply.",
  },
  {
    action: "prepare_for_publish",
    title: "Prepare for Publish",
    description: "Generate a mocked publish-ready pass from the current service context.",
    resultHint: "Refreshes the service copy for a cleaner published presentation.",
  },
  {
    action: "create_packaging_variant",
    title: "Create Packaging Variant",
    description: "Generate another packaging direction using the same Eden AI builder path.",
    resultHint: "Creates a fresh variant without overwriting the current draft automatically.",
  },
];

const edenAgent = createEdenAgent();

export function BusinessAiAssistantPanel({
  businessId,
  context,
  discoverySnapshot,
  initialHistory,
  onApplyPatch,
  onOpenEditor,
  onResponseFocus,
}: BusinessAiAssistantPanelProps) {
  const [activeAction, setActiveAction] = useState<EdenBusinessAssistantAction>(
    "generate_description",
  );
  const [historyEntries, setHistoryEntries] = useState<EdenMockBusinessAssistantHistoryEntry[]>(
    initialHistory,
  );
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null);
  const [appliedHistoryEntryId, setAppliedHistoryEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, startRunning] = useTransition();
  const [actionRunCounts, setActionRunCounts] = useState<
    Record<EdenBusinessAssistantAction, number>
  >({
    generate_description: 0,
    suggest_improvements: 0,
    prepare_for_publish: 0,
    create_packaging_variant: 0,
  });
  const selectedHistoryEntry =
    historyEntries.find((entry) => entry.id === selectedHistoryEntryId) ??
    historyEntries[0] ??
    null;
  const publishChecklistSuggestions = selectedHistoryEntry?.checklistSuggestions ?? [];

  const patchPreviewItems = useMemo(() => {
    const patch = selectedHistoryEntry?.draftPatch;

    if (!patch) {
      return [];
    }

    return [
      patch.name ? { id: "name", label: "Service name", value: patch.name } : null,
      patch.description
        ? { id: "description", label: "Description", value: patch.description }
        : null,
      patch.category ? { id: "category", label: "Category", value: patch.category } : null,
      patch.suggestedTags?.length
        ? {
            id: "tags",
            label: "Suggested tags",
            value: patch.suggestedTags.join(", "),
          }
        : null,
      patch.pricingModel
        ? { id: "pricing", label: "Pricing model", value: patch.pricingModel }
        : null,
      patch.automationSummary
        ? {
            id: "automation",
            label: "Automation summary",
            value: patch.automationSummary,
          }
        : null,
    ].filter(Boolean) as Array<{ id: string; label: string; value: string }>;
  }, [selectedHistoryEntry]);

  function handleRunAction(action: EdenBusinessAssistantAction) {
    const variantIndex = actionRunCounts[action];

    setActiveAction(action);
    setError(null);

    startRunning(() => {
      void edenAgent
        .runBusinessAssistant({
          action,
          prompt: buildAssistantPrompt(action, context),
          timestamp: new Date().toISOString(),
          discoverySnapshot,
          variantIndex,
          context,
        })
        .then(async (response) => {
          const nextEntry = buildMockBusinessAssistantHistoryEntry({
            businessId,
            response,
          });

          setHistoryEntries((currentEntries) =>
            upsertMockBusinessAssistantHistoryEntry(nextEntry, currentEntries),
          );
          setSelectedHistoryEntryId(nextEntry.id);
          setAppliedHistoryEntryId(null);
          setActionRunCounts((currentCounts) => ({
            ...currentCounts,
            [action]: currentCounts[action] + 1,
          }));
          onResponseFocus?.(nextEntry);

          const persistenceResponse = await fetch("/api/mock-assistant-history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              businessId,
              entry: nextEntry,
            }),
          });

          if (!persistenceResponse.ok) {
            const payload = (await persistenceResponse.json().catch(() => ({}))) as {
              error?: string;
            };

            throw new Error(
              payload.error ??
                "Assistant output ran, but the local history could not be persisted.",
            );
          }
        })
        .catch((assistantError: unknown) => {
          setError(
            assistantError instanceof Error
              ? assistantError.message
              : "Unable to run the mocked Business AI Assistant.",
          );
        });
    });
  }

  function handleApply() {
    const patch = selectedHistoryEntry?.draftPatch;

    if (!patch || !selectedHistoryEntry) {
      return;
    }

    onApplyPatch(patch);
    onOpenEditor?.();
    setAppliedHistoryEntryId(selectedHistoryEntry.id);
  }

  function handleSelectHistoryEntry(entry: EdenMockBusinessAssistantHistoryEntry) {
    setSelectedHistoryEntryId(entry.id);
    setActiveAction(entry.action);
    setError(null);
    onResponseFocus?.(entry);
  }

  function handleClearHistory() {
    const previousEntries = historyEntries;
    const previousSelectedHistoryEntryId = selectedHistoryEntryId;
    const previousAppliedHistoryEntryId = appliedHistoryEntryId;

    setError(null);
    setHistoryEntries([]);
    setSelectedHistoryEntryId(null);
    setAppliedHistoryEntryId(null);
    onResponseFocus?.(null);

    startRunning(() => {
      void fetch(
        `/api/mock-assistant-history?businessId=${encodeURIComponent(businessId)}`,
        {
          method: "DELETE",
        },
      )
        .then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
            };

            throw new Error(
              payload.error ?? "Unable to clear the local assistant history.",
            );
          }
        })
        .catch((clearError: unknown) => {
          setHistoryEntries(previousEntries);
          setSelectedHistoryEntryId(previousSelectedHistoryEntryId);
          setAppliedHistoryEntryId(previousAppliedHistoryEntryId);
          onResponseFocus?.(
            previousEntries.find((entry) => entry.id === previousSelectedHistoryEntryId) ??
              previousEntries[0] ??
              null,
          );
          setError(
            clearError instanceof Error
              ? clearError.message
              : "Unable to clear the local assistant history.",
          );
        });
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.98))] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Active draft context
              </p>
              <p className="mt-2 text-lg font-semibold text-eden-ink">{context.serviceName}</p>
            </div>
            <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
              {getPipelineStatusLabel(context.pipelineStatus)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-eden-muted">{context.description}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Category</p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">{context.category}</p>
            </div>
            <div className="rounded-2xl border border-eden-edge bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Pricing</p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">{context.pricingModel}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {context.tags.map((tag) => (
              <span
                key={`assistant-context-${tag}`}
                className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] text-eden-muted"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Automation summary
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">{context.automationSummary}</p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.07, delayChildren: 0.04 },
            },
          }}
          className="grid gap-3"
        >
          {assistantActionCards.map((card) => {
            const isActive = activeAction === card.action;

            return (
              <motion.button
                key={card.action}
                type="button"
                disabled={isRunning}
                onClick={() => handleRunAction(card.action)}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  isActive
                    ? "border-eden-ring bg-[linear-gradient(135deg,rgba(239,246,255,0.88),rgba(255,255,255,0.98))]"
                    : "border-eden-edge bg-white hover:border-eden-ring hover:bg-eden-bg"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eden-ink">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{card.description}</p>
                  </div>
                  <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                    {isRunning && isActive ? "Running" : "Mock AI"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-eden-muted">{card.resultHint}</p>
              </motion.button>
            );
          })}
        </motion.div>

        <div className="rounded-2xl border border-eden-edge bg-white p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Session history
              </p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">
                Re-open prior assistant runs from this workspace session and re-apply useful draft patches.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {historyEntries.length} runs
              </span>
              <button
                type="button"
                disabled={isRunning || historyEntries.length === 0}
                onClick={handleClearHistory}
                className="rounded-full border border-eden-edge bg-white px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted transition-colors hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Assistant History
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {historyEntries.length ? (
              historyEntries.map((entry) => {
                const isSelected = selectedHistoryEntry?.id === entry.id;
                const isApplied = appliedHistoryEntryId === entry.id;

                return (
                  <motion.button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectHistoryEntry(entry)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-eden-ring bg-[linear-gradient(135deg,rgba(239,246,255,0.88),rgba(255,255,255,0.98))]"
                        : "border-eden-edge bg-eden-bg/45 hover:border-eden-ring hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-eden-ink">
                            {formatActionLabel(entry.action)}
                          </p>
                          {isApplied ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-emerald-700">
                              Applied
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-eden-ink">{entry.headline}</p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">{entry.preview}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Timestamp
                        </p>
                        <p className="mt-1 text-sm font-semibold text-eden-ink">
                          {formatPipelineTimestamp(entry.generatedAt)}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-eden-edge bg-eden-bg/40 p-4 text-sm leading-6 text-eden-muted">
                Assistant history will appear here after the first mocked AI run.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="wait" initial={false}>
          {selectedHistoryEntry ? (
            <motion.div
              key={selectedHistoryEntry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-2xl border border-eden-edge bg-white p-4 shadow-[0_18px_40px_-30px_rgba(19,33,68,0.35)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Assistant output
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-eden-ink">
                    {selectedHistoryEntry.headline}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                    {formatActionLabel(selectedHistoryEntry.action)}
                  </span>
                  <span className="rounded-full border border-eden-edge bg-white px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                    {formatPipelineTimestamp(selectedHistoryEntry.generatedAt)}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-eden-muted">
                {selectedHistoryEntry.summary}
              </p>

              <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/55 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                  Recommended next moves
                </p>
                <div className="mt-3 space-y-3">
                  {selectedHistoryEntry.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-eden-accent" />
                      <p className="text-sm leading-6 text-eden-muted">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {publishChecklistSuggestions.length ? (
                <div className="mt-4 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,237,213,0.42),rgba(255,255,255,0.98))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Publish checklist guidance
                  </p>
                  <div className="mt-4 space-y-3">
                    {publishChecklistSuggestions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-eden-edge bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${getChecklistStateClasses(
                              item.state,
                            )}`}
                          />
                          <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                        <p className="mt-2 text-sm leading-6 text-eden-ink">
                          {item.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {patchPreviewItems.length ? (
                <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Editable draft patch
                      </p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">
                        Apply any useful output back into the shared Service Builder draft.
                      </p>
                    </div>
                    {appliedHistoryEntryId === selectedHistoryEntry.id ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-emerald-700">
                        Applied to draft
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {patchPreviewItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/55 p-3"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-ink">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleApply}
                      className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
                    >
                      {selectedHistoryEntry.applyLabel ?? "Apply to Draft"}
                    </button>
                    <span className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm text-eden-muted">
                      Local mock output only
                    </span>
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="assistant-placeholder"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-2xl border border-dashed border-eden-edge bg-white/80 p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Assistant output
              </p>
              <p className="mt-3 text-lg font-semibold text-eden-ink">
                Run an AI action against the active service draft
              </p>
              <p className="mt-3 text-sm leading-6 text-eden-muted">
                The Business AI Assistant reads the current service draft, category, tags,
                automation summary, pricing placeholder, and pipeline status. Use one of the
                actions on the left to generate a mocked improvement pass, publish prep draft, or
                packaging variant from the shared Eden AI adapter.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function buildAssistantPrompt(
  action: EdenBusinessAssistantAction,
  context: EdenWorkspaceAssistantContext,
) {
  return [
    formatActionLabel(action),
    context.businessName,
    context.businessDescription,
    context.serviceName,
    context.category,
    context.description,
    context.tags.join(" "),
    context.pricingModel,
    context.automationSummary,
    context.pipelineStatus,
    `${context.readinessPercent}% readiness`,
    context.nextMilestone,
    ...context.publishChecklist.map(
      (item) => `${item.label} ${item.state} ${item.detail}`,
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

function formatActionLabel(action: EdenBusinessAssistantAction) {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getChecklistStateClasses(
  state: NonNullable<EdenMockBusinessAssistantHistoryEntry["checklistSuggestions"]>[number]["state"],
) {
  if (state === "done") {
    return "bg-emerald-500";
  }

  if (state === "pending") {
    return "bg-amber-400";
  }

  return "bg-slate-300";
}

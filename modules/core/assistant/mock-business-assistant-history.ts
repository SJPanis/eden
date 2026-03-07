import type {
  EdenBusinessAssistantAction,
  EdenWorkspaceAssistantChecklistSuggestion,
  EdenWorkspaceAssistantDraftPatch,
  EdenWorkspaceAssistantResponse,
} from "@/modules/eden-ai/eden-types";

export type EdenMockBusinessAssistantHistoryEntry = {
  id: string;
  businessId: string;
  action: EdenBusinessAssistantAction;
  generatedAt: string;
  headline: string;
  summary: string;
  preview: string;
  bullets: string[];
  draftPatch?: EdenWorkspaceAssistantDraftPatch;
  applyLabel?: string;
  checklistSuggestions?: EdenWorkspaceAssistantChecklistSuggestion[];
};

export const mockBusinessAssistantHistoryCookieName =
  "eden_v1_mock_business_ai_history";

const allowedAssistantActions = new Set<EdenBusinessAssistantAction>([
  "generate_description",
  "suggest_improvements",
  "prepare_for_publish",
  "create_packaging_variant",
]);
const maxHistoryEntriesPerBusiness = 3;
const maxHistoryEntriesTotal = 6;

export function buildMockBusinessAssistantHistoryEntry(options: {
  businessId: string;
  response: EdenWorkspaceAssistantResponse;
}) {
  const { businessId, response } = options;

  return {
    id: `${response.action}-${response.generatedAt}`,
    businessId,
    action: response.action,
    generatedAt: response.generatedAt,
    headline: truncateValue(response.output.headline, 120),
    summary: truncateValue(response.summary, 220),
    preview: truncateValue(getAssistantHistoryPreview(response), 220),
    bullets: response.output.bullets.map((bullet) => truncateValue(bullet, 180)).slice(0, 3),
    draftPatch: sanitizeDraftPatch(response.output.draftPatch),
    applyLabel: response.output.applyLabel
      ? truncateValue(response.output.applyLabel, 60)
      : undefined,
    checklistSuggestions: sanitizeChecklistSuggestions(
      response.output.checklistSuggestions,
    ),
  } satisfies EdenMockBusinessAssistantHistoryEntry;
}

export function parseMockBusinessAssistantHistoryCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return sortAssistantHistoryEntries(
      parsedValue.filter(isMockBusinessAssistantHistoryEntry),
    );
  } catch {
    return [];
  }
}

export function serializeMockBusinessAssistantHistoryCookie(
  entries: EdenMockBusinessAssistantHistoryEntry[],
) {
  return JSON.stringify(entries);
}

export function upsertMockBusinessAssistantHistoryEntry(
  entry: EdenMockBusinessAssistantHistoryEntry,
  entries: EdenMockBusinessAssistantHistoryEntry[] = [],
) {
  const currentBusinessEntries = entries
    .filter((item) => item.businessId === entry.businessId && item.id !== entry.id)
    .slice(0, maxHistoryEntriesPerBusiness - 1);
  const otherBusinessEntries = entries.filter(
    (item) => item.businessId !== entry.businessId && item.id !== entry.id,
  );

  return sortAssistantHistoryEntries([entry, ...currentBusinessEntries, ...otherBusinessEntries]).slice(
    0,
    maxHistoryEntriesTotal,
  );
}

export function getMockBusinessAssistantHistoryForBusiness(
  businessId: string,
  entries: EdenMockBusinessAssistantHistoryEntry[] = [],
) {
  return sortAssistantHistoryEntries(
    entries.filter((entry) => entry.businessId === businessId),
  ).slice(0, maxHistoryEntriesPerBusiness);
}

export function clearMockBusinessAssistantHistoryForBusiness(
  businessId: string,
  entries: EdenMockBusinessAssistantHistoryEntry[] = [],
) {
  return entries.filter((entry) => entry.businessId !== businessId);
}

function getAssistantHistoryPreview(response: EdenWorkspaceAssistantResponse) {
  return (
    response.output.checklistSuggestions?.find((item) => item.state !== "done")?.suggestion ??
    response.output.bullets[0] ??
    response.output.summary ??
    response.summary
  );
}

function sanitizeDraftPatch(patch?: EdenWorkspaceAssistantDraftPatch) {
  if (!patch) {
    return undefined;
  }

  const nextPatch: EdenWorkspaceAssistantDraftPatch = {};

  if (patch.name?.trim()) {
    nextPatch.name = truncateValue(patch.name, 120);
  }

  if (patch.description?.trim()) {
    nextPatch.description = truncateValue(patch.description, 420);
  }

  if (patch.category?.trim()) {
    nextPatch.category = truncateValue(patch.category, 80);
  }

  if (patch.suggestedTags?.length) {
    nextPatch.suggestedTags = patch.suggestedTags
      .map((tag) => truncateValue(tag, 40))
      .filter(Boolean)
      .slice(0, 6);
  }

  if (patch.pricingModel?.trim()) {
    nextPatch.pricingModel = truncateValue(patch.pricingModel, 80);
  }

  if (patch.automationSummary?.trim()) {
    nextPatch.automationSummary = truncateValue(patch.automationSummary, 260);
  }

  return Object.keys(nextPatch).length ? nextPatch : undefined;
}

function sanitizeChecklistSuggestions(
  suggestions?: EdenWorkspaceAssistantChecklistSuggestion[],
) {
  if (!suggestions?.length) {
    return undefined;
  }

  return suggestions.slice(0, 5).map((item) => ({
    id: truncateValue(item.id, 80),
    label: truncateValue(item.label, 80),
    state: item.state,
    detail: truncateValue(item.detail, 180),
    suggestion: truncateValue(item.suggestion, 220),
  }));
}

function sortAssistantHistoryEntries(entries: EdenMockBusinessAssistantHistoryEntry[]) {
  return [...entries].sort((left, right) => {
    const rightTime = new Date(right.generatedAt).getTime();
    const leftTime = new Date(left.generatedAt).getTime();

    return rightTime - leftTime;
  });
}

function truncateValue(value: string, maxLength: number) {
  const normalizedValue = value.trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function isMockBusinessAssistantHistoryEntry(
  value: unknown,
): value is EdenMockBusinessAssistantHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockBusinessAssistantHistoryEntry>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.businessId === "string" &&
    typeof candidate.generatedAt === "string" &&
    typeof candidate.headline === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.preview === "string" &&
    typeof candidate.action === "string" &&
    allowedAssistantActions.has(candidate.action as EdenBusinessAssistantAction) &&
    Array.isArray(candidate.bullets) &&
    candidate.bullets.every((bullet) => typeof bullet === "string") &&
    (typeof candidate.applyLabel === "string" ||
      typeof candidate.applyLabel === "undefined") &&
    isDraftPatch(candidate.draftPatch) &&
    isChecklistSuggestions(candidate.checklistSuggestions)
  );
}

function isDraftPatch(value: unknown): value is EdenWorkspaceAssistantDraftPatch | undefined {
  if (typeof value === "undefined") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenWorkspaceAssistantDraftPatch>;

  return (
    (typeof candidate.name === "string" || typeof candidate.name === "undefined") &&
    (typeof candidate.description === "string" ||
      typeof candidate.description === "undefined") &&
    (typeof candidate.category === "string" || typeof candidate.category === "undefined") &&
    (typeof candidate.pricingModel === "string" ||
      typeof candidate.pricingModel === "undefined") &&
    (typeof candidate.automationSummary === "string" ||
      typeof candidate.automationSummary === "undefined") &&
    (Array.isArray(candidate.suggestedTags)
      ? candidate.suggestedTags.every((tag) => typeof tag === "string")
      : typeof candidate.suggestedTags === "undefined")
  );
}

function isChecklistSuggestions(
  value: unknown,
): value is EdenWorkspaceAssistantChecklistSuggestion[] | undefined {
  if (typeof value === "undefined") {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<EdenWorkspaceAssistantChecklistSuggestion>;

      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.detail === "string" &&
        typeof candidate.suggestion === "string" &&
        (candidate.state === "done" ||
          candidate.state === "pending" ||
          candidate.state === "blocked")
      );
    })
  );
}

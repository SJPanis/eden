import {
  buildDiscoverySnapshot,
  getDiscoveryBusinessById,
  getDiscoveryBusinessForService,
  getDiscoveryServiceById,
  loadDiscoverySnapshot,
  loadPublishedBusinesses,
  loadPublishedServices,
  listPublishedBusinesses,
  listPublishedServices,
  type EdenDiscoverySnapshot,
} from "@/modules/core/services/discovery-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import type {
  EdenMockBusiness,
  EdenMockProject,
  EdenMockService,
} from "@/modules/core/mock-data/platform-types";

export type { EdenDiscoverySnapshot } from "@/modules/core/services/discovery-service";

type EdenDiscoveryOptions = EdenReadServiceOptions;

type RankedRecord<T> = {
  record: T;
  score: number;
  priority: number;
  label: string;
};

const discoveryStopWords = new Set([
  "a",
  "an",
  "and",
  "app",
  "book",
  "build",
  "business",
  "businesses",
  "create",
  "find",
  "for",
  "help",
  "i",
  "idea",
  "ideas",
  "im",
  "launch",
  "looking",
  "me",
  "my",
  "need",
  "service",
  "services",
  "show",
  "something",
  "start",
  "the",
  "to",
  "want",
  "with",
]);

const categoryKeywords: Record<string, string[]> = {
  Productivity: ["focus", "habit", "momentum", "planning", "planner", "productivity", "workflow"],
  Wellness: ["calm", "fitness", "recovery", "reset", "stress", "wellness", "ritual"],
  Learning: ["cohort", "creator", "education", "learn", "learning", "skill", "workshop"],
  Home: ["home", "household", "living", "operations", "setup", "smart"],
};

export {
  buildDiscoverySnapshot,
  getDiscoveryBusinessById,
  getDiscoveryBusinessForService,
  getDiscoveryServiceById,
};

export function getMarketplaceServices(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return listPublishedServices(options, limit);
}

export async function loadMarketplaceServices(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return loadPublishedServices(options, limit);
}

export function getTrendingBusinesses(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return listPublishedBusinesses(options, limit);
}

export async function loadTrendingBusinesses(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return loadPublishedBusinesses(options, limit);
}

export async function loadAskEdenSnapshot(options: EdenDiscoveryOptions = {}) {
  return loadDiscoverySnapshot(options);
}

export function getAskEdenRecommendedServices(
  prompt: string,
  limit = 3,
  snapshot: EdenDiscoverySnapshot = buildDiscoverySnapshot(),
) {
  const tokens = tokenizePrompt(prompt);
  const inferredCategory = inferDiscoveryCategory(prompt, tokens);
  const businessLookup = new Map(
    snapshot.businessCatalog.map((business) => [business.id, business]),
  );

  return snapshot.marketplaceServices
    .map((service) =>
      rankService(service, businessLookup.get(service.businessId) ?? null, tokens, inferredCategory),
    )
    .sort(compareRankedRecords)
    .slice(0, limit)
    .map((entry) => entry.record);
}

export function getAskEdenBusinessMatches(
  prompt: string,
  limit = 3,
  snapshot: EdenDiscoverySnapshot = buildDiscoverySnapshot(),
) {
  const tokens = tokenizePrompt(prompt);
  const inferredCategory = inferDiscoveryCategory(prompt, tokens);
  const serviceLookup = new Map(
    snapshot.serviceCatalog.map((service) => [service.id, service]),
  );

  return snapshot.marketplaceBusinesses
    .map((business) =>
      rankBusiness(
        business,
        serviceLookup.get(business.featuredServiceId) ?? null,
        tokens,
        inferredCategory,
      ),
    )
    .sort(compareRankedRecords)
    .slice(0, limit)
    .map((entry) => entry.record);
}

export function getAskEdenRelevantProjects(
  prompt: string,
  limit = 3,
  snapshot: EdenDiscoverySnapshot = buildDiscoverySnapshot(),
) {
  const tokens = tokenizePrompt(prompt);
  const inferredCategory = inferDiscoveryCategory(prompt, tokens);
  const businessLookup = new Map(
    snapshot.businessCatalog.map((business) => [business.id, business]),
  );

  return snapshot.projects
    .map((project) =>
      rankProject(project, businessLookup.get(project.businessId) ?? null, tokens, inferredCategory),
    )
    .sort(compareRankedRecords)
    .slice(0, limit)
    .map((entry) => entry.record);
}

export function inferDiscoveryCategory(prompt: string, existingTokens?: string[]) {
  const tokens = existingTokens ?? tokenizePrompt(prompt);
  const normalizedPrompt = normalizeText(prompt);
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.reduce((total, keyword) => {
      if (normalizedPrompt.includes(keyword)) {
        return total + 3;
      }

      return tokens.includes(keyword) ? total + 2 : total;
    }, 0);

    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

function rankService(
  service: EdenMockService,
  business: EdenMockBusiness | null,
  tokens: string[],
  inferredCategory: string | null,
): RankedRecord<EdenMockService> {
  let score = getServiceStatusScore(service.status);

  if (business?.featuredServiceId === service.id) {
    score += 3;
  }

  if (inferredCategory && inferredCategory === service.category) {
    score += 18;
  }

  score += getTokenMatchScore(tokens, [service.title], 8);
  score += getTokenMatchScore(tokens, [service.category], 7);
  score += getTokenMatchScore(tokens, service.tags, 6);
  score += getTokenMatchScore(tokens, [service.description, service.summary], 4);
  score += getTokenMatchScore(tokens, [business?.name ?? "", business?.summary ?? ""], 3);

  return {
    record: service,
    score,
    priority: business?.publishReadinessPercent ?? 0,
    label: service.title,
  };
}

function rankBusiness(
  business: EdenMockBusiness,
  featuredService: EdenMockService | null,
  tokens: string[],
  inferredCategory: string | null,
): RankedRecord<EdenMockBusiness> {
  let score = getBusinessStatusScore(business.status);

  if (inferredCategory && inferredCategory === business.category) {
    score += 18;
  }

  score += getTokenMatchScore(tokens, [business.name], 8);
  score += getTokenMatchScore(tokens, [business.category], 7);
  score += getTokenMatchScore(tokens, business.tags, 6);
  score += getTokenMatchScore(tokens, [business.summary, business.description, business.tagline], 4);
  score += getTokenMatchScore(
    tokens,
    [
      featuredService?.title ?? "",
      featuredService?.description ?? "",
      featuredService?.summary ?? "",
    ],
    3,
  );

  return {
    record: business,
    score,
    priority: business.publishReadinessPercent,
    label: business.name,
  };
}

function rankProject(
  project: EdenMockProject,
  business: EdenMockBusiness | null,
  tokens: string[],
  inferredCategory: string | null,
): RankedRecord<EdenMockProject> {
  let score = getProjectStatusScore(project.status);

  if (inferredCategory && business?.category === inferredCategory) {
    score += 14;
  }

  score += getTokenMatchScore(tokens, [project.title], 8);
  score += getTokenMatchScore(tokens, [project.type], 6);
  score += getTokenMatchScore(tokens, [project.summary, project.milestone], 4);
  score += getTokenMatchScore(
    tokens,
    [business?.name ?? "", business?.category ?? "", ...(business?.tags ?? [])],
    3,
  );

  return {
    record: project,
    score,
    priority: project.progress,
    label: project.title,
  };
}

function getTokenMatchScore(tokens: string[], fields: string[], weight: number) {
  if (tokens.length === 0) {
    return 0;
  }

  const normalizedFields = fields.map(normalizeText).filter(Boolean);

  return tokens.reduce((total, token) => {
    const hasMatch = normalizedFields.some((field) => field.includes(token));
    return hasMatch ? total + weight : total;
  }, 0);
}

function tokenizePrompt(prompt: string) {
  const normalizedPrompt = normalizeText(prompt);

  if (!normalizedPrompt) {
    return [];
  }

  return Array.from(
    new Set(
      normalizedPrompt
        .split(" ")
        .filter((token) => token.length > 2 && !discoveryStopWords.has(token)),
    ),
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getServiceStatusScore(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("published")) {
    return 5;
  }

  if (normalizedStatus.includes("testing") || normalizedStatus.includes("ready")) {
    return 4;
  }

  return 2;
}

function getBusinessStatusScore(status: EdenMockBusiness["status"]) {
  if (status === "published") {
    return 5;
  }

  if (status === "testing") {
    return 4;
  }

  return 2;
}

function getProjectStatusScore(status: EdenMockProject["status"]) {
  if (status === "Testing") {
    return 5;
  }

  if (status === "Building") {
    return 4;
  }

  return 2;
}

function compareRankedRecords<T>(left: RankedRecord<T>, right: RankedRecord<T>) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.priority !== left.priority) {
    return right.priority - left.priority;
  }

  return left.label.localeCompare(right.label);
}

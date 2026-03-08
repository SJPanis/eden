import {
  businesses as platformBusinesses,
  getBusinessById as getMockBusinessById,
  projects as platformProjects,
  services as platformServices,
} from "@/modules/core/mock-data/platform-data";
import type {
  EdenMockBusiness,
  EdenMockPipelineRecord,
  EdenMockProject,
  EdenMockReleaseStatus,
  EdenMockService,
} from "@/modules/core/mock-data/platform-types";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import { mergeCatalogLayers } from "@/modules/core/services/read-record-mappers";

export type EdenDiscoverySnapshot = {
  marketplaceServices: EdenMockService[];
  marketplaceBusinesses: EdenMockBusiness[];
  projects: EdenMockProject[];
  serviceCatalog: EdenMockService[];
  businessCatalog: EdenMockBusiness[];
};

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

export function buildDiscoverySnapshot(
  options: EdenDiscoveryOptions = {},
): EdenDiscoverySnapshot {
  const { createdBusiness, workspaceServices = [] } = options;
  const localProjects = workspaceServices.map((entry) => entry.project);
  const businessSource = mergeCatalogLayers(platformBusinesses, [createdBusiness?.business]);
  const serviceSource = mergeCatalogLayers(platformServices, [
    createdBusiness?.service,
    ...workspaceServices.map((entry) => entry.service),
  ]);

  return createDiscoverySnapshotFromSources(
    options,
    businessSource,
    serviceSource,
    localProjects,
  );
}

export function createDiscoverySnapshotFromSources(
  options: EdenDiscoveryOptions,
  businessSource: EdenMockBusiness[],
  serviceSource: EdenMockService[],
  localProjects: EdenMockProject[] = [],
): EdenDiscoverySnapshot {
  const { pipelineRecords = [], createdBusiness, workspaceServices = [] } = options;

  const businessCatalog = businessSource.map((business) => {
    const relatedServices = serviceSource.filter((service) => service.businessId === business.id);
    const activeServiceId = resolveActiveServiceId(
      business,
      relatedServices,
      pipelineRecords,
      workspaceServices,
    );
    const effectiveStatus = resolveBusinessReleaseStatus(
      business,
      relatedServices,
      pipelineRecords,
    );

    return {
      ...business,
      featuredServiceId: activeServiceId,
      status: effectiveStatus,
      visibility: getVisibilityLabel(effectiveStatus),
      publishReadinessPercent:
        effectiveStatus === "published"
          ? Math.max(100, business.publishReadinessPercent)
          : business.publishReadinessPercent,
      nextMilestone:
        effectiveStatus === "published"
          ? "Monitor live usage and iterate"
          : business.nextMilestone,
    } satisfies EdenMockBusiness;
  });
  const businessLookup = new Map(businessCatalog.map((business) => [business.id, business]));
  const serviceCatalog = serviceSource.map((service) => {
    const business = businessLookup.get(service.businessId) ?? null;
    const effectiveStatus = resolveServiceReleaseStatus(service, business, pipelineRecords);

    return {
      ...service,
      status: getServiceStatusLabel(effectiveStatus),
    } satisfies EdenMockService;
  });
  const publishedBusinessIds = new Set(
    serviceCatalog
      .filter((service) => service.status.toLowerCase() === "published")
      .map((service) => service.businessId),
  );
  const marketplaceBusinesses = businessCatalog
    .filter((business) => publishedBusinessIds.has(business.id))
    .sort((left, right) => {
      if (right.publishReadinessPercent !== left.publishReadinessPercent) {
        return right.publishReadinessPercent - left.publishReadinessPercent;
      }

      return left.name.localeCompare(right.name);
    });
  const marketplaceServices = serviceCatalog
    .filter((service) => service.status.toLowerCase() === "published")
    .sort((left, right) => {
      const rightBusiness = businessLookup.get(right.businessId);
      const leftBusiness = businessLookup.get(left.businessId);
      const readinessDelta =
        (rightBusiness?.publishReadinessPercent ?? 0) -
        (leftBusiness?.publishReadinessPercent ?? 0);

      if (readinessDelta !== 0) {
        return readinessDelta;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    marketplaceServices,
    marketplaceBusinesses,
    projects: mergeCatalogRecord(platformProjects, createdBusiness?.project)
      .concat(localProjects)
      .filter(
        (project, index, projects) =>
          projects.findIndex((entry) => entry.id === project.id) === index,
      ),
    serviceCatalog,
    businessCatalog,
  };
}

export function getDiscoveryServiceById(
  id: string,
  options: EdenDiscoveryOptions = {},
) {
  return buildDiscoverySnapshot(options).serviceCatalog.find((service) => service.id === id) ?? null;
}

export function getDiscoveryBusinessById(
  id: string,
  options: EdenDiscoveryOptions = {},
) {
  return buildDiscoverySnapshot(options).businessCatalog.find((business) => business.id === id) ?? null;
}

export function getDiscoveryBusinessForService(
  serviceOrId: string | EdenMockService,
  options: EdenDiscoveryOptions = {},
) {
  const service =
    typeof serviceOrId === "string"
      ? getDiscoveryServiceById(serviceOrId, options)
      : serviceOrId;

  if (!service) {
    return null;
  }

  return (
    buildDiscoverySnapshot(options).businessCatalog.find(
      (business) => business.id === service.businessId,
    ) ??
    getMockBusinessById(service.businessId, options.createdBusiness)
  );
}

export function listPublishedServices(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  const services = buildDiscoverySnapshot(options).marketplaceServices;
  return typeof limit === "number" ? services.slice(0, limit) : services;
}

export function listPublishedBusinesses(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  const businesses = buildDiscoverySnapshot(options).marketplaceBusinesses;
  return typeof limit === "number" ? businesses.slice(0, limit) : businesses;
}

export function getMarketplaceServices(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return listPublishedServices(options, limit);
}

export function getTrendingBusinesses(
  options: EdenDiscoveryOptions = {},
  limit?: number,
) {
  return listPublishedBusinesses(options, limit);
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

function mergeCatalogRecord<T extends { id: string }>(records: T[], record?: T | null) {
  if (!record) {
    return records;
  }

  return [record, ...records.filter((entry) => entry.id !== record.id)];
}

function resolveActiveServiceId(
  business: EdenMockBusiness,
  relatedServices: EdenMockService[],
  pipelineRecords: EdenMockPipelineRecord[],
  workspaceServices: EdenReadServiceOptions["workspaceServices"] = [],
) {
  const storedRecord =
    pipelineRecords.find((record) => record.businessId === business.id) ?? null;

  if (storedRecord && relatedServices.some((service) => service.id === storedRecord.serviceId)) {
    return storedRecord.serviceId;
  }

  const localService = workspaceServices.find((entry) => entry.record.businessId === business.id);

  if (localService) {
    return localService.service.id;
  }

  return business.featuredServiceId;
}

function resolveBusinessReleaseStatus(
  business: EdenMockBusiness,
  relatedServices: EdenMockService[],
  pipelineRecords: EdenMockPipelineRecord[],
): EdenMockBusiness["status"] {
  const storedRecord = pipelineRecords.find((record) => record.businessId === business.id) ?? null;
  const statuses = relatedServices.map((service) =>
    resolveServiceReleaseStatus(service, business, pipelineRecords),
  );

  if (storedRecord?.status === "published" || statuses.includes("published")) {
    return "published";
  }

  if (
    storedRecord?.status === "ready" ||
    storedRecord?.status === "testing" ||
    statuses.includes("ready") ||
    statuses.includes("testing")
  ) {
    return "testing";
  }

  return "draft";
}

function resolveServiceReleaseStatus(
  service: EdenMockService,
  business: EdenMockBusiness | null,
  pipelineRecords: EdenMockPipelineRecord[],
): EdenMockReleaseStatus {
  const exactRecord =
    pipelineRecords.find(
      (record) =>
        record.businessId === service.businessId && record.serviceId === service.id,
    ) ?? null;

  if (exactRecord) {
    return exactRecord.status;
  }

  const businessRecord =
    business?.featuredServiceId === service.id
      ? pipelineRecords.find((record) => record.businessId === service.businessId) ?? null
      : null;

  if (businessRecord) {
    return businessRecord.status;
  }

  const normalizedStatus = service.status.toLowerCase();

  if (normalizedStatus.includes("publish") || business?.status === "published") {
    return "published";
  }

  if (normalizedStatus.includes("ready")) {
    return "ready";
  }

  if (normalizedStatus.includes("testing") || business?.status === "testing") {
    return "testing";
  }

  return "draft";
}

function getServiceStatusLabel(status: EdenMockReleaseStatus) {
  if (status === "published") {
    return "Published";
  }

  if (status === "ready") {
    return "Ready";
  }

  if (status === "testing") {
    return "Testing";
  }

  return "Draft";
}

function getVisibilityLabel(
  status: EdenMockReleaseStatus | EdenMockBusiness["status"],
) {
  if (status === "published") {
    return "Published";
  }

  if (status === "testing" || status === "ready") {
    return "Internal testing";
  }

  return "Private preview";
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

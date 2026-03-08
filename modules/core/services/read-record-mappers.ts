import type {
  EdenMockBusiness,
  EdenMockService,
  EdenMockUser,
} from "@/modules/core/mock-data/platform-types";
import type {
  EdenRepoBusinessRecord,
  EdenRepoPipelineStatus,
  EdenRepoServiceRecord,
  EdenRepoUserRecord,
} from "@/modules/core/repos/repo-types";

export function mapRepoBusinessToMockBusiness(
  business: EdenRepoBusinessRecord,
): EdenMockBusiness {
  return {
    id: business.id,
    name: business.name,
    ownerUserId: business.ownerUserId,
    status: business.status,
    category: business.category,
    tags: business.tags,
    description: business.description,
    summary:
      business.summary ??
      `${business.name} is a persisted Eden business in ${business.category.toLowerCase()}.`,
    tagline:
      business.tagline ??
      `${business.category} workspace for ${business.name.toLowerCase()}.`,
    visibility: business.visibility,
    teamLabel: business.teamLabel ?? "Prisma-backed workspace",
    creditBalanceCredits: business.creditBalanceCredits,
    publishReadinessPercent: business.publishReadinessPercent,
    nextMilestone: business.nextMilestone ?? "Continue workspace setup",
    featuredServiceId: business.featuredServiceId ?? "",
  };
}

export function mapRepoServiceToMockService(
  service: EdenRepoServiceRecord,
): EdenMockService {
  return {
    id: service.id,
    title: service.title,
    businessId: service.businessId,
    category: service.category,
    description: service.description,
    summary:
      service.summary ??
      `A persisted Eden service draft for ${service.category.toLowerCase()} discovery.`,
    status: formatRepoPipelineStatus(service.status),
    tags: service.tags,
  };
}

export function mapRepoUserToMockUser(
  user: EdenRepoUserRecord,
  fallbackUser?: EdenMockUser | null,
): EdenMockUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    status: user.status,
    role: user.role,
    edenBalanceCredits: user.edenBalanceCredits,
    summary:
      user.summary ??
      fallbackUser?.summary ??
      `${user.displayName} is a persisted Eden ${user.role} account.`,
    businessIds: fallbackUser?.businessIds ?? [],
    savedBusinessIds: fallbackUser?.savedBusinessIds ?? [],
    savedServiceIds: fallbackUser?.savedServiceIds ?? [],
  };
}

export function mergeCatalogLayers<T extends { id: string }>(
  baseRecords: T[],
  preferredRecords: Array<T | null | undefined>,
) {
  return [...preferredRecords.filter(Boolean) as T[], ...baseRecords].filter(
    (record, index, records) =>
      records.findIndex((entry) => entry.id === record.id) === index,
  );
}

function formatRepoPipelineStatus(status: EdenRepoPipelineStatus) {
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

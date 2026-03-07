import {
  BusinessStatus,
  BusinessVisibility,
  PipelineStatus,
  Prisma,
} from "@prisma/client";
import type {
  EdenRepoBusinessRecord,
  EdenRepoBusinessVisibility,
  EdenRepoPipelineStatus,
  EdenRepoServiceRecord,
} from "@/modules/core/repos/repo-types";

export const prismaBusinessSelect = {
  id: true,
  ownerUserId: true,
  name: true,
  status: true,
  category: true,
  tags: true,
  description: true,
  visibility: true,
  teamLabel: true,
  creditBalanceCredits: true,
  publishReadinessPercent: true,
  nextMilestone: true,
  summary: true,
  tagline: true,
  targetAudience: true,
  monetizationModel: true,
  featuredServiceId: true,
} satisfies Prisma.BusinessSelect;

export const prismaServiceSelect = {
  id: true,
  businessId: true,
  title: true,
  category: true,
  tags: true,
  description: true,
  summary: true,
  status: true,
  pricingModel: true,
  automationSummary: true,
  publishedAt: true,
} satisfies Prisma.ServiceSelect;

type PrismaBusinessReadRecord = Prisma.BusinessGetPayload<{
  select: typeof prismaBusinessSelect;
}>;

type PrismaServiceReadRecord = Prisma.ServiceGetPayload<{
  select: typeof prismaServiceSelect;
}>;

export function mapPrismaBusinessToRepoRecord(
  business: PrismaBusinessReadRecord,
): EdenRepoBusinessRecord {
  return {
    id: business.id,
    ownerUserId: business.ownerUserId,
    name: business.name,
    status: mapPrismaBusinessStatus(business.status),
    category: business.category,
    tags: business.tags,
    description: business.description,
    visibility: mapPrismaBusinessVisibility(business.visibility),
    teamLabel: business.teamLabel,
    creditBalanceCredits: business.creditBalanceCredits,
    publishReadinessPercent: business.publishReadinessPercent,
    nextMilestone: business.nextMilestone,
    summary: business.summary,
    tagline: business.tagline,
    targetAudience: business.targetAudience,
    monetizationModel: business.monetizationModel,
    featuredServiceId: business.featuredServiceId,
  };
}

export function mapPrismaServiceToRepoRecord(
  service: PrismaServiceReadRecord,
): EdenRepoServiceRecord {
  return {
    id: service.id,
    businessId: service.businessId,
    title: service.title,
    category: service.category,
    tags: service.tags,
    description: service.description,
    summary: service.summary,
    status: mapPrismaPipelineStatus(service.status),
    pricingModel: service.pricingModel,
    automationSummary: service.automationSummary,
    publishedAt: service.publishedAt,
  };
}

function mapPrismaBusinessStatus(status: BusinessStatus): EdenRepoBusinessRecord["status"] {
  if (status === BusinessStatus.PUBLISHED) {
    return "published";
  }

  if (status === BusinessStatus.TESTING) {
    return "testing";
  }

  return "draft";
}

function mapPrismaBusinessVisibility(
  visibility: BusinessVisibility,
): EdenRepoBusinessVisibility {
  if (visibility === BusinessVisibility.PUBLISHED) {
    return "Published";
  }

  if (visibility === BusinessVisibility.INTERNAL_TESTING) {
    return "Internal testing";
  }

  return "Private preview";
}

function mapPrismaPipelineStatus(status: PipelineStatus): EdenRepoPipelineStatus {
  if (status === PipelineStatus.PUBLISHED) {
    return "published";
  }

  if (status === PipelineStatus.READY) {
    return "ready";
  }

  if (status === PipelineStatus.TESTING) {
    return "testing";
  }

  return "draft";
}

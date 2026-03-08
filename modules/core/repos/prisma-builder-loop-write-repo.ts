import {
  BusinessMemberRole,
  BusinessStatus,
  EdenRole,
  BusinessVisibility,
  PipelineStatus,
  UserStatus,
} from "@prisma/client";
import { getUserById } from "@/modules/core/mock-data/platform-data";
import type { BuilderLoopWriteRepo } from "@/modules/core/repos/builder-loop-write-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type {
  EdenPersistentBusinessWrite,
  EdenPersistentPipelineEventWrite,
  EdenPersistentPipelineRecordWrite,
  EdenPersistentServiceDraftWrite,
} from "@/modules/core/services/builder-loop-write-types";

export function createPrismaBuilderLoopWriteRepo(
  prisma: EdenPrismaClient,
): BuilderLoopWriteRepo {
  return {
    async createBusiness(input) {
      await upsertShadowOwnerUser(prisma, input.ownerUserId);

      await prisma.$transaction(async (transaction) => {
        await transaction.business.upsert({
          where: {
            id: input.businessId,
          },
          update: {
            name: input.name,
            status: BusinessStatus.DRAFT,
            category: input.category,
            tags: input.tags,
            description: input.description,
            summary: buildBusinessSummary(input),
            tagline: buildBusinessTagline(input),
            targetAudience: input.targetAudience,
            monetizationModel: input.monetizationModel,
            visibility: BusinessVisibility.PRIVATE_PREVIEW,
            teamLabel: "Hybrid migration placeholder",
            publishReadinessPercent: 0,
            nextMilestone: "Complete build setup",
          },
          create: {
            id: input.businessId,
            ownerUserId: input.ownerUserId,
            name: input.name,
            status: BusinessStatus.DRAFT,
            category: input.category,
            tags: input.tags,
            description: input.description,
            summary: buildBusinessSummary(input),
            tagline: buildBusinessTagline(input),
            targetAudience: input.targetAudience,
            monetizationModel: input.monetizationModel,
            visibility: BusinessVisibility.PRIVATE_PREVIEW,
            teamLabel: "Hybrid migration placeholder",
            publishReadinessPercent: 0,
            nextMilestone: "Complete build setup",
            createdAt: new Date(input.createdAt),
          },
        });

        await transaction.businessMember.upsert({
          where: {
            businessId_userId: {
              businessId: input.businessId,
              userId: input.ownerUserId,
            },
          },
          update: {
            role: BusinessMemberRole.OWNER,
            title: "Workspace Owner",
          },
          create: {
            businessId: input.businessId,
            userId: input.ownerUserId,
            role: BusinessMemberRole.OWNER,
            title: "Workspace Owner",
          },
        });
      });

      // TODO: Persist onboarding/source metadata once the schema adds dedicated builder-origin fields.
    },

    async createServiceDraft(input) {
      await prisma.$transaction(async (transaction) => {
        await transaction.service.upsert({
          where: {
            id: input.serviceId,
          },
          update: {
            title: input.name,
            category: input.category,
            tags: input.tags,
            description: input.description,
            summary: buildServiceSummary(input),
            status: PipelineStatus.DRAFT,
            pricingModel: input.pricingModel,
            pricePerUse: input.pricePerUse,
            pricingType: input.pricingType,
            pricingUnit: input.pricingUnit,
            automationSummary: input.automationDescription,
            publishedAt: null,
            updatedAt: new Date(input.updatedAt),
          },
          create: {
            id: input.serviceId,
            businessId: input.businessId,
            title: input.name,
            category: input.category,
            tags: input.tags,
            description: input.description,
            summary: buildServiceSummary(input),
            status: PipelineStatus.DRAFT,
            pricingModel: input.pricingModel,
            pricePerUse: input.pricePerUse,
            pricingType: input.pricingType,
            pricingUnit: input.pricingUnit,
            automationSummary: input.automationDescription,
            createdAt: new Date(input.createdAt),
            updatedAt: new Date(input.updatedAt),
          },
        });

        await transaction.business.update({
          where: {
            id: input.businessId,
          },
          data: {
            featuredServiceId: input.serviceId,
            nextMilestone: "Complete build setup",
          },
        });
      });

      // TODO: Introduce a Project model before persisting `projectId` as a first-class build artifact.
    },

    async upsertPipelineRecord(input) {
      await prisma.pipelineRecord.upsert({
        where: {
          businessId_serviceId: {
            businessId: input.businessId,
            serviceId: input.serviceId,
          },
        },
        update: {
          projectId: input.projectId,
          status: toPrismaPipelineStatus(input.status),
          buildStarted: input.buildStarted,
          lastActionLabel: input.lastActionLabel,
          updatedAt: new Date(input.updatedAt),
        },
        create: {
          businessId: input.businessId,
          serviceId: input.serviceId,
          projectId: input.projectId,
          status: toPrismaPipelineStatus(input.status),
          buildStarted: input.buildStarted,
          lastActionLabel: input.lastActionLabel,
          createdAt: new Date(input.updatedAt),
          updatedAt: new Date(input.updatedAt),
        },
      });
    },

    async appendPipelineEvent(input) {
      const pipelineRecord = await prisma.pipelineRecord.findUnique({
        where: {
          businessId_serviceId: {
            businessId: input.businessId,
            serviceId: input.serviceId,
          },
        },
        select: {
          id: true,
        },
      });

      await prisma.pipelineEvent.upsert({
        where: {
          id: input.eventId,
        },
        update: {
          pipelineRecordId: pipelineRecord?.id,
          projectId: input.projectId,
          previousStatus: toPrismaPipelineStatus(input.previousStatus),
          newStatus: toPrismaPipelineStatus(input.newStatus),
          actorLabel: input.actor,
          detail: input.detail,
          occurredAt: new Date(input.timestamp),
        },
        create: {
          id: input.eventId,
          pipelineRecordId: pipelineRecord?.id,
          businessId: input.businessId,
          serviceId: input.serviceId,
          projectId: input.projectId,
          previousStatus: toPrismaPipelineStatus(input.previousStatus),
          newStatus: toPrismaPipelineStatus(input.newStatus),
          actorLabel: input.actor,
          detail: input.detail,
          occurredAt: new Date(input.timestamp),
          createdAt: new Date(input.timestamp),
        },
      });
    },
  };
}

async function upsertShadowOwnerUser(prisma: EdenPrismaClient, userId: string) {
  const mockUser = getUserById(userId);

  if (!mockUser) {
    throw new Error(
      `Prisma builder-loop writes require a known owner user. Missing mock user: ${userId}. Sync users before enabling dual_write or real_only mode.`,
    );
  }

  await prisma.user.upsert({
    where: {
      id: mockUser.id,
    },
    update: {
      username: mockUser.username,
      displayName: mockUser.displayName,
      role: toPrismaRole(mockUser.role),
      status: toPrismaUserStatus(mockUser.status),
      summary: mockUser.summary,
      edenBalanceCredits: mockUser.edenBalanceCredits,
    },
    create: {
      id: mockUser.id,
      username: mockUser.username,
      displayName: mockUser.displayName,
      role: toPrismaRole(mockUser.role),
      status: toPrismaUserStatus(mockUser.status),
      summary: mockUser.summary,
      edenBalanceCredits: mockUser.edenBalanceCredits,
    },
  });
}

function buildBusinessSummary(input: EdenPersistentBusinessWrite) {
  return `A persisted Eden workspace for ${input.targetAudience.toLowerCase()} in ${input.category.toLowerCase()}.`;
}

function buildBusinessTagline(input: EdenPersistentBusinessWrite) {
  return `${input.category} workspace for ${input.targetAudience.toLowerCase()}.`;
}

function buildServiceSummary(input: EdenPersistentServiceDraftWrite) {
  const pricingSummary =
    typeof input.pricePerUse === "number" && input.pricePerUse > 0
      ? `${input.pricePerUse.toLocaleString()} ${input.pricingUnit ?? "credits"} per use`
      : input.pricingModel
        ? `${input.pricingModel.toLowerCase()} pricing placeholders`
        : "placeholder pricing options";

  return `A persisted service-builder draft with ${pricingSummary} for ${input.category.toLowerCase()} discovery.`;
}

function toPrismaPipelineStatus(
  status: EdenPersistentPipelineRecordWrite["status"] | EdenPersistentPipelineEventWrite["newStatus"],
) {
  if (status === "published") {
    return PipelineStatus.PUBLISHED;
  }

  if (status === "ready") {
    return PipelineStatus.READY;
  }

  if (status === "testing") {
    return PipelineStatus.TESTING;
  }

  return PipelineStatus.DRAFT;
}

function toPrismaRole(role: "consumer" | "business" | "owner") {
  if (role === "owner") {
    return EdenRole.OWNER;
  }

  if (role === "business") {
    return EdenRole.BUSINESS;
  }

  return EdenRole.CONSUMER;
}

function toPrismaUserStatus(status: "active" | "review" | "frozen") {
  if (status === "review") {
    return UserStatus.REVIEW;
  }

  if (status === "frozen") {
    return UserStatus.FROZEN;
  }

  return UserStatus.ACTIVE;
}

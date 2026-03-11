import type { ServiceUsageRepo } from "@/modules/core/repos/service-usage-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoServiceUsageRecord } from "@/modules/core/repos/repo-types";
import { buildUsageSettlementSnapshot } from "@/modules/core/services/service-pricing";

export function createPrismaServiceUsageRepo(
  prisma: EdenPrismaClient,
): ServiceUsageRepo {
  return {
    async create(input) {
      const service = await prisma.service.findUnique({
        where: {
          id: input.serviceId,
        },
        select: {
          id: true,
          pricingModel: true,
          pricePerUse: true,
          pricingType: true,
          pricingUnit: true,
        },
      });

      if (!service) {
        return null;
      }

      const user = input.userId
        ? await prisma.user.findUnique({
            where: {
              id: input.userId,
            },
            select: {
              id: true,
            },
          })
        : null;
      const settlementSnapshot = buildUsageSettlementSnapshot(
        {
          pricePerUse: service.pricePerUse,
          pricingType: service.pricingType,
          pricingUnit: service.pricingUnit,
          pricingModel: service.pricingModel,
        },
        input.creditsUsed,
      );
      const usage = await prisma.serviceUsage.create({
        data: {
          serviceId: input.serviceId,
          userId: user?.id ?? null,
          executionKey: input.executionKey ?? null,
          usageType: input.usageType,
          creditsUsed: input.creditsUsed,
          grossCredits: input.grossCredits ?? settlementSnapshot.grossCredits,
          platformFeeCredits:
            input.platformFeeCredits ?? settlementSnapshot.platformFeeCredits,
          builderEarningsCredits:
            input.builderEarningsCredits ?? settlementSnapshot.builderEarningsCredits,
          createdAt: input.createdAt ?? new Date(),
        },
        include: {
          service: {
            select: {
              title: true,
              businessId: true,
              pricingModel: true,
              pricePerUse: true,
              pricingType: true,
              pricingUnit: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return mapUsageRecord(usage);
    },

    async findByExecutionKey(executionKey) {
      const usage = await prisma.serviceUsage.findUnique({
        where: {
          executionKey,
        },
        include: {
          service: {
            select: {
              title: true,
              businessId: true,
              pricingModel: true,
              pricePerUse: true,
              pricingType: true,
              pricingUnit: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return usage ? mapUsageRecord(usage) : null;
    },

    async listAll() {
      const usageRecords = await prisma.serviceUsage.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          service: {
            select: {
              title: true,
              businessId: true,
              pricingModel: true,
              pricePerUse: true,
              pricingType: true,
              pricingUnit: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return usageRecords.map(mapUsageRecord);
    },

    async getSummary() {
      const [totalUsageEvents, aggregate] = await prisma.$transaction([
        prisma.serviceUsage.count(),
        prisma.serviceUsage.aggregate({
          _sum: {
            creditsUsed: true,
          },
        }),
      ]);

      return {
        totalUsageEvents,
        totalCreditsUsed: aggregate._sum.creditsUsed ?? 0,
      };
    },
  };
}

function mapUsageRecord(usage: {
  id: string;
  serviceId: string;
  userId: string | null;
  executionKey: string | null;
  usageType: string;
  creditsUsed: number;
  grossCredits: number | null;
  platformFeeCredits: number | null;
  builderEarningsCredits: number | null;
  createdAt: Date;
  service: {
    title: string;
    businessId: string;
    pricingModel: string | null;
    pricePerUse: number | null;
    pricingType: string | null;
    pricingUnit: string | null;
    business: {
      name: string;
    };
  };
}): EdenRepoServiceUsageRecord {
  return {
    id: usage.id,
    serviceId: usage.serviceId,
    serviceTitle: usage.service.title,
    businessId: usage.service.businessId,
    businessName: usage.service.business.name,
    userId: usage.userId,
    executionKey: usage.executionKey,
    usageType: usage.usageType,
    creditsUsed: usage.creditsUsed,
    grossCredits: usage.grossCredits,
    platformFeeCredits: usage.platformFeeCredits,
    builderEarningsCredits: usage.builderEarningsCredits,
    servicePricingModel: usage.service.pricingModel,
    servicePricePerUse: usage.service.pricePerUse,
    servicePricingType: usage.service.pricingType,
    servicePricingUnit: usage.service.pricingUnit,
    createdAt: usage.createdAt,
  };
}

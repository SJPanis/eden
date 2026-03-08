import type { ServiceUsageRepo } from "@/modules/core/repos/service-usage-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";

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
      const usage = await prisma.serviceUsage.create({
        data: {
          serviceId: input.serviceId,
          userId: user?.id ?? null,
          usageType: input.usageType,
          creditsUsed: input.creditsUsed,
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

      return {
        id: usage.id,
        serviceId: usage.serviceId,
        serviceTitle: usage.service.title,
        businessId: usage.service.businessId,
        businessName: usage.service.business.name,
        userId: usage.userId,
        usageType: usage.usageType,
        creditsUsed: usage.creditsUsed,
        servicePricingModel: usage.service.pricingModel,
        servicePricePerUse: usage.service.pricePerUse,
        servicePricingType: usage.service.pricingType,
        servicePricingUnit: usage.service.pricingUnit,
        createdAt: usage.createdAt,
      };
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

      return usageRecords.map((usage) => ({
        id: usage.id,
        serviceId: usage.serviceId,
        serviceTitle: usage.service.title,
        businessId: usage.service.businessId,
        businessName: usage.service.business.name,
        userId: usage.userId,
        usageType: usage.usageType,
        creditsUsed: usage.creditsUsed,
        servicePricingModel: usage.service.pricingModel,
        servicePricePerUse: usage.service.pricePerUse,
        servicePricingType: usage.service.pricingType,
        servicePricingUnit: usage.service.pricingUnit,
        createdAt: usage.createdAt,
      }));
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

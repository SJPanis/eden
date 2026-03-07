import { PipelineStatus } from "@prisma/client";
import type { DiscoveryRepo } from "@/modules/core/repos/discovery-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  mapPrismaBusinessToRepoRecord,
  mapPrismaServiceToRepoRecord,
  prismaBusinessSelect,
  prismaServiceSelect,
} from "@/modules/core/repos/prisma-read-mappers";

export function createPrismaDiscoveryRepo(
  prisma: EdenPrismaClient,
): DiscoveryRepo {
  return {
    async getDiscoverySnapshot() {
      const [businesses, services, publishedServices] = await prisma.$transaction([
        prisma.business.findMany({
          orderBy: {
            name: "asc",
          },
          select: prismaBusinessSelect,
        }),
        prisma.service.findMany({
          orderBy: {
            title: "asc",
          },
          select: prismaServiceSelect,
        }),
        prisma.service.findMany({
          where: {
            status: PipelineStatus.PUBLISHED,
          },
          select: {
            id: true,
          },
        }),
      ]);

      return {
        businesses: businesses.map(mapPrismaBusinessToRepoRecord),
        services: services.map(mapPrismaServiceToRepoRecord),
        publishedServiceIds: publishedServices.map((service) => service.id),
      };
    },
  };
}

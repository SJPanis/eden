import { PipelineStatus } from "@prisma/client";
import type { ServiceRepo } from "@/modules/core/repos/service-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  mapPrismaServiceToRepoRecord,
  prismaServiceSelect,
} from "@/modules/core/repos/prisma-read-mappers";

export function createPrismaServiceRepo(prisma: EdenPrismaClient): ServiceRepo {
  return {
    async findById(serviceId) {
      const service = await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        select: prismaServiceSelect,
      });

      return service ? mapPrismaServiceToRepoRecord(service) : null;
    },

    async findByBusinessId(businessId) {
      const services = await prisma.service.findMany({
        where: {
          businessId,
        },
        orderBy: {
          title: "asc",
        },
        select: prismaServiceSelect,
      });

      return services.map(mapPrismaServiceToRepoRecord);
    },

    async listPublished() {
      const services = await prisma.service.findMany({
        where: {
          status: PipelineStatus.PUBLISHED,
        },
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            title: "asc",
          },
        ],
        select: prismaServiceSelect,
      });

      return services.map(mapPrismaServiceToRepoRecord);
    },
  };
}

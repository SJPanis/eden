import type { BusinessRepo } from "@/modules/core/repos/business-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  mapPrismaBusinessToRepoRecord,
  prismaBusinessSelect,
} from "@/modules/core/repos/prisma-read-mappers";

export function createPrismaBusinessRepo(prisma: EdenPrismaClient): BusinessRepo {
  return {
    async findById(businessId) {
      const business = await prisma.business.findUnique({
        where: {
          id: businessId,
        },
        select: prismaBusinessSelect,
      });

      return business ? mapPrismaBusinessToRepoRecord(business) : null;
    },

    async findByOwnerUserId(ownerUserId) {
      const businesses = await prisma.business.findMany({
        where: {
          ownerUserId,
        },
        orderBy: {
          name: "asc",
        },
        select: prismaBusinessSelect,
      });

      return businesses.map(mapPrismaBusinessToRepoRecord);
    },

    async list() {
      const businesses = await prisma.business.findMany({
        orderBy: {
          name: "asc",
        },
        select: prismaBusinessSelect,
      });

      return businesses.map(mapPrismaBusinessToRepoRecord);
    },
  };
}

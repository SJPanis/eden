import type { UserRepo } from "@/modules/core/repos/user-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  mapPrismaUserToRepoRecord,
  prismaUserSelect,
} from "@/modules/core/repos/prisma-read-mappers";

export function createPrismaUserRepo(prisma: EdenPrismaClient): UserRepo {
  return {
    async findById(userId) {
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: prismaUserSelect,
      });

      return user ? mapPrismaUserToRepoRecord(user) : null;
    },

    async findByUsername(username) {
      const user = await prisma.user.findUnique({
        where: {
          username,
        },
        select: prismaUserSelect,
      });

      return user ? mapPrismaUserToRepoRecord(user) : null;
    },

    async list() {
      const users = await prisma.user.findMany({
        orderBy: {
          displayName: "asc",
        },
        select: prismaUserSelect,
      });

      return users.map(mapPrismaUserToRepoRecord);
    },
  };
}

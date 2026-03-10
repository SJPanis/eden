import type { InternalLeavesUsageRepo } from "@/modules/core/repos/internal-leaves-usage-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoInternalLeavesUsageRecord } from "@/modules/core/repos/repo-types";

export function createPrismaInternalLeavesUsageRepo(
  prisma: EdenPrismaClient,
): InternalLeavesUsageRepo {
  return {
    async create(input) {
      const usage = await prisma.internalLeavesUsage.create({
        data: {
          businessId: input.businessId,
          userId: input.userId ?? null,
          amountCredits: input.amountCredits,
          usageType: input.usageType,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
        },
      });

      return mapInternalLeavesUsage(usage);
    },

    async listByBusinessId(input) {
      const usages = await prisma.internalLeavesUsage.findMany({
        where: {
          businessId: input.businessId,
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        take: input.limit ?? undefined,
      });

      return usages.map(mapInternalLeavesUsage);
    },

    async listAll(input = {}) {
      const usages = await prisma.internalLeavesUsage.findMany({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        take: input.limit ?? undefined,
      });

      return usages.map(mapInternalLeavesUsage);
    },
  };
}

function mapInternalLeavesUsage(usage: {
  id: string;
  businessId: string;
  userId: string | null;
  amountCredits: number;
  usageType: string;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}): EdenRepoInternalLeavesUsageRecord {
  return {
    id: usage.id,
    businessId: usage.businessId,
    userId: usage.userId,
    amountCredits: usage.amountCredits,
    usageType: usage.usageType,
    reference: usage.reference,
    notes: usage.notes,
    createdAt: usage.createdAt,
  };
}

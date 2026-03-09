import type { PayoutSettlementRepo } from "@/modules/core/repos/payout-settlement-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoPayoutSettlementRecord } from "@/modules/core/repos/repo-types";

export function createPrismaPayoutSettlementRepo(
  prisma: EdenPrismaClient,
): PayoutSettlementRepo {
  return {
    async create(input) {
      const settlement = await prisma.payoutSettlement.create({
        data: {
          businessId: input.businessId,
          amountCredits: input.amountCredits,
          status: mapStatusToPrisma(input.status ?? "settled"),
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          settledAt:
            input.status === "pending" || input.status === "canceled"
              ? null
              : (input.settledAt ?? new Date()),
        },
      });

      return mapPayoutSettlement(settlement);
    },

    async listByBusinessId(input) {
      const settlements = await prisma.payoutSettlement.findMany({
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

      return settlements.map(mapPayoutSettlement);
    },

    async listAll(input = {}) {
      const settlements = await prisma.payoutSettlement.findMany({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        take: input.limit ?? undefined,
      });

      return settlements.map(mapPayoutSettlement);
    },
  };
}

function mapPayoutSettlement(
  settlement: {
    id: string;
    businessId: string;
    amountCredits: number;
    status: "PENDING" | "SETTLED" | "CANCELED";
    reference: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    settledAt: Date | null;
  },
): EdenRepoPayoutSettlementRecord {
  return {
    id: settlement.id,
    businessId: settlement.businessId,
    amountCredits: settlement.amountCredits,
    status: mapStatusFromPrisma(settlement.status),
    reference: settlement.reference,
    notes: settlement.notes,
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
    settledAt: settlement.settledAt,
  };
}

function mapStatusToPrisma(status: EdenRepoPayoutSettlementRecord["status"]) {
  switch (status) {
    case "pending":
      return "PENDING" as const;
    case "canceled":
      return "CANCELED" as const;
    default:
      return "SETTLED" as const;
  }
}

function mapStatusFromPrisma(
  status: "PENDING" | "SETTLED" | "CANCELED",
): EdenRepoPayoutSettlementRecord["status"] {
  switch (status) {
    case "PENDING":
      return "pending";
    case "CANCELED":
      return "canceled";
    default:
      return "settled";
  }
}

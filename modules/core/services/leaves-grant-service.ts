import "server-only";

import type { EdenMockTransaction } from "@/modules/core/mock-data";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export async function recordOwnerLeavesGrant(input: {
  userId: string;
  grantedByUserId: string;
  amountCredits: number;
  note?: string | null;
}) {
  const prisma = getPrismaClient();

  return prisma.ownerLeavesGrant.create({
    data: {
      userId: input.userId,
      grantedByUserId: input.grantedByUserId,
      amountCredits: input.amountCredits,
      note: input.note ?? null,
    },
    select: {
      id: true,
      userId: true,
      grantedByUserId: true,
      amountCredits: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
      grantedByUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });
}

export async function loadOwnerLeavesGrantTransactions(limit = 40): Promise<EdenMockTransaction[]> {
  const prisma = getPrismaClient();
  const grants = await prisma.ownerLeavesGrant.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      userId: true,
      amountCredits: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
      grantedByUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  return grants.map((grant) => ({
    id: `owner-leaves-grant-${grant.id}`,
    userId: grant.userId,
    title: "Owner Leaves grant",
    amountLabel: `+${grant.amountCredits} Leaves`,
    creditsDelta: grant.amountCredits,
    direction: "inflow",
    kind: "adjustment",
    detail: buildGrantDetail(grant),
    timestamp: formatGrantTimestamp(grant.createdAt),
    simulated: false,
  }));
}

function buildGrantDetail(grant: {
  amountCredits: number;
  note: string | null;
  user: {
    username: string;
    displayName: string;
  };
  grantedByUser: {
    username: string;
    displayName: string;
  };
}) {
  const baseDetail = `${grant.grantedByUser.displayName} granted ${grant.amountCredits.toLocaleString()} Leaves to ${grant.user.displayName}.`;
  return grant.note ? `${baseDetail} ${grant.note}` : baseDetail;
}

function formatGrantTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

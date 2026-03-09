import type { CreditsTopUpPaymentRepo } from "@/modules/core/repos/credits-topup-payment-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoCreditsTopUpPaymentRecord } from "@/modules/core/repos/repo-types";

export function createPrismaCreditsTopUpPaymentRepo(
  prisma: EdenPrismaClient,
): CreditsTopUpPaymentRepo {
  return {
    async findById(id) {
      const payment = await prisma.creditsTopUpPayment.findUnique({
        where: {
          id,
        },
      });

      return payment ? mapCreditsTopUpPayment(payment) : null;
    },

    async upsertPending(input) {
      const payment = await prisma.creditsTopUpPayment.upsert({
        where: {
          providerSessionId: input.providerSessionId,
        },
        create: {
          provider: input.provider,
          providerSessionId: input.providerSessionId,
          providerPaymentIntentId: input.providerPaymentIntentId ?? null,
          userId: input.userId ?? null,
          creditsAmount: input.creditsAmount,
          amountCents: input.amountCents,
          currency: input.currency.toLowerCase(),
          status: "PENDING",
        },
        update: {
          provider: input.provider,
          providerPaymentIntentId: input.providerPaymentIntentId ?? null,
          userId: input.userId ?? null,
          creditsAmount: input.creditsAmount,
          amountCents: input.amountCents,
          currency: input.currency.toLowerCase(),
          status: "PENDING",
          failureReason: null,
        },
      });

      return mapCreditsTopUpPayment(payment);
    },

    async findByProviderSessionId(providerSessionId) {
      const payment = await prisma.creditsTopUpPayment.findUnique({
        where: {
          providerSessionId,
        },
      });

      return payment ? mapCreditsTopUpPayment(payment) : null;
    },

    async listAll(options = {}) {
      const payments = await prisma.creditsTopUpPayment.findMany({
        where: {
          ...(options.userId ? { userId: options.userId } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: options.limit ?? undefined,
      });

      return payments.map(mapCreditsTopUpPayment);
    },

    async listSettled(options = {}) {
      const payments = await prisma.creditsTopUpPayment.findMany({
        where: {
          status: "SETTLED",
          ...(options.userId ? { userId: options.userId } : {}),
        },
        orderBy: {
          settledAt: "desc",
        },
        take: options.limit ?? undefined,
      });

      return payments.map(mapCreditsTopUpPayment);
    },

    async markSettled(input) {
      const payment = await prisma.creditsTopUpPayment.upsert({
        where: {
          providerSessionId: input.providerSessionId,
        },
        create: {
          provider: "stripe",
          providerSessionId: input.providerSessionId,
          providerPaymentIntentId: input.providerPaymentIntentId ?? null,
          userId: input.userId ?? null,
          creditsAmount: input.creditsAmount,
          amountCents: input.amountCents,
          currency: input.currency.toLowerCase(),
          status: "SETTLED",
          settledAt: input.settledAt ?? new Date(),
        },
        update: {
          providerPaymentIntentId: input.providerPaymentIntentId ?? null,
          userId: input.userId ?? null,
          creditsAmount: input.creditsAmount,
          amountCents: input.amountCents,
          currency: input.currency.toLowerCase(),
          status: "SETTLED",
          settledAt: input.settledAt ?? new Date(),
          failureReason: null,
        },
      });

      return mapCreditsTopUpPayment(payment);
    },

    async markFailed(input) {
      const existing = await prisma.creditsTopUpPayment.findUnique({
        where: {
          providerSessionId: input.providerSessionId,
        },
      });

      if (!existing) {
        return null;
      }

      if (existing.status === "SETTLED") {
        return mapCreditsTopUpPayment(existing);
      }

      const payment = await prisma.creditsTopUpPayment.update({
        where: {
          providerSessionId: input.providerSessionId,
        },
        data: {
          status: "FAILED",
          failureReason: input.failureReason ?? null,
        },
      });

      return mapCreditsTopUpPayment(payment);
    },

    async markCanceled(input) {
      const existing = await prisma.creditsTopUpPayment.findUnique({
        where: {
          providerSessionId: input.providerSessionId,
        },
      });

      if (!existing) {
        return null;
      }

      if (existing.status === "SETTLED") {
        return mapCreditsTopUpPayment(existing);
      }

      const payment = await prisma.creditsTopUpPayment.update({
        where: {
          providerSessionId: input.providerSessionId,
        },
        data: {
          status: "CANCELED",
          failureReason: input.failureReason ?? null,
        },
      });

      return mapCreditsTopUpPayment(payment);
    },
  };
}

function mapCreditsTopUpPayment(
  payment: {
    id: string;
    provider: string;
    providerSessionId: string;
    providerPaymentIntentId: string | null;
    userId: string | null;
    creditsAmount: number;
    amountCents: number;
    currency: string;
    status: "PENDING" | "SETTLED" | "FAILED" | "CANCELED";
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    settledAt: Date | null;
  },
): EdenRepoCreditsTopUpPaymentRecord {
  return {
    id: payment.id,
    provider: payment.provider,
    providerSessionId: payment.providerSessionId,
    providerPaymentIntentId: payment.providerPaymentIntentId,
    userId: payment.userId,
    creditsAmount: payment.creditsAmount,
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: mapStatus(payment.status),
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    settledAt: payment.settledAt,
  };
}

function mapStatus(
  status: "PENDING" | "SETTLED" | "FAILED" | "CANCELED",
): EdenRepoCreditsTopUpPaymentRecord["status"] {
  switch (status) {
    case "SETTLED":
      return "settled";
    case "FAILED":
      return "failed";
    case "CANCELED":
      return "canceled";
    default:
      return "pending";
  }
}

import "server-only";

import { createPrismaPaymentEventLogRepo } from "@/modules/core/repos/prisma-payment-event-log-repo";
import { createPrismaCreditsTopUpPaymentRepo } from "@/modules/core/repos/prisma-credits-topup-payment-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoPaymentEventLogRecord } from "@/modules/core/repos/repo-types";

export type EdenPaymentEventLogStatus =
  EdenRepoPaymentEventLogRecord["status"];

export async function recordPaymentEventLog(input: {
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  creditsTopUpPaymentId?: string | null;
  providerSessionId?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  status?: EdenPaymentEventLogStatus;
}) {
  try {
    const prisma = getPrismaClient();
    const paymentRepo = createPrismaCreditsTopUpPaymentRepo(prisma);
    const eventLogRepo = createPrismaPaymentEventLogRepo(prisma);
    let creditsTopUpPaymentId = input.creditsTopUpPaymentId ?? null;

    if (!creditsTopUpPaymentId && input.providerSessionId) {
      const payment = await paymentRepo.findByProviderSessionId(input.providerSessionId);
      creditsTopUpPaymentId = payment?.id ?? null;
    }

    return await eventLogRepo.create({
      provider: input.provider,
      eventType: input.eventType,
      providerEventId: input.providerEventId ?? null,
      creditsTopUpPaymentId,
      providerSessionId: input.providerSessionId ?? null,
      metadata: input.metadata ?? null,
      status: input.status ?? "info",
    });
  } catch (error) {
    logPaymentEventLogFailure("record_payment_event_log", error);
    return null;
  }
}

export async function loadRecentPaymentEventLogs(options: {
  limit?: number;
  provider?: string;
  creditsTopUpPaymentId?: string | null;
} = {}) {
  try {
    const repo = createPrismaPaymentEventLogRepo(getPrismaClient());
    return await repo.listRecent(options);
  } catch (error) {
    logPaymentEventLogFailure("load_recent_payment_event_logs", error);
    return [];
  }
}

function logPaymentEventLogFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown payment event log persistence error";
  console.warn(`[eden][payment-events][${operation}] ${detail}`);
}

import type { PaymentEventLogRepo } from "@/modules/core/repos/payment-event-log-repo";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoPaymentEventLogRecord } from "@/modules/core/repos/repo-types";

export function createPrismaPaymentEventLogRepo(
  prisma: EdenPrismaClient,
): PaymentEventLogRepo {
  return {
    async create(input) {
      const eventLog = await prisma.paymentEventLog.create({
        data: {
          provider: input.provider,
          eventType: input.eventType,
          providerEventId: input.providerEventId ?? null,
          creditsTopUpPaymentId: input.creditsTopUpPaymentId ?? null,
          providerSessionId: input.providerSessionId ?? null,
          ...(input.metadata ? { metadata: input.metadata } : {}),
          status: mapStatusToPrisma(input.status ?? "info"),
        },
      });

      return mapPaymentEventLog(eventLog);
    },

    async listRecent(options = {}) {
      const eventLogs = await prisma.paymentEventLog.findMany({
        where: {
          ...(options.provider ? { provider: options.provider } : {}),
          ...(options.creditsTopUpPaymentId
            ? { creditsTopUpPaymentId: options.creditsTopUpPaymentId }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: options.limit ?? undefined,
      });

      return eventLogs.map(mapPaymentEventLog);
    },
  };
}

function mapPaymentEventLog(eventLog: {
  id: string;
  provider: string;
  eventType: string;
  providerEventId: string | null;
  creditsTopUpPaymentId: string | null;
  providerSessionId: string | null;
  metadata: unknown;
  status: "INFO" | "SUCCESS" | "SKIPPED" | "FAILED";
  createdAt: Date;
}): EdenRepoPaymentEventLogRecord {
  return {
    id: eventLog.id,
    provider: eventLog.provider,
    eventType: eventLog.eventType,
    providerEventId: eventLog.providerEventId,
    creditsTopUpPaymentId: eventLog.creditsTopUpPaymentId,
    providerSessionId: eventLog.providerSessionId,
    metadata: isMetadataRecord(eventLog.metadata) ? eventLog.metadata : null,
    status: mapPrismaStatus(eventLog.status),
    createdAt: eventLog.createdAt,
  };
}

function mapStatusToPrisma(
  status: "info" | "success" | "skipped" | "failed",
) {
  switch (status) {
    case "success":
      return "SUCCESS" as const;
    case "skipped":
      return "SKIPPED" as const;
    case "failed":
      return "FAILED" as const;
    default:
      return "INFO" as const;
  }
}

function mapPrismaStatus(
  status: "INFO" | "SUCCESS" | "SKIPPED" | "FAILED",
): EdenRepoPaymentEventLogRecord["status"] {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "SKIPPED":
      return "skipped";
    case "FAILED":
      return "failed";
    default:
      return "info";
  }
}

function isMetadataRecord(
  value: unknown,
): value is Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) =>
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean",
  );
}

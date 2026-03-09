import type { EdenRepoPaymentEventLogRecord } from "@/modules/core/repos/repo-types";

export interface PaymentEventLogRepo {
  create(input: {
    provider: string;
    eventType: string;
    providerEventId?: string | null;
    creditsTopUpPaymentId?: string | null;
    providerSessionId?: string | null;
    metadata?: Record<string, string | number | boolean | null> | null;
    status?: "info" | "success" | "skipped" | "failed";
  }): Promise<EdenRepoPaymentEventLogRecord>;
  listRecent(options?: {
    limit?: number;
    provider?: string;
    creditsTopUpPaymentId?: string | null;
  }): Promise<EdenRepoPaymentEventLogRecord[]>;
}

import type { EdenRepoCreditsTopUpPaymentRecord } from "@/modules/core/repos/repo-types";

export interface CreditsTopUpPaymentRepo {
  findById(id: string): Promise<EdenRepoCreditsTopUpPaymentRecord | null>;
  upsertPending(input: {
    provider: string;
    providerSessionId: string;
    providerPaymentIntentId?: string | null;
    userId?: string | null;
    creditsAmount: number;
    amountCents: number;
    currency: string;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord>;
  findByProviderSessionId(
    providerSessionId: string,
  ): Promise<EdenRepoCreditsTopUpPaymentRecord | null>;
  listAll(options?: {
    limit?: number;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord[]>;
  listSettled(options?: {
    userId?: string | null;
    limit?: number;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord[]>;
  markSettled(input: {
    providerSessionId: string;
    providerPaymentIntentId?: string | null;
    userId?: string | null;
    creditsAmount: number;
    amountCents: number;
    currency: string;
    settledAt?: Date;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord>;
  markFailed(input: {
    providerSessionId: string;
    failureReason?: string | null;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord | null>;
  markCanceled(input: {
    providerSessionId: string;
    failureReason?: string | null;
  }): Promise<EdenRepoCreditsTopUpPaymentRecord | null>;
}

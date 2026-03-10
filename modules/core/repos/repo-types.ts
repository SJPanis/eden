export type EdenRepoRole = "consumer" | "business" | "owner";
export type EdenRepoUserStatus = "active" | "review" | "frozen";
export type EdenRepoBusinessStatus = "draft" | "testing" | "published";
export type EdenRepoPipelineStatus = "draft" | "testing" | "ready" | "published";
export type EdenRepoBusinessVisibility = "Private preview" | "Internal testing" | "Published";
export type EdenRepoCreditsTopUpPaymentStatus =
  | "pending"
  | "settled"
  | "failed"
  | "canceled";
export type EdenRepoPaymentEventLogStatus =
  | "info"
  | "success"
  | "skipped"
  | "failed";
export type EdenRepoPayoutSettlementStatus =
  | "pending"
  | "settled"
  | "canceled";

export interface EdenRepoUserRecord {
  id: string;
  username: string;
  displayName: string;
  role: EdenRepoRole;
  status: EdenRepoUserStatus;
  edenBalanceCredits: number;
  summary?: string | null;
}

export interface EdenRepoBusinessRecord {
  id: string;
  ownerUserId: string;
  name: string;
  status: EdenRepoBusinessStatus;
  category: string;
  tags: string[];
  description: string;
  visibility: EdenRepoBusinessVisibility;
  teamLabel?: string | null;
  creditBalanceCredits: number;
  publishReadinessPercent: number;
  nextMilestone?: string | null;
  summary?: string | null;
  tagline?: string | null;
  targetAudience?: string | null;
  monetizationModel?: string | null;
  featuredServiceId?: string | null;
}

export interface EdenRepoServiceRecord {
  id: string;
  businessId: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  summary?: string | null;
  status: EdenRepoPipelineStatus;
  pricingModel?: string | null;
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  automationSummary?: string | null;
  publishedAt?: Date | null;
}

export interface EdenRepoPipelineRecord {
  id: string;
  businessId: string;
  serviceId: string;
  projectId?: string | null;
  status: EdenRepoPipelineStatus;
  buildStarted: boolean;
  lastActionLabel?: string | null;
  updatedAt: Date;
}

export interface EdenRepoPipelineEventRecord {
  id: string;
  pipelineRecordId?: string | null;
  businessId: string;
  serviceId: string;
  projectId?: string | null;
  previousStatus: EdenRepoPipelineStatus;
  newStatus: EdenRepoPipelineStatus;
  actorLabel: string;
  detail?: string | null;
  occurredAt: Date;
}

export interface EdenRepoServiceUsageRecord {
  id: string;
  serviceId: string;
  serviceTitle: string;
  businessId: string;
  businessName: string;
  userId?: string | null;
  usageType: string;
  creditsUsed: number;
  grossCredits?: number | null;
  platformFeeCredits?: number | null;
  builderEarningsCredits?: number | null;
  servicePricingModel?: string | null;
  servicePricePerUse?: number | null;
  servicePricingType?: string | null;
  servicePricingUnit?: string | null;
  createdAt: Date;
}

export interface EdenRepoServiceUsageSummary {
  totalUsageEvents: number;
  totalCreditsUsed: number;
}

export interface EdenRepoCreditsTopUpPaymentRecord {
  id: string;
  provider: string;
  providerSessionId: string;
  providerPaymentIntentId?: string | null;
  userId?: string | null;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  status: EdenRepoCreditsTopUpPaymentStatus;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  settledAt?: Date | null;
}

export interface EdenRepoPaymentEventLogRecord {
  id: string;
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  creditsTopUpPaymentId?: string | null;
  providerSessionId?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  status: EdenRepoPaymentEventLogStatus;
  createdAt: Date;
}

export interface EdenRepoPayoutSettlementRecord {
  id: string;
  businessId: string;
  amountCredits: number;
  status: EdenRepoPayoutSettlementStatus;
  reference?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  settledAt?: Date | null;
}

export interface EdenRepoInternalLeavesUsageRecord {
  id: string;
  businessId: string;
  userId?: string | null;
  amountCredits: number;
  usageType: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface EdenDiscoverySnapshotRecord {
  services: EdenRepoServiceRecord[];
  businesses: EdenRepoBusinessRecord[];
  publishedServiceIds: string[];
}

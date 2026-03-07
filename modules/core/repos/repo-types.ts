export type EdenRepoRole = "consumer" | "business" | "owner";
export type EdenRepoUserStatus = "active" | "review" | "frozen";
export type EdenRepoBusinessStatus = "draft" | "testing" | "published";
export type EdenRepoPipelineStatus = "draft" | "testing" | "ready" | "published";
export type EdenRepoBusinessVisibility = "Private preview" | "Internal testing" | "Published";

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

export interface EdenDiscoverySnapshotRecord {
  services: EdenRepoServiceRecord[];
  businesses: EdenRepoBusinessRecord[];
  publishedServiceIds: string[];
}

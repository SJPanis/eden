export const edenProjectHostingLeavesPerDay = 10;
export const edenProjectHostingFundingIncrementLeaves = 100;

export type EdenProjectBlueprintStatus =
  | "draft"
  | "testing"
  | "published"
  | "inactive";

export type EdenProjectAgentNode = {
  id: string;
  name: string;
  roleTitle: string;
  instructions: string;
  parentAgentId?: string | null;
  branchLabel?: string | null;
  createdAtLabel: string;
};

export type EdenProjectBlueprintRecord = {
  id: string;
  businessId: string;
  creatorUserId: string;
  creatorLabel: string;
  title: string;
  description: string;
  goal: string;
  status: EdenProjectBlueprintStatus;
  storedStatus: EdenProjectBlueprintStatus;
  isPublished: boolean;
  isActive: boolean;
  publishedAtLabel?: string | null;
  hostingBalanceLeaves: number;
  hostingRemainingLeaves: number;
  hostingDaysRemaining: number;
  hostingFundedAtLabel?: string | null;
  agents: EdenProjectAgentNode[];
};

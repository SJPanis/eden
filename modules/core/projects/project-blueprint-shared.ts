export const edenProjectHostingLeavesPerDay = 10;
export const edenProjectHostingFundingIncrementLeaves = 100;
export const edenProjectAgentRunLeavesCost = 25;

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

export type EdenProjectAgentRunRecord = {
  id: string;
  projectId: string;
  agentId: string;
  agentName: string;
  agentRoleTitle: string;
  actorUserId?: string | null;
  prompt: string;
  outputTitle: string;
  outputSummary: string;
  outputLines: string[];
  costLeaves: number;
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
  agentRuns: EdenProjectAgentRunRecord[];
};

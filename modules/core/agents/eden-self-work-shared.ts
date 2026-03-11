export type EdenSelfWorkLane = "immediate" | "short_horizon" | "stabilization";
export type EdenSelfWorkApprovalState =
  | "approved"
  | "owner_review"
  | "blocked"
  | "parked";

export type EdenSelfWorkQueueTaskLink = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  createdAtLabel: string;
  completedAtLabel?: string | null;
  workerSummary?: string | null;
  failureDetail?: string | null;
};

export type EdenSelfWorkQueueRecord = {
  id: string;
  title: string;
  chapter: string;
  lane: EdenSelfWorkLane;
  laneLabel: string;
  approvalState: EdenSelfWorkApprovalState;
  approvalStateLabel: string;
  summary: string;
  acceptanceCriteria: string[];
  blockedBy: string[];
  requiresOwnerReview: boolean;
  isNextApproved: boolean;
  linkedTask?: EdenSelfWorkQueueTaskLink | null;
};

export type EdenSelfWorkControlInputRecord = {
  id: string;
  label: string;
  repoPath: string;
  status: "loaded" | "missing";
};

export type EdenSelfWorkLoopState = {
  ready: boolean;
  readinessLabel: string;
  readinessDetail: string;
  reviewRequiredMode: boolean;
  reviewModeLabel: string;
  scopeLabel: string;
  scopeDetail: string;
  queuePath: string;
  timelinePath: string;
  sandboxRuntimeName?: string | null;
  sandboxRuntimeStatusLabel?: string | null;
  inputs: EdenSelfWorkControlInputRecord[];
  queue: EdenSelfWorkQueueRecord[];
  unavailableReason?: string | null;
};

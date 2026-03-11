import type { EdenSelfWorkQueueTaskLink } from "@/modules/core/agents/eden-self-work-shared";

export type EdenBuildSupervisorTaskReadiness =
  | "ready"
  | "blocked"
  | "queued"
  | "completed"
  | "pending_review";

export type EdenBuildSupervisorTaskRecord = {
  id: string;
  title: string;
  chapter: string;
  laneLabel: string;
  summary: string;
  acceptanceCriteria: string[];
  requiresOwnerReview: boolean;
  readiness: EdenBuildSupervisorTaskReadiness;
  readinessLabel: string;
  isHeadCandidate: boolean;
  isNextRecommended: boolean;
  blockerDetails: string[];
  linkedTask?: EdenSelfWorkQueueTaskLink | null;
  completedAtLabel?: string | null;
};

export type EdenBuildSupervisorPacketRecord = {
  status: "not_prepared" | "ready" | "stale";
  generatedAtLabel?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  objective?: string | null;
  likelyFiles: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  requiredStateUpdates: string[];
  blockerSummary: string[];
};

export type EdenBuildSupervisorHistoryRecord = {
  taskId: string;
  title: string;
  resultStatus: "completed" | "blocked" | "review_required";
  resultStatusLabel: string;
  summary: string;
  verification: string[];
  blockers: string[];
  humanActions: string[];
  completedAtLabel: string;
};

export type EdenBuildSupervisorState = {
  statusLabel: string;
  statusDetail: string;
  reviewModeLabel: string;
  reviewRequired: boolean;
  packetReady: boolean;
  statePath: string;
  packetPath: string;
  missingControlInputs: number;
  trackedHumanActions: number;
  nextRecommendedTask?: EdenBuildSupervisorTaskRecord | null;
  blockedHeadTask?: EdenBuildSupervisorTaskRecord | null;
  tasks: EdenBuildSupervisorTaskRecord[];
  blockerDetails: string[];
  packet?: EdenBuildSupervisorPacketRecord | null;
  lastCompletedTask?: EdenBuildSupervisorHistoryRecord | null;
  unavailableReason?: string | null;
};

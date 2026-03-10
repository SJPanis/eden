import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
import { getBusinessBillingSnapshot } from "@/modules/core/credits/mock-credits";
import {
  businesses as platformBusinesses,
  getBusinessById,
  getBusinessOwner,
  getProjectsByBusinessId,
  getServiceById,
  type EdenMockPipelineChecklistItem,
  type EdenMockPipelineEvent,
  type EdenMockPipelineRecord,
  type EdenMockPipelineStage,
  type EdenMockProject,
  type EdenMockReleaseStatus,
  type EdenMockService,
  type EdenMockTransaction,
} from "@/modules/core/mock-data";

export type EdenMockPipelineAction =
  | "start_build"
  | "send_to_testing"
  | "mark_ready"
  | "publish"
  | "revert_to_draft";

export type EdenMockPipelineActionState = {
  id: EdenMockPipelineAction;
  label: string;
  detail: string;
  disabled: boolean;
};

export type EdenMockPipelineSnapshot = {
  businessId: string;
  serviceId: string;
  projectId?: string;
  status: EdenMockReleaseStatus;
  buildStarted: boolean;
  updatedAt: string;
  updatedAtLabel: string;
  lastActionLabel: string;
  readinessPercent: number;
  nextMilestone: string;
  visibilityLabel: string;
  stages: EdenMockPipelineStage[];
  checklist: EdenMockPipelineChecklistItem[];
  actions: EdenMockPipelineActionState[];
  service: EdenMockService | null;
  project: EdenMockProject | null;
};

export type EdenMockPipelinePublishSummary = {
  publishedCount: number;
  readyCount: number;
  testingCount: number;
  draftCount: number;
  publishEventsCount: number;
  latestPublishEvent: EdenMockPipelineEvent | null;
};

type PipelineTransitionResult = {
  applied: boolean;
  reason?: string;
  records: EdenMockPipelineRecord[];
  events: EdenMockPipelineEvent[];
  event?: EdenMockPipelineEvent;
  snapshot: EdenMockPipelineSnapshot;
};

type ChecklistBooleans = {
  descriptionComplete: boolean;
  tagsConfigured: boolean;
  billingConfigured: boolean;
  sufficientCredits: boolean;
};

type PipelineEventQuery = {
  businessId?: string;
  businessIds?: string[];
  serviceId?: string;
  projectId?: string;
  limit?: number;
};

export const mockPipelineCookieName = "eden_v1_mock_pipeline";
export const mockPipelineEventsCookieName = "eden_v1_mock_pipeline_events";

const defaultPipelineEvents: EdenMockPipelineEvent[] = [
  {
    id: "pipeline-event-01",
    businessId: "business-02",
    serviceId: "service-02",
    projectId: "project-04",
    previousStatus: "ready",
    newStatus: "published",
    timestamp: "2026-03-05T16:10:00.000Z",
    actor: "Mina Fields",
    detail: "Evening Reset Session cleared the mocked publish gate and went live.",
  },
  {
    id: "pipeline-event-02",
    businessId: "business-04",
    serviceId: "service-03",
    projectId: "project-05",
    previousStatus: "ready",
    newStatus: "published",
    timestamp: "2026-03-04T20:35:00.000Z",
    actor: "Ari Cole",
    detail: "Creator Skill Sprint was published after final checklist review.",
  },
  {
    id: "pipeline-event-03",
    businessId: "business-01",
    serviceId: "service-01",
    projectId: "project-01",
    previousStatus: "draft",
    newStatus: "testing",
    timestamp: "2026-03-06T15:20:00.000Z",
    actor: "Paige Brooks",
    detail: "Focus Sprint Planner moved into mocked testing for final QA and pricing review.",
  },
];

const pipelineActionLabels: Record<EdenMockPipelineAction, string> = {
  start_build: "Start Build",
  send_to_testing: "Send to Testing",
  mark_ready: "Mark Ready",
  publish: "Publish",
  revert_to_draft: "Revert to Draft",
};

export function parseMockPipelineCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isMockPipelineRecord);
  } catch {
    return [];
  }
}

export function serializeMockPipelineCookie(records: EdenMockPipelineRecord[]) {
  return JSON.stringify(records);
}

export function parseMockPipelineEventsCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return sortPipelineEvents(parsedValue.filter(isMockPipelineEvent));
  } catch {
    return [];
  }
}

export function serializeMockPipelineEventsCookie(events: EdenMockPipelineEvent[]) {
  return JSON.stringify(events);
}

export function getEffectivePipelineEvents(events: EdenMockPipelineEvent[] = []) {
  const eventMap = new Map<string, EdenMockPipelineEvent>();

  [...events, ...defaultPipelineEvents].forEach((event) => {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, event);
    }
  });

  return sortPipelineEvents(Array.from(eventMap.values()));
}

export function getRecentPipelineEvents(
  options: PipelineEventQuery = {},
  events: EdenMockPipelineEvent[] = getEffectivePipelineEvents(),
) {
  const { businessId, businessIds, serviceId, projectId, limit = 6 } = options;
  const scopedBusinessIds = businessIds?.length
    ? new Set(businessIds)
    : businessId
      ? new Set([businessId])
      : null;

  return sortPipelineEvents(
    events.filter((event) => {
      if (scopedBusinessIds && !scopedBusinessIds.has(event.businessId)) {
        return false;
      }

      if (serviceId && event.serviceId !== serviceId) {
        return false;
      }

      if (projectId && event.projectId !== projectId) {
        return false;
      }

      return true;
    }),
  ).slice(0, limit);
}

export function getPipelinePublishSummary(
  options: {
    businessIds?: string[];
  } = {},
  records: EdenMockPipelineRecord[] = [],
  events: EdenMockPipelineEvent[] = getEffectivePipelineEvents(),
): EdenMockPipelinePublishSummary {
  const businessIds = options.businessIds?.length
    ? options.businessIds
    : platformBusinesses.map((business) => business.id);

  const statusCounts = businessIds.reduce(
    (totals, businessId) => {
      const status = getCurrentPipelineRecord(businessId, records).status;

      if (status === "published") {
        totals.publishedCount += 1;
      } else if (status === "ready") {
        totals.readyCount += 1;
      } else if (status === "testing") {
        totals.testingCount += 1;
      } else {
        totals.draftCount += 1;
      }

      return totals;
    },
    {
      publishedCount: 0,
      readyCount: 0,
      testingCount: 0,
      draftCount: 0,
    },
  );
  const publishEvents = getRecentPipelineEvents(
    {
      businessIds,
      limit: 100,
    },
    events,
  ).filter((event) => event.newStatus === "published");

  return {
    ...statusCounts,
    publishEventsCount: publishEvents.length,
    latestPublishEvent: publishEvents[0] ?? null,
  };
}

export function getStoredMockPipelineRecord(
  businessId: string,
  records: EdenMockPipelineRecord[] = [],
) {
  return records.find((record) => record.businessId === businessId) ?? null;
}

export function getStoredPipelineBusinessStatus(
  businessId: string,
  records: EdenMockPipelineRecord[] = [],
) {
  return getStoredMockPipelineRecord(businessId, records)?.status ?? null;
}

export function getStoredPipelineServiceStatus(
  businessId: string,
  serviceId: string,
  records: EdenMockPipelineRecord[] = [],
) {
  const record = getStoredMockPipelineRecord(businessId, records);

  if (!record || record.serviceId !== serviceId) {
    return null;
  }

  return record.status;
}

export function getBusinessPipelineSnapshot(
  options: {
    businessId: string;
    userId: string;
  },
  simulatedTransactions: EdenMockTransaction[] = [],
  records: EdenMockPipelineRecord[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
): EdenMockPipelineSnapshot | null {
  const { businessId, userId } = options;
  const business = getBusinessById(businessId, createdBusiness);

  if (!business) {
    return null;
  }

  const currentRecord = getCurrentPipelineRecord(
    businessId,
    records,
    createdBusiness,
    workspaceServices,
  );
  const service = getServiceById(currentRecord.serviceId, createdBusiness, workspaceServices);
  const project = currentRecord.projectId
    ? getProjectsByBusinessId(businessId, createdBusiness, workspaceServices).find(
        (entry) => entry.id === currentRecord.projectId,
      ) ?? null
    : null;
  const requirementBooleans = getChecklistBooleans({
    businessId,
    userId,
    service,
    simulatedTransactions,
    createdBusiness,
  });
  const checklist = buildChecklistItems(currentRecord.status, currentRecord.buildStarted, requirementBooleans);
  const readinessPercent = getReadinessPercent(currentRecord.status, currentRecord.buildStarted, checklist);
  const actions = buildActionStates(currentRecord.status, currentRecord.buildStarted, requirementBooleans);

  return {
    businessId,
    serviceId: currentRecord.serviceId,
    projectId: currentRecord.projectId,
    status: currentRecord.status,
    buildStarted: currentRecord.buildStarted,
    updatedAt: currentRecord.updatedAt,
    updatedAtLabel: formatPipelineTimestamp(currentRecord.updatedAt),
    lastActionLabel: currentRecord.lastActionLabel,
    readinessPercent,
    nextMilestone: getNextMilestone(currentRecord.status, currentRecord.buildStarted, requirementBooleans),
    visibilityLabel: getVisibilityLabel(currentRecord.status, currentRecord.buildStarted),
    stages: buildPipelineStages(currentRecord.status, currentRecord.buildStarted, requirementBooleans),
    checklist,
    actions,
    service,
    project,
  };
}

export function applyPipelineAction(options: {
  action: EdenMockPipelineAction;
  businessId: string;
  userId: string;
  actor?: string;
  simulatedTransactions?: EdenMockTransaction[];
  records?: EdenMockPipelineRecord[];
  events?: EdenMockPipelineEvent[];
  createdBusiness?: EdenMockCreatedBusinessState | null;
  workspaceServices?: EdenMockWorkspaceServiceState[];
}): PipelineTransitionResult | null {
  const {
    action,
    businessId,
    userId,
    actor,
    simulatedTransactions = [],
    records = [],
    events = [],
    createdBusiness,
    workspaceServices = [],
  } = options;
  const snapshot = getBusinessPipelineSnapshot(
    {
      businessId,
      userId,
    },
    simulatedTransactions,
    records,
    createdBusiness,
    workspaceServices,
  );

  if (!snapshot) {
    return null;
  }

  const actionState = snapshot.actions.find((entry) => entry.id === action);

  if (!actionState || actionState.disabled) {
    return {
      applied: false,
      reason: actionState?.detail ?? "This mocked pipeline action is currently unavailable.",
      records,
      events,
      snapshot,
    };
  }

  const nextRecord = getNextPipelineRecord(snapshot, action);
  const nextRecords = upsertPipelineRecord(nextRecord, records);
  const nextSnapshot = getBusinessPipelineSnapshot(
    {
      businessId,
      userId,
    },
    simulatedTransactions,
    nextRecords,
    createdBusiness,
    workspaceServices,
  );

  if (!nextSnapshot) {
    return null;
  }

  const nextEvent = buildPipelineEvent({
    action,
    actor:
      actor ??
      getBusinessOwner(businessId, createdBusiness)?.displayName ??
      "Eden Operator",
    previousSnapshot: snapshot,
    nextSnapshot,
    eventIndex: events.length + 1,
  });

  return {
    applied: true,
    records: nextRecords,
    events: sortPipelineEvents([nextEvent, ...events]),
    event: nextEvent,
    snapshot: nextSnapshot,
  };
}

export function getPipelineStatusLabel(status: EdenMockReleaseStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatPipelineTimestamp(updatedAt: string) {
  if (!updatedAt) {
    return "Seeded from shared mock data";
  }

  const timestamp = new Date(updatedAt);

  if (Number.isNaN(timestamp.getTime())) {
    return "Updated in local mock mode";
  }

  const deltaMs = Date.now() - timestamp.getTime();

  if (deltaMs < 90_000) {
    return "Just now";
  }

  if (deltaMs < 3_600_000) {
    return `${Math.max(1, Math.round(deltaMs / 60_000))} min ago`;
  }

  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCurrentPipelineRecord(
  businessId: string,
  records: EdenMockPipelineRecord[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  return (
    getStoredMockPipelineRecord(businessId, records) ??
    buildDefaultPipelineRecord(businessId, createdBusiness, workspaceServices)
  );
}

function buildDefaultPipelineRecord(
  businessId: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
): EdenMockPipelineRecord {
  const business = getBusinessById(businessId, createdBusiness);
  const serviceId = business?.featuredServiceId ?? "service-01";
  const project = getPrimaryProjectForBusiness(
    businessId,
    serviceId,
    createdBusiness,
    workspaceServices,
  );
  const status = getDefaultPipelineStatus(
    businessId,
    serviceId,
    createdBusiness,
    workspaceServices,
  );
  const buildStarted = status !== "draft";

  return {
    businessId,
    serviceId,
    projectId: project?.id,
    status,
    buildStarted,
    updatedAt: "",
    lastActionLabel: getDefaultActionLabel(status, buildStarted),
  };
}

function getDefaultPipelineStatus(
  businessId: string,
  serviceId: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
): EdenMockReleaseStatus {
  const business = getBusinessById(businessId, createdBusiness);
  const service = getServiceById(serviceId, createdBusiness, workspaceServices);
  const serviceStatus = service?.status.toLowerCase() ?? "";

  if (business?.status === "published" || serviceStatus.includes("publish")) {
    return "published";
  }

  if (business?.status === "testing" || serviceStatus.includes("testing")) {
    return "testing";
  }

  return "draft";
}

function getPrimaryProjectForBusiness(
  businessId: string,
  serviceId: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  const service = getServiceById(serviceId, createdBusiness, workspaceServices);
  const businessProjects = getProjectsByBusinessId(
    businessId,
    createdBusiness,
    workspaceServices,
  );

  if (!businessProjects.length) {
    return null;
  }

  const serviceTokens = tokenizeValue(service?.title ?? "");

  return businessProjects
    .map((project) => ({
      project,
      score:
        serviceTokens.filter((token) => tokenizeValue(project.title).includes(token)).length * 5 +
        project.progress,
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.project)[0];
}

function getChecklistBooleans(options: {
  businessId: string;
  userId: string;
  service: EdenMockService | null;
  simulatedTransactions: EdenMockTransaction[];
  createdBusiness?: EdenMockCreatedBusinessState | null;
}): ChecklistBooleans {
  const { businessId, userId, service, simulatedTransactions, createdBusiness } = options;
  const business = getBusinessById(businessId, createdBusiness);
  const billingSnapshot = getBusinessBillingSnapshot(
    {
      userId,
      businessId,
    },
    simulatedTransactions,
    createdBusiness,
  );

  return {
    descriptionComplete:
      Boolean(business?.description.trim()) &&
      (business?.summary.trim().length ?? 0) >= 40 &&
      (service?.description.trim().length ?? 0) >= 40,
    tagsConfigured:
      Boolean(business?.category) &&
      (business?.tags.length ?? 0) >= 2 &&
      (service?.tags.length ?? 0) >= 2,
    billingConfigured:
      billingSnapshot.feeBreakdown.length >= 3 &&
      billingSnapshot.hostingCostLabel.trim().length > 0,
    sufficientCredits: billingSnapshot.businessBalanceCredits >= 1000,
  };
}

function buildChecklistItems(
  status: EdenMockReleaseStatus,
  buildStarted: boolean,
  requirementBooleans: ChecklistBooleans,
): EdenMockPipelineChecklistItem[] {
  return [
    {
      id: "pipeline-check-description",
      label: "Description complete",
      detail: requirementBooleans.descriptionComplete
        ? "Business and service descriptions are complete enough for a mocked release pass."
        : "Add clearer business and service descriptions before continuing.",
      state: requirementBooleans.descriptionComplete ? "done" : "pending",
    },
    {
      id: "pipeline-check-tags",
      label: "Category / tags configured",
      detail: requirementBooleans.tagsConfigured
        ? "Category and tags are configured across the business and active service."
        : "Configure category and tags before advancing the release.",
      state: requirementBooleans.tagsConfigured ? "done" : "pending",
    },
    {
      id: "pipeline-check-billing",
      label: "Billing configured",
      detail: requirementBooleans.billingConfigured
        ? "Billing transparency, fee summary, and hosting placeholders are in place."
        : "Complete billing and fee placeholders before testing or publish.",
      state: requirementBooleans.billingConfigured ? "done" : "pending",
    },
    {
      id: "pipeline-check-credits",
      label: "Sufficient Eden Leaves",
      detail: requirementBooleans.sufficientCredits
        ? "The workspace has enough Eden Leaves to continue through testing and publish."
        : "Add Eden Leaves to keep this mocked release moving.",
      state: requirementBooleans.sufficientCredits ? "done" : "blocked",
    },
    {
      id: "pipeline-check-test",
      label: "Test status",
      detail:
        status === "published"
          ? "Testing is complete and the mocked release is live."
          : status === "ready"
            ? "Testing is complete and the release is queued for publish."
            : status === "testing"
              ? "Testing is active. Complete QA to mark this release ready."
              : buildStarted
                ? "Build is active, but the release still needs to enter testing."
                : "Start build work before this release can be tested.",
      state:
        status === "published" || status === "ready"
          ? "done"
          : status === "testing" || buildStarted
            ? "pending"
            : "blocked",
    },
  ];
}

function buildPipelineStages(
  status: EdenMockReleaseStatus,
  buildStarted: boolean,
  requirementBooleans: ChecklistBooleans,
): EdenMockPipelineStage[] {
  const prerequisitesReady =
    requirementBooleans.descriptionComplete &&
    requirementBooleans.tagsConfigured &&
    requirementBooleans.billingConfigured &&
    requirementBooleans.sufficientCredits;

  return [
    {
      id: "pipeline-build",
      title: "Build",
      state:
        status === "testing" || status === "ready" || status === "published"
          ? "ready"
          : buildStarted
            ? "attention"
            : "locked",
      summary:
        status === "testing" || status === "ready" || status === "published"
          ? "Build work is complete for the active project and service."
          : buildStarted
            ? "Build work is active. Finish packaging the release target before testing."
            : "The workspace is still in draft and waiting for a mocked build pass.",
      readiness:
        status === "testing" || status === "ready" || status === "published"
          ? "Complete"
          : buildStarted
            ? "In progress"
            : "Not started",
    },
    {
      id: "pipeline-test",
      title: "Test",
      state:
        status === "ready" || status === "published"
          ? "ready"
          : status === "testing"
            ? "attention"
            : buildStarted && prerequisitesReady
              ? "attention"
              : "locked",
      summary:
        status === "ready" || status === "published"
          ? "Testing is complete and the release passed the mocked QA gate."
          : status === "testing"
            ? "QA is running against the release target before readiness review."
            : buildStarted && prerequisitesReady
              ? "The release can move into testing as soon as you trigger the mocked QA step."
              : "Testing unlocks after the release is built and the checklist is cleared.",
      readiness:
        status === "ready" || status === "published"
          ? "Validated"
          : status === "testing"
            ? "In progress"
            : buildStarted && prerequisitesReady
              ? "Ready to test"
              : "Locked",
    },
    {
      id: "pipeline-publish",
      title: "Publish",
      state:
        status === "published" ? "ready" : status === "ready" ? "attention" : "locked",
      summary:
        status === "published"
          ? "The mocked release is live across the business workspace."
          : status === "ready"
            ? "The release has cleared testing and can now be published."
            : "Publish remains locked until build, testing, billing, and Eden Leaves are ready.",
      readiness:
        status === "published" ? "Live" : status === "ready" ? "Ready to publish" : "Locked",
    },
  ];
}

function buildActionStates(
  status: EdenMockReleaseStatus,
  buildStarted: boolean,
  requirementBooleans: ChecklistBooleans,
): EdenMockPipelineActionState[] {
  const baseRequirementsMet =
    requirementBooleans.descriptionComplete &&
    requirementBooleans.tagsConfigured &&
    requirementBooleans.billingConfigured &&
    requirementBooleans.sufficientCredits;

  return [
    {
      id: "start_build",
      label: pipelineActionLabels.start_build,
      detail:
        status === "draft" && !buildStarted
          ? "Begin a mocked build pass on the active project and service."
          : status === "draft"
            ? "Build work is already active for this draft release."
            : "Revert this release to draft before starting a new build pass.",
      disabled: !(status === "draft" && !buildStarted),
    },
    {
      id: "send_to_testing",
      label: pipelineActionLabels.send_to_testing,
      detail:
        status !== "draft"
          ? "This release is no longer in draft."
          : !buildStarted
            ? "Start build work before sending the release to testing."
            : baseRequirementsMet
              ? "Move this mocked release into testing."
              : "Complete the checklist and Leaves requirements before testing.",
      disabled: !(status === "draft" && buildStarted && baseRequirementsMet),
    },
    {
      id: "mark_ready",
      label: pipelineActionLabels.mark_ready,
      detail:
        status !== "testing"
          ? "This action unlocks after the release is in testing."
          : baseRequirementsMet
            ? "Mark this mocked release ready for publish."
            : "Resolve the remaining checklist requirements before marking ready.",
      disabled: !(status === "testing" && baseRequirementsMet),
    },
    {
      id: "publish",
      label: pipelineActionLabels.publish,
      detail:
        status !== "ready"
          ? "Publishing unlocks after the release is marked ready."
          : baseRequirementsMet
            ? "Publish this mocked release across the workspace."
            : "Resolve the remaining checklist requirements before publishing.",
      disabled: !(status === "ready" && baseRequirementsMet),
    },
    {
      id: "revert_to_draft",
      label: pipelineActionLabels.revert_to_draft,
      detail:
        status === "draft" && !buildStarted
          ? "The release is already back at its draft baseline."
          : "Reset this mocked release back to draft.",
      disabled: status === "draft" && !buildStarted,
    },
  ];
}

function getReadinessPercent(
  status: EdenMockReleaseStatus,
  buildStarted: boolean,
  checklist: EdenMockPipelineChecklistItem[],
) {
  if (status === "published") {
    return 100;
  }

  const baseScore =
    status === "ready" ? 92 : status === "testing" ? 74 : buildStarted ? 46 : 28;
  const pendingCount = checklist.filter((item) => item.state === "pending").length;
  const blockedCount = checklist.filter((item) => item.state === "blocked").length;

  return Math.max(0, Math.min(100, baseScore - pendingCount * 4 - blockedCount * 12));
}

function getNextMilestone(
  status: EdenMockReleaseStatus,
  buildStarted: boolean,
  requirementBooleans: ChecklistBooleans,
) {
  if (!requirementBooleans.sufficientCredits) {
    return "Restore Eden Leaves to continue";
  }

  if (status === "published") {
    return "Monitor live usage and iterate";
  }

  if (status === "ready") {
    return "Publish the release";
  }

  if (status === "testing") {
    return "Complete QA and mark ready";
  }

  if (!buildStarted) {
    return "Start build work";
  }

  return "Send the release to testing";
}

function getVisibilityLabel(status: EdenMockReleaseStatus, buildStarted: boolean) {
  if (status === "published") {
    return "Published";
  }

  if (status === "ready") {
    return "Scheduled for publish";
  }

  if (status === "testing") {
    return "Internal testing";
  }

  return buildStarted ? "Private build" : "Private preview";
}

function getNextPipelineRecord(
  snapshot: EdenMockPipelineSnapshot,
  action: EdenMockPipelineAction,
): EdenMockPipelineRecord {
  const updatedAt = new Date().toISOString();

  if (action === "start_build") {
    return {
      businessId: snapshot.businessId,
      serviceId: snapshot.serviceId,
      projectId: snapshot.projectId,
      status: "draft",
      buildStarted: true,
      updatedAt,
      lastActionLabel: "Build work started for the active release target.",
    };
  }

  if (action === "send_to_testing") {
    return {
      businessId: snapshot.businessId,
      serviceId: snapshot.serviceId,
      projectId: snapshot.projectId,
      status: "testing",
      buildStarted: true,
      updatedAt,
      lastActionLabel: "Release moved into mocked testing.",
    };
  }

  if (action === "mark_ready") {
    return {
      businessId: snapshot.businessId,
      serviceId: snapshot.serviceId,
      projectId: snapshot.projectId,
      status: "ready",
      buildStarted: true,
      updatedAt,
      lastActionLabel: "Release marked ready for mocked publish.",
    };
  }

  if (action === "publish") {
    return {
      businessId: snapshot.businessId,
      serviceId: snapshot.serviceId,
      projectId: snapshot.projectId,
      status: "published",
      buildStarted: true,
      updatedAt,
      lastActionLabel: "Release published across Eden's mocked workspace.",
    };
  }

  return {
    businessId: snapshot.businessId,
    serviceId: snapshot.serviceId,
    projectId: snapshot.projectId,
    status: "draft",
    buildStarted: false,
    updatedAt,
    lastActionLabel: "Release reverted back to draft.",
  };
}

function upsertPipelineRecord(
  nextRecord: EdenMockPipelineRecord,
  records: EdenMockPipelineRecord[] = [],
) {
  const filteredRecords = records.filter((record) => record.businessId !== nextRecord.businessId);
  return [nextRecord, ...filteredRecords];
}

function buildPipelineEvent(options: {
  action: EdenMockPipelineAction;
  actor: string;
  previousSnapshot: EdenMockPipelineSnapshot;
  nextSnapshot: EdenMockPipelineSnapshot;
  eventIndex: number;
}): EdenMockPipelineEvent {
  const { action, actor, previousSnapshot, nextSnapshot, eventIndex } = options;
  const serviceTitle = nextSnapshot.service?.title ?? "Active service";

  return {
    id: `pipeline-event-sim-${Date.now()}-${eventIndex}`,
    businessId: nextSnapshot.businessId,
    serviceId: nextSnapshot.serviceId,
    projectId: nextSnapshot.projectId,
    previousStatus: previousSnapshot.status,
    newStatus: nextSnapshot.status,
    timestamp: nextSnapshot.updatedAt || new Date().toISOString(),
    actor,
    detail: getPipelineEventDetail(action, serviceTitle),
  };
}

function getPipelineEventDetail(
  action: EdenMockPipelineAction,
  serviceTitle: string,
) {
  if (action === "start_build") {
    return `${serviceTitle} started a fresh mocked build pass for the active release target.`;
  }

  if (action === "send_to_testing") {
    return `${serviceTitle} moved into mocked testing for QA, billing review, and publish validation.`;
  }

  if (action === "mark_ready") {
    return `${serviceTitle} cleared testing and is now staged as ready for publish.`;
  }

  if (action === "publish") {
    return `${serviceTitle} was published into Eden's mocked platform shell.`;
  }

  return `${serviceTitle} was reverted to draft so the team can restart the release pass.`;
}

function getDefaultActionLabel(status: EdenMockReleaseStatus, buildStarted: boolean) {
  if (status === "published") {
    return "Release is already live in mocked publish mode.";
  }

  if (status === "ready") {
    return "Release is ready for mocked publish.";
  }

  if (status === "testing") {
    return "Release is currently in mocked testing.";
  }

  return buildStarted
    ? "Draft release is actively being built."
    : "Draft release is waiting for build work to begin.";
}

function sortPipelineEvents(events: EdenMockPipelineEvent[]) {
  return [...events].sort((left, right) => {
    const rightTime = new Date(right.timestamp).getTime();
    const leftTime = new Date(left.timestamp).getTime();

    return rightTime - leftTime;
  });
}

function tokenizeValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function isMockPipelineRecord(value: unknown): value is EdenMockPipelineRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockPipelineRecord>;

  return (
    typeof candidate.businessId === "string" &&
    typeof candidate.serviceId === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.buildStarted === "boolean" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.lastActionLabel === "string"
  );
}

function isMockPipelineEvent(value: unknown): value is EdenMockPipelineEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockPipelineEvent>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.businessId === "string" &&
    typeof candidate.serviceId === "string" &&
    typeof candidate.previousStatus === "string" &&
    typeof candidate.newStatus === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.actor === "string" &&
    typeof candidate.detail === "string"
  );
}

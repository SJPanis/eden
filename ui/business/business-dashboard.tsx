"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { EdenWorkspaceAssistantDraftPatch } from "@/modules/eden-ai/eden-types";
import type { EdenMockBusinessAssistantHistoryEntry } from "@/modules/core/assistant/mock-business-assistant-history";
import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
import {
  getBusinessBillingSnapshot,
} from "@/modules/core/credits/mock-credits";
import { MockTransactionControls } from "@/modules/core/credits/mock-transaction-controls";
import {
  getBusinessPipelineSnapshot,
  getRecentPipelineEvents,
  formatPipelineTimestamp,
  getPipelineStatusLabel,
  getStoredMockPipelineRecord,
} from "@/modules/core/pipeline/mock-pipeline";
import { MockPipelineControls } from "@/modules/core/pipeline/mock-pipeline-controls";
import {
  type EdenDiscoverySnapshot,
  formatCredits,
  getLogsByBusinessId,
  getProjectsByBusinessId,
} from "@/modules/core/mock-data";
import type {
  EdenMockBusiness,
  EdenMockChecklistState,
  EdenMockPipelineEvent,
  EdenMockPipelineRecord,
  EdenMockPipelineStageState,
  EdenMockProject,
  EdenMockReleaseStatus,
  EdenMockTransaction,
  EdenMockUser,
} from "@/modules/core/mock-data";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import type { EdenBusinessPayoutAccountingSummary } from "@/modules/core/services/payout-accounting-service";
import { formatServicePricingLabel } from "@/modules/core/services/service-pricing";
import { BusinessAiAssistantPanel } from "@/ui/business/components/business-ai-assistant-panel";
import { MockServiceBuilder } from "@/ui/business/components/mock-service-builder";
import {
  createEmptyServiceDraftFormValues,
  parseServiceDraftTags,
  type ServiceDraftFormValues,
} from "@/ui/business/components/service-draft-shared";
import { WorkspaceSection } from "@/ui/business/components/workspace-section";

type WorkspaceMetric = {
  label: string;
  value: string;
  detail: string;
};

type BillingUsageItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

type BusinessUsageMetrics = {
  totalUsageEvents: number;
  totalCreditsUsed: number;
  source: "persistent" | "mock_fallback";
  perService: Array<{
    serviceId: string;
    serviceTitle: string;
    businessId: string;
    businessName: string;
      usageCount: number;
      totalCreditsUsed: number;
      lastUsedAtLabel: string;
      pricingModel?: string | null;
      pricePerUseCredits?: number | null;
      pricingUnit?: string | null;
      monetization: {
        estimatedGrossCredits: number;
        estimatedPlatformEarningsCredits: number;
        estimatedBuilderEarningsCredits: number;
        pricingRuleLabel: string;
    };
  }>;
  recentUsageEvents: Array<{
    id: string;
    serviceId: string;
    serviceTitle: string;
    businessId: string;
    businessName: string;
    userId?: string | null;
    userDisplayName: string;
    username?: string | null;
    usageType: string;
    creditsUsed: number;
    estimatedGrossCredits: number;
    timestampLabel: string;
    source: "persistent" | "mock_fallback";
  }>;
  topCustomers: Array<{
    userId?: string | null;
    userDisplayName: string;
    username?: string | null;
    isAnonymousUser: boolean;
    usageCount: number;
    totalCreditsUsed: number;
    usageSharePercent: number;
    topServiceTitle: string;
    lastUsedAtLabel: string;
    projectedCustomerValueCredits: number;
    perService: Array<{
      serviceId: string;
      serviceTitle: string;
      businessId: string;
      businessName: string;
      usageCount: number;
      totalCreditsUsed: number;
      lastUsedAtLabel: string;
      projectedCustomerValueCredits: number;
    }>;
    monetization: {
      estimatedGrossCredits: number;
      estimatedPlatformEarningsCredits: number;
      estimatedBuilderEarningsCredits: number;
      pricingRuleLabel: string;
    };
  }>;
  recentCustomerActivity: Array<{
    id: string;
    serviceId: string;
    serviceTitle: string;
    businessId: string;
    businessName: string;
    userId?: string | null;
    userDisplayName: string;
    username?: string | null;
    usageType: string;
    creditsUsed: number;
    estimatedGrossCredits: number;
    timestampLabel: string;
    source: "persistent" | "mock_fallback";
  }>;
  monetization: {
    estimatedGrossCredits: number;
    estimatedPlatformEarningsCredits: number;
    estimatedBuilderEarningsCredits: number;
    pricingRuleLabel: string;
  };
};

type SettingItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

type ReleaseSummaryItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

type ReleaseEventFilter = "all" | "testing" | "ready" | "published";

type BusinessDashboardPanelProps = {
  session: EdenMockSession;
  discoverySnapshot: EdenDiscoverySnapshot;
  simulatedTransactions: EdenMockTransaction[];
  pipelineRecords: EdenMockPipelineRecord[];
  pipelineEvents: EdenMockPipelineEvent[];
  assistantHistory: EdenMockBusinessAssistantHistoryEntry[];
  activeBusinessId: string;
  businessProfile: EdenMockBusiness | null;
  businessOwner: EdenMockUser | null;
  createdBusiness?: EdenMockCreatedBusinessState | null;
  workspaceServices?: EdenMockWorkspaceServiceState[];
  usageMetrics: BusinessUsageMetrics;
  payoutAccounting: EdenBusinessPayoutAccountingSummary;
};

const workspaceNav = [
  { id: "business-overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "service-builder", label: "Service Builder" },
  { id: "pipeline", label: "Pipeline" },
  { id: "release-activity", label: "Release Activity" },
  { id: "assistant", label: "AI Assistant" },
  { id: "billing", label: "Billing" },
  { id: "settings", label: "Settings" },
];

const releaseEventFilters: Array<{
  id: ReleaseEventFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "testing", label: "Testing" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published" },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function getReleaseStatusClasses(status: EdenMockReleaseStatus) {
  if (status === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "ready") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "testing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getProjectStatusClasses(status: EdenMockProject["status"]) {
  if (status === "Testing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Building") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getPipelineStageClasses(state: EdenMockPipelineStageState) {
  if (state === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (state === "attention") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getChecklistStateClasses(state: EdenMockChecklistState) {
  if (state === "done") {
    return "bg-emerald-500";
  }

  if (state === "pending") {
    return "bg-amber-400";
  }

  return "bg-slate-300";
}

function getTransactionDirectionClasses(direction: EdenMockTransaction["direction"]) {
  if (direction === "inflow") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (direction === "outflow") {
    return "bg-rose-100 text-rose-700";
  }

  if (direction === "reserve") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-sky-100 text-sky-700";
}

function getPayoutSettlementStatusClasses(
  status: "pending" | "settled" | "canceled",
) {
  if (status === "settled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatPayoutSettlementStatus(status: "pending" | "settled" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getServicePricingDisplay(input: {
  pricingModel?: string | null;
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
}) {
  return formatServicePricingLabel(
    {
      pricingModel: input.pricingModel,
      pricePerUse: input.pricePerUse,
      pricingType: input.pricingType,
      pricingUnit: input.pricingUnit,
    },
    {
      fallbackLabel: input.pricingModel ?? "Not priced yet",
      includePricingModel: Boolean(input.pricingModel),
    },
  );
}

function getFallbackReleaseStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("publish")) {
    return "published" as const;
  }

  if (normalized.includes("ready")) {
    return "ready" as const;
  }

  if (normalized.includes("testing")) {
    return "testing" as const;
  }

  return "draft" as const;
}

export function BusinessDashboardPanel({
  session,
  discoverySnapshot,
  simulatedTransactions,
  pipelineRecords,
  pipelineEvents,
  assistantHistory,
  activeBusinessId,
  businessProfile,
  businessOwner,
  createdBusiness,
  workspaceServices = [],
  usageMetrics,
  payoutAccounting,
}: BusinessDashboardPanelProps) {
  const [releaseEventFilter, setReleaseEventFilter] = useState<ReleaseEventFilter>("all");
  const projects = getProjectsByBusinessId(activeBusinessId, createdBusiness, workspaceServices);
  const isSessionCreatedBusiness = createdBusiness?.business.id === activeBusinessId;
  const workspaceService =
    workspaceServices.find((entry) => entry.record.businessId === activeBusinessId) ?? null;
  const billingSnapshot = businessProfile
    ? getBusinessBillingSnapshot(
        {
          userId: session.user.id,
          businessId: activeBusinessId,
        },
        simulatedTransactions,
        createdBusiness,
      )
    : null;
  const pipelineSnapshot = businessProfile
    ? getBusinessPipelineSnapshot(
        {
          businessId: activeBusinessId,
          userId: session.user.id,
        },
        simulatedTransactions,
        pipelineRecords,
        createdBusiness,
        workspaceServices,
      )
    : null;
  const storedPipelineRecord = getStoredMockPipelineRecord(activeBusinessId, pipelineRecords);
  const releaseStatus =
    storedPipelineRecord?.status ??
    getFallbackReleaseStatus(
      pipelineSnapshot?.service?.status ?? businessProfile?.status ?? "draft",
    );
  const activeService =
    pipelineSnapshot?.service ?? workspaceService?.service ?? createdBusiness?.service ?? null;
  const draftDefaultCategory =
    activeService?.category ?? workspaceService?.record.category ?? businessProfile?.category ?? "Productivity";
  const draftDefaultTagsSignature = (
    activeService?.tags ??
    workspaceService?.record.tags ??
    businessProfile?.tags ??
    []
  ).join("|||");
  const activeDraftSeedKey = `${activeBusinessId}:${workspaceService?.record.serviceId ?? pipelineSnapshot?.service?.id ?? "shared-baseline"}`;
  const initialServiceDraftForm = createEmptyServiceDraftFormValues(
    draftDefaultCategory,
    draftDefaultTagsSignature ? draftDefaultTagsSignature.split("|||") : [],
    {
      name: activeService?.title ?? workspaceService?.record.name ?? "",
      description: activeService?.description ?? workspaceService?.record.description ?? "",
      category: activeService?.category ?? workspaceService?.record.category ?? draftDefaultCategory,
      tagsInput: draftDefaultTagsSignature ? draftDefaultTagsSignature.split("|||").join(", ") : "",
      pricingModel:
        activeService?.pricingModel ?? workspaceService?.record.pricingModel ?? "",
      pricePerUse:
        workspaceService?.record.pricePerUse?.toString() ??
        activeService?.pricePerUse?.toString() ??
        "",
      automationDescription:
        workspaceService?.record.automationDescription ??
        activeService?.automationSummary ??
        "",
    },
  );
  const [draftState, setDraftState] = useState<{
    seedKey: string;
    formValues: ServiceDraftFormValues;
  }>(() => ({
    seedKey: activeDraftSeedKey,
    formValues: initialServiceDraftForm,
  }));
  const [assistantResponseState, setAssistantResponseState] = useState<{
    seedKey: string;
    response: EdenMockBusinessAssistantHistoryEntry | null;
  }>(() => ({
    seedKey: activeDraftSeedKey,
    response: assistantHistory[0] ?? null,
  }));
  const [builderOpenState, setBuilderOpenState] = useState<{
    seedKey: string;
    token: number;
  }>(() => ({
    seedKey: activeDraftSeedKey,
    token: 0,
  }));
  const serviceDraftForm =
    draftState.seedKey === activeDraftSeedKey
      ? draftState.formValues
      : initialServiceDraftForm;
  const selectedAssistantResponse =
    assistantResponseState.seedKey === activeDraftSeedKey
      ? assistantResponseState.response
      : assistantHistory[0] ?? null;
  const publishPrepSuggestions =
    selectedAssistantResponse?.action === "prepare_for_publish"
      ? selectedAssistantResponse.checklistSuggestions ?? []
      : [];
  const builderOpenToken =
    builderOpenState.seedKey === activeDraftSeedKey ? builderOpenState.token : 0;
  const editableTags = parseServiceDraftTags(serviceDraftForm.tagsInput);
  const assistantContext = {
    businessName: businessProfile?.name ?? "Eden Workspace",
    businessDescription: businessProfile?.description ?? "",
    serviceName:
      serviceDraftForm.name.trim() ||
      pipelineSnapshot?.service?.title ||
      workspaceService?.record.name ||
      businessProfile?.name ||
      "Active service",
    description:
      serviceDraftForm.description.trim() ||
      pipelineSnapshot?.service?.description ||
      workspaceService?.record.description ||
      businessProfile?.description ||
      "No description has been staged yet.",
    category:
      serviceDraftForm.category.trim() ||
      pipelineSnapshot?.service?.category ||
      workspaceService?.record.category ||
      businessProfile?.category ||
      "Productivity",
    tags:
      editableTags.length > 0
        ? editableTags
        : pipelineSnapshot?.service?.tags ??
          workspaceService?.record.tags ??
          businessProfile?.tags ??
          [],
    pricingModel:
      serviceDraftForm.pricingModel.trim() ||
      workspaceService?.record.pricingModel ||
      "Placeholder pricing",
    automationSummary:
      serviceDraftForm.automationDescription.trim() ||
      workspaceService?.record.automationDescription ||
      "No automation summary configured yet.",
    pipelineStatus: releaseStatus,
    publishChecklist: pipelineSnapshot?.checklist ?? [],
    readinessPercent:
      pipelineSnapshot?.readinessPercent ?? businessProfile?.publishReadinessPercent ?? 0,
    nextMilestone: pipelineSnapshot?.nextMilestone ?? businessProfile?.nextMilestone ?? "",
  };
  const recentReleaseEvents = getRecentPipelineEvents(
    {
      businessId: activeBusinessId,
      limit: 5,
    },
    pipelineEvents,
  );
  const filteredReleaseEvents =
    releaseEventFilter === "all"
      ? recentReleaseEvents
      : recentReleaseEvents.filter((event) => event.newStatus === releaseEventFilter);
  const recentActivity = [
    ...(pipelineSnapshot
      ? [
          {
            id: "pipeline-local-activity",
            title: pipelineSnapshot.lastActionLabel,
            message: `Release target: ${pipelineSnapshot.service?.title ?? "Active service"} ${
              pipelineSnapshot.project ? `with ${pipelineSnapshot.project.title}` : ""
            }. Visibility is currently ${pipelineSnapshot.visibilityLabel.toLowerCase()}.`,
            timestamp: pipelineSnapshot.updatedAtLabel,
          },
        ]
      : []),
    ...getLogsByBusinessId(activeBusinessId, createdBusiness, workspaceServices),
  ].slice(0, 3);
  const workspaceMetrics: WorkspaceMetric[] = businessProfile
    ? [
        {
          label: "Active projects",
          value: `${projects.length}`,
          detail: "Shared mock projects spanning live builds, ideas, and staged workflow prototypes.",
        },
        {
          label: "Workspace readiness",
          value: `${storedPipelineRecord
            ? pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent
            : businessProfile.publishReadinessPercent}%`,
          detail: "Shared readiness state derived from the mocked build, test, and publish pipeline.",
        },
        {
          label: "Eden Credits",
          value: formatCredits(billingSnapshot?.businessBalanceCredits ?? businessProfile.creditBalanceCredits),
          detail: "Shared mocked workspace balance reserved for builds, AI actions, testing, and publish prep.",
        },
        {
          label: "Next milestone",
          value:
            storedPipelineRecord?.status
              ? pipelineSnapshot?.nextMilestone ?? businessProfile.nextMilestone
              : businessProfile.nextMilestone,
          detail: "Current staged milestone from the mocked build, test, and publish flow.",
        },
      ]
    : [];
  const releaseSummary: ReleaseSummaryItem[] = businessProfile
    ? [
        {
          id: "release-summary-01",
          label: "Current status",
          value: getPipelineStatusLabel(releaseStatus),
          detail:
            storedPipelineRecord?.status
              ? pipelineSnapshot?.lastActionLabel ??
                "This release is still following the shared mocked baseline."
              : `Defaulting to the current workspace status from ${businessProfile.name}.`,
        },
        {
          id: "release-summary-02",
          label: "Active service",
          value: pipelineSnapshot?.service?.title ?? businessProfile.name,
          detail: "Current service target connected to the active mocked release flow.",
        },
        {
          id: "release-summary-03",
          label: "Active project",
          value: pipelineSnapshot?.project?.title ?? projects[0]?.title ?? "No active project",
          detail:
            pipelineSnapshot?.project?.milestone ??
            projects[0]?.milestone ??
            "Assign or stage a project to drive the next release pass.",
        },
        {
          id: "release-summary-04",
          label: "Latest transition",
          value: recentReleaseEvents[0]
            ? `${getPipelineStatusLabel(recentReleaseEvents[0].previousStatus)} -> ${getPipelineStatusLabel(recentReleaseEvents[0].newStatus)}`
            : "No local transitions yet",
          detail: recentReleaseEvents[0]
            ? `${recentReleaseEvents[0].actor} - ${formatPipelineTimestamp(recentReleaseEvents[0].timestamp)}`
            : "The history feed will update after mocked pipeline actions are triggered.",
        },
      ]
    : [];
  const activeServicePricingLabel = getServicePricingDisplay({
    pricingModel:
      workspaceService?.record.pricingModel ?? activeService?.pricingModel ?? null,
    pricePerUse:
      workspaceService?.record.pricePerUse ?? activeService?.pricePerUse ?? null,
    pricingType:
      workspaceService?.record.pricingType ?? activeService?.pricingType ?? null,
    pricingUnit:
      workspaceService?.record.pricingUnit ?? activeService?.pricingUnit ?? null,
  });
  const billingUsage: BillingUsageItem[] = businessProfile
    ? [
        {
          id: "billing-usage-01",
          label: "Current balance",
          value: formatCredits(billingSnapshot?.businessBalanceCredits ?? businessProfile.creditBalanceCredits),
          detail: "Shared mocked workspace balance available for AI actions, testing, and publish prep.",
        },
        {
          id: "billing-usage-02",
          label: "Active user wallet",
          value: formatCredits(billingSnapshot?.userBalanceCredits ?? session.user.edenBalanceCredits),
          detail: "Current mock operator wallet shown alongside workspace billing context.",
        },
        {
          id: "billing-usage-03",
          label: "Recent usage",
          value: `${formatCredits(billingSnapshot?.usageCredits ?? 0)} this cycle`,
          detail: "Derived from the shared mocked transaction stream tied to this business workspace.",
        },
        {
          id: "billing-usage-04",
          label: "Active service pricing",
          value: activeServicePricingLabel,
          detail: "Current monetization setting on the active service target. Adjust it in the Service Builder to change earnings projections.",
        },
        {
          id: "billing-usage-05",
          label: "Tracked service runs",
          value: `${usageMetrics.totalUsageEvents}`,
          detail:
            usageMetrics.source === "persistent"
              ? "Persisted ServiceUsage rows tied to this business workspace."
              : "Fallback count derived from the local mock usage ledger for this workspace.",
        },
        {
          id: "billing-usage-06",
          label: "Estimated builder earnings",
          value: formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits),
          detail: "Estimated builder share derived from the active services' stored per-use pricing.",
        },
        {
          id: "billing-usage-07",
          label: "Estimated Eden fee share",
          value: formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits),
          detail: "Estimated Eden platform share derived from stored service pricing, not real charging.",
        },
        {
          id: "billing-usage-08",
          label: "Hosting cost",
          value: billingSnapshot?.hostingCostLabel ?? "$18/mo",
          detail: "Placeholder hosting estimate for staging, delivery, and analytics surfaces.",
        },
      ]
    : [];
  const payoutAccountingItems = [
    {
      id: "payout-total-earned",
      label: "Total earned",
      value: formatCredits(payoutAccounting.totalEarnedCredits),
      detail: "Builder-side earnings accrued from priced service usage across this workspace.",
    },
    {
      id: "payout-unpaid",
      label: "Unpaid earnings",
      value: formatCredits(payoutAccounting.unpaidEarningsCredits),
      detail: "Builder earnings still owed after persistent payout settlement records are applied.",
    },
    {
      id: "payout-ready",
      label: "Payout-ready",
      value: formatCredits(payoutAccounting.payoutReadyCredits),
      detail: "Accrued earnings available after the current internal reserve holdback.",
    },
    {
      id: "payout-fee-share",
      label: "Eden fee share",
      value: formatCredits(payoutAccounting.edenFeeShareCredits),
      detail: "Platform share derived from the same pricing-based usage accounting.",
    },
    {
      id: "payout-pending",
      label: "Pending settlements",
      value: formatCredits(payoutAccounting.pendingSettlementCredits),
      detail: "Internal payout records queued but not yet marked as settled.",
    },
    {
      id: "payout-holdback",
      label: "Reserve holdback",
      value: formatCredits(payoutAccounting.holdbackCredits),
      detail: "Internal reserve held back before earnings become payout-ready.",
    },
    {
      id: "payout-paid-out",
      label: "Paid out",
      value: formatCredits(payoutAccounting.paidOutCredits),
      detail: "Persistent payout settlement total already marked as settled for this business.",
    },
  ];
  const settingsItems: SettingItem[] = businessProfile
    ? [
        {
          id: "setting-01",
          label: "Profile",
          value: businessProfile.name,
          detail: "Business identity, description placeholder, and one-line mission state from the shared dataset.",
        },
        {
          id: "setting-02",
          label: "Category / tags",
          value: [businessProfile.category, ...businessProfile.tags.slice(1)].join(", "),
          detail: "Control how the business is positioned across connected discovery surfaces.",
        },
        {
          id: "setting-03",
          label: "Visibility",
          value: pipelineSnapshot?.visibilityLabel ?? businessProfile.visibility,
          detail: "Visibility reflects the active mocked pipeline state for this release target.",
        },
        {
          id: "setting-04",
          label: "Owner / team",
          value: businessOwner
            ? `${businessOwner.displayName} - ${businessProfile.teamLabel.split(" + ").slice(1).join(" + ")}`
            : businessProfile.teamLabel,
          detail: "Placeholder access controls for owner and collaborator roles.",
        },
      ]
    : [];

  function handleOpenServiceBuilder() {
    setBuilderOpenState({
      seedKey: activeDraftSeedKey,
      token: builderOpenToken + 1,
    });
  }

  function handleServiceDraftFormChange(nextValues: ServiceDraftFormValues) {
    setDraftState({
      seedKey: activeDraftSeedKey,
      formValues: nextValues,
    });
  }

  function handleApplyAssistantPatch(patch: EdenWorkspaceAssistantDraftPatch) {
    setDraftState({
      seedKey: activeDraftSeedKey,
      formValues: {
        name: patch.name ?? serviceDraftForm.name,
        description: patch.description ?? serviceDraftForm.description,
        category: patch.category ?? serviceDraftForm.category,
        tagsInput: patch.suggestedTags?.length
          ? patch.suggestedTags.join(", ")
          : serviceDraftForm.tagsInput,
        pricingModel: patch.pricingModel ?? serviceDraftForm.pricingModel,
        pricePerUse: serviceDraftForm.pricePerUse,
        automationDescription:
          patch.automationSummary ?? serviceDraftForm.automationDescription,
      },
    });
  }

  function handleAssistantResponseFocus(response: EdenMockBusinessAssistantHistoryEntry | null) {
    setAssistantResponseState({
      seedKey: activeDraftSeedKey,
      response,
    });
  }

  function handleResetServiceDraftForm() {
    setDraftState({
      seedKey: activeDraftSeedKey,
      formValues: initialServiceDraftForm,
    });
  }

  if (!businessProfile) {
    return null;
  }

  return (
    <div className="space-y-5">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden rounded-[32px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(255,237,213,0.86),rgba(255,255,255,0.96)_52%,rgba(219,234,254,0.88))] p-5 md:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Business Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
              {businessProfile.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
              {businessProfile.description}
            </p>
            {isSessionCreatedBusiness ? (
              <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
                This is a session-created mock business from the Eden idea-to-workspace flow.
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getReleaseStatusClasses(
                  releaseStatus,
                )}`}
              >
                {getPipelineStatusLabel(releaseStatus)}
              </span>
              {businessProfile.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-eden-edge bg-white/80 px-3 py-1 text-xs text-eden-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {workspaceNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-eden-edge bg-white/80 px-3 py-2 text-xs font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2"
          >
            {workspaceMetrics.map((metric) => (
              <motion.article
                key={metric.label}
                variants={childVariants}
                className="rounded-2xl border border-eden-edge bg-white/84 p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-eden-ink">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">{metric.detail}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 lg:grid-cols-4"
      >
        {releaseSummary.map((item) => (
          <motion.article
            key={`top-${item.id}`}
            variants={childVariants}
            className="rounded-2xl border border-eden-edge bg-white/92 p-4"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-eden-ink">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
          </motion.article>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]"
      >
        <motion.div variants={sectionVariants}>
          <WorkspaceSection
            id="business-overview"
            eyebrow="Business Overview"
            title="Business metadata and recent activity"
            description="Core business information stays visible here so the workspace always reflects how the business is currently positioned."
            actions={
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getReleaseStatusClasses(
                  releaseStatus,
                )}`}
              >
                {getPipelineStatusLabel(releaseStatus)}
              </span>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/65 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Business name
                  </p>
                  <p className="mt-2 text-base font-semibold text-eden-ink">
                    {businessProfile.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/65 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Status
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-eden-ink">
                    {getPipelineStatusLabel(releaseStatus)}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/65 p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Short description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {businessProfile.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/65 p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Tags and category
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {businessProfile.tags.map((tag) => (
                      <span
                        key={`overview-${tag}`}
                        className="rounded-full border border-eden-edge bg-white px-3 py-1 text-xs text-eden-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent activity
                </p>
                <div className="mt-4 space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-eden-ink">{activity.title}</p>
                        <span className="whitespace-nowrap text-xs text-eden-muted">
                          {activity.timestamp}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{activity.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <WorkspaceSection
            id="assistant"
            eyebrow="Business AI Assistant"
            title="Interactive AI workspace help"
            description="Run mocked Eden AI actions against the active service draft, compare the output, and apply useful changes back into the shared builder form."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                4 actions
              </span>
            }
          >
            <BusinessAiAssistantPanel
              key={activeDraftSeedKey}
              context={assistantContext}
              discoverySnapshot={discoverySnapshot}
              businessId={activeBusinessId}
              initialHistory={assistantHistory}
              onApplyPatch={handleApplyAssistantPatch}
              onOpenEditor={handleOpenServiceBuilder}
              onResponseFocus={handleAssistantResponseFocus}
            />
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <WorkspaceSection
            id="projects"
            eyebrow="Projects"
            title="Ideas and active builds"
            description="Track the business concepts currently in motion, from early ideas to active test-ready builds."
            actions={
              <button
                type="button"
                className="rounded-full border border-eden-edge bg-white px-3 py-1.5 text-xs font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
              >
                New placeholder project
              </button>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-3"
            >
              {projects.map((project) => (
                <motion.article
                  key={project.id}
                  variants={childVariants}
                  className={`rounded-2xl border bg-white p-4 shadow-[0_18px_40px_-30px_rgba(19,33,68,0.3)] ${
                    pipelineSnapshot?.projectId === project.id
                      ? "border-eden-ring shadow-[0_18px_40px_-24px_rgba(26,115,232,0.35)]"
                      : "border-eden-edge"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        {project.type}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-eden-ink">
                        {project.title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getProjectStatusClasses(
                        project.status,
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>
                  {pipelineSnapshot?.projectId === project.id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getReleaseStatusClasses(
                          releaseStatus,
                        )}`}
                      >
                        Release {getPipelineStatusLabel(releaseStatus)}
                      </span>
                      <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                        Active pipeline target
                      </span>
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm leading-6 text-eden-muted">{project.summary}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-eden-muted">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-eden-bg">
                      <div
                        className="h-2 rounded-full bg-eden-accent"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Next milestone
                    </p>
                    <p className="mt-2 text-sm text-eden-ink">{project.milestone}</p>
                  </div>
                  <p className="mt-4 text-xs text-eden-muted">{project.updatedAt}</p>
                </motion.article>
              ))}
            </motion.div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <WorkspaceSection
            id="service-builder"
            eyebrow="Service Builder"
            title="Create the next active service"
            description="Stage a new local service draft, attach it to the active workspace, and send it through the mocked release pipeline."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {workspaceService ? "Local service active" : "Using current service"}
              </span>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Active service target
                  </p>
                  <p className="mt-2 text-lg font-semibold text-eden-ink">
                    {pipelineSnapshot?.service?.title ?? businessProfile.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {pipelineSnapshot?.service?.description ??
                      "The active service target is still using the shared workspace baseline."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(pipelineSnapshot?.service?.tags ?? businessProfile.tags).map((tag) => (
                      <span
                        key={`service-builder-${tag}`}
                        className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.38),rgba(255,255,255,0.96))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Builder handoff
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {workspaceService
                      ? "The staged local service is now the active pipeline target."
                      : "Create a local service to replace the current pipeline target."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    New service drafts start in `Draft`, become the active service for this
                    workspace, and will flow into consumer discovery automatically after the mocked
                    pipeline reaches `Published`.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-eden-edge bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Current pricing
                      </p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {activeServicePricingLabel}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-eden-muted">
                        Update the numeric rate in the Service Builder form to change monetization analytics.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        Automation layer
                      </p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {workspaceService?.record.automationDescription
                          ? "Configured"
                          : "Optional"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <MockServiceBuilder
                key={`${activeDraftSeedKey}:${builderOpenToken}`}
                businessId={activeBusinessId}
                businessName={businessProfile.name}
                businessDescription={businessProfile.description}
                activeServiceName={pipelineSnapshot?.service?.title}
                defaultCategory={pipelineSnapshot?.service?.category ?? businessProfile.category}
                defaultTags={pipelineSnapshot?.service?.tags ?? businessProfile.tags}
                discoverySnapshot={discoverySnapshot}
                formValues={serviceDraftForm}
                onFormValuesChange={handleServiceDraftFormChange}
                onResetForm={handleResetServiceDraftForm}
                initiallyOpen={builderOpenToken > 0}
              />
            </div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <WorkspaceSection
            id="pipeline"
            eyebrow="Build / Test / Publish Pipeline"
            title="Interactive release pipeline"
            description="This mocked release flow moves the active project and service through build, testing, ready, and publish states."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getReleaseStatusClasses(
                    releaseStatus,
                  )}`}
                >
                  {getPipelineStatusLabel(releaseStatus)}
                </span>
                <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                  {pipelineSnapshot?.updatedAtLabel ?? "Mocked readiness"}
                </span>
              </div>
            }
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Active release target
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Service</p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {pipelineSnapshot?.service?.title ?? businessProfile.name}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-eden-muted">
                      Release status: {getPipelineStatusLabel(releaseStatus)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Project</p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {pipelineSnapshot?.project?.title ?? "No active project"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-eden-muted">
                      {pipelineSnapshot?.project?.milestone ?? pipelineSnapshot?.lastActionLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.4),rgba(255,255,255,0.96))] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Current state</p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {pipelineSnapshot?.lastActionLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Next milestone: {pipelineSnapshot?.nextMilestone ?? businessProfile.nextMilestone}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Pipeline controls
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  These controls mutate mocked local release state only. They are designed to preview the future builder workflow without adding backend persistence.
                </p>
                <div className="mt-4">
                  <MockPipelineControls
                    businessId={activeBusinessId}
                    controls={pipelineSnapshot?.actions ?? []}
                  />
                </div>
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mt-4 grid gap-3 lg:grid-cols-3"
            >
              {pipelineSnapshot?.stages.map((stage, index) => (
                <motion.article
                  key={stage.id}
                  variants={childVariants}
                  className="relative rounded-2xl border border-eden-edge bg-white p-4"
                >
                  {index < (pipelineSnapshot?.stages.length ?? 0) - 1 ? (
                    <div className="pointer-events-none absolute right-[-1.2rem] top-8 hidden h-px w-[1.8rem] bg-eden-edge lg:block" />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-eden-ink">{stage.title}</h3>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getPipelineStageClasses(
                        stage.state,
                      )}`}
                    >
                      {stage.readiness}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">{stage.summary}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Readiness checklist
                </p>
                <div className="mt-4 space-y-3">
                  {pipelineSnapshot?.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${getChecklistStateClasses(
                          item.state,
                        )}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-eden-muted">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Publish gate
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-eden-ink">
                    {pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent}%
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Mock publish readiness score based on the active pipeline status, release controls, and readiness checklist.
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-white/80">
                    <div
                      className="h-2 rounded-full bg-eden-accent"
                      style={{ width: `${pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent}%` }}
                    />
                  </div>
                  <div className="mt-4 rounded-2xl border border-eden-edge bg-white/88 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Next unblocker
                    </p>
                    <p className="mt-2 text-sm text-eden-ink">
                      {pipelineSnapshot?.nextMilestone ?? "Finish the manual QA pass and confirm the fee summary copy before publish."}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-eden-muted">
                      {pipelineSnapshot?.lastActionLabel}
                    </p>
                  </div>
                </div>

                {publishPrepSuggestions.length ? (
                  <div className="rounded-2xl border border-eden-edge bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                          AI publish fixes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">
                          Checklist-specific suggestions from the currently selected `Prepare for Publish` assistant run.
                        </p>
                      </div>
                      <a
                        href="#assistant"
                        className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                      >
                        Review assistant
                      </a>
                    </div>
                    <div className="mt-4 space-y-3">
                      {publishPrepSuggestions.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 rounded-full ${getChecklistStateClasses(
                                item.state,
                              )}`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                              <p className="mt-1 text-sm leading-6 text-eden-muted">{item.detail}</p>
                              <p className="mt-2 text-sm leading-6 text-eden-ink">{item.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-eden-muted">
                      Apply the selected publish-prep output in the Business AI Assistant to write draft updates back into the active service.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <WorkspaceSection
            id="release-activity"
            eyebrow="Release Activity"
            title="Current release summary and transition history"
            description="Business-facing release visibility for the active service and project, using the same shared mocked event source as the owner control room."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getReleaseStatusClasses(
                    releaseStatus,
                  )}`}
                >
                  {getPipelineStatusLabel(releaseStatus)}
                </span>
                <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                  {recentReleaseEvents.length} recent events
                </span>
              </div>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 lg:grid-cols-4"
            >
              {releaseSummary.map((item) => (
                <motion.article
                  key={item.id}
                  variants={childVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Event filters
                      </p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">
                        Filter the shared mocked transition feed by the next release state.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {releaseEventFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setReleaseEventFilter(filter.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                            releaseEventFilter === filter.id
                              ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                              : "border-eden-edge bg-eden-bg text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredReleaseEvents.length ? (
                  filteredReleaseEvents.map((event) => (
                    <motion.article
                      key={event.id}
                      variants={childVariants}
                      className="rounded-2xl border border-eden-edge bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-eden-ink">
                              {getPipelineStatusLabel(event.previousStatus)} to{" "}
                              {getPipelineStatusLabel(event.newStatus)}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getReleaseStatusClasses(
                                event.newStatus,
                              )}`}
                            >
                              {getPipelineStatusLabel(event.newStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-eden-muted">{event.detail}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                            Actor: {event.actor}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Timestamp</p>
                          <p className="mt-1 text-sm font-semibold text-eden-ink">
                            {formatPipelineTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <motion.div
                    variants={childVariants}
                    className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted"
                  >
                    {releaseEventFilter === "all"
                      ? "No mocked transition history has been recorded for this workspace yet. Use the pipeline controls above to move the active release through build, testing, ready, and publish states."
                      : `No ${releaseEventFilter} transitions have been recorded for this workspace yet.`}
                  </motion.div>
                )}
              </motion.div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,237,213,0.45),rgba(255,255,255,0.96))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Current release summary
                  </p>
                  <p className="mt-2 text-lg font-semibold text-eden-ink">
                    {pipelineSnapshot?.service?.title ?? businessProfile.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {pipelineSnapshot?.project
                      ? `${pipelineSnapshot.project.title} is the active build target and is currently ${getPipelineStatusLabel(releaseStatus).toLowerCase()}.`
                      : `The active release target is currently ${getPipelineStatusLabel(releaseStatus).toLowerCase()} in mock mode.`}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Visibility: {pipelineSnapshot?.visibilityLabel ?? businessProfile.visibility}
                  </p>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Next release step
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {pipelineSnapshot?.nextMilestone ?? businessProfile.nextMilestone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Latest activity: {pipelineSnapshot?.lastActionLabel ?? "Shared mock release baseline."}
                  </p>
                  <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Readiness</p>
                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                      {pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent}% ready for publish
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <WorkspaceSection
            id="billing"
            eyebrow="Billing / Eden Credits"
            title="Balance, usage, and fee clarity"
            description="The billing layer is still placeholder-only, but the workspace now exposes credits, usage, hosting, and fee visibility together."
            actions={
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Transparent fees
              </span>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3"
            >
              {billingUsage.map((item) => (
                <motion.div
                  key={item.id}
                  variants={childVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/65 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Transparent fee summary
              </p>
              <div className="mt-3 space-y-3">
                {billingSnapshot?.feeBreakdown.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b border-eden-edge/70 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-eden-muted">{item.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-eden-ink">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Builder payout accounting
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      {payoutAccounting.accountingRuleLabel}
                    </p>
                  </div>
                  <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-xs text-eden-muted">
                    {payoutAccounting.payoutStatusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {payoutAccountingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-eden-edge bg-white p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout-ready services
                </p>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.perService.length ? (
                    payoutAccounting.perService.slice(0, 4).map((service) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-eden-ink">{service.serviceTitle}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              Unpaid earnings: {formatCredits(service.unpaidEarningsCredits)}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {formatCredits(service.payoutReadyCredits)}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">Payout-ready</p>
                            <p className="mt-2 text-xs text-eden-muted">
                              Holdback: {formatCredits(service.holdbackCredits)}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      Service-level payout accounting will appear here once the active business records priced usage.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Payout history
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      Persistent payout settlement records for this business. These rows adjust paid-out and unpaid totals without sending any real payout.
                    </p>
                  </div>
                  <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                    {payoutAccounting.historySource === "persistent"
                      ? "Persistent records"
                      : "No persistent records"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.payoutHistory.length ? (
                    payoutAccounting.payoutHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {formatCredits(item.amountCredits)}
                              </p>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getPayoutSettlementStatusClasses(
                                  item.status,
                                )}`}
                              >
                                {formatPayoutSettlementStatus(item.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {item.reference ?? "No payout reference recorded."}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              {item.notes ?? "Internal accounting note not provided."}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                              Created
                            </p>
                            <p className="mt-1 text-sm font-semibold text-eden-ink">
                              {item.createdAtLabel}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">
                              {item.settledAtLabel
                                ? `Settled ${item.settledAtLabel}`
                                : "Not settled yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      No payout settlement records exist for this business yet. The Owner Dashboard can record internal mock settlements, and those rows will appear here immediately.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout status overview
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Settled records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.settledCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.settledSettlementCredits,
                      )} marked as paid out
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Pending records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.pendingCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.pendingSettlementCredits,
                      )} queued internally
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Canceled records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.statusOverview.canceledCount}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      {formatCredits(
                        payoutAccounting.statusOverview.canceledSettlementCredits,
                      )} removed from settlement history
                    </p>
                  </div>
                  <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      Current status
                    </p>
                    <p className="mt-2 text-lg font-semibold text-eden-ink">
                      {payoutAccounting.payoutStatusLabel}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">
                      Unpaid {formatCredits(payoutAccounting.unpaidEarningsCredits)} | Ready{" "}
                      {formatCredits(payoutAccounting.payoutReadyCredits)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-eden-edge bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Recent Eden transactions
              </p>
              <div className="mt-4 space-y-3">
                {billingSnapshot?.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-3 rounded-2xl border border-eden-edge bg-eden-bg/60 p-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-eden-ink">{transaction.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getTransactionDirectionClasses(
                            transaction.direction,
                          )}`}
                        >
                          {transaction.direction}
                        </span>
                        {transaction.simulated ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                            Local mock
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{transaction.detail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-semibold text-eden-ink">{transaction.amountLabel}</p>
                      <p className="mt-1 text-xs text-eden-muted">{transaction.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(300px,0.94fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Per-service usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.perService.length ? (
                    usageMetrics.perService.map((service) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-eden-ink">{service.serviceTitle}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              Current rate:{" "}
                              {getServicePricingDisplay({
                                pricingModel: service.pricingModel,
                                pricePerUse: service.pricePerUseCredits,
                                pricingUnit: service.pricingUnit,
                              })}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              Estimated builder earnings:{" "}
                              {formatCredits(service.monetization.estimatedBuilderEarningsCredits)}.
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {formatCredits(service.monetization.estimatedPlatformEarningsCredits)}
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">Eden fee share</p>
                            <p className="mt-2 text-xs text-eden-muted">
                              Gross: {formatCredits(service.monetization.estimatedGrossCredits)}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      No service usage has been tracked for this workspace yet. Use the mock transaction controls to simulate service usage and populate this view.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-eden-edge bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Recent usage events
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.recentUsageEvents.length ? (
                      usageMetrics.recentUsageEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-eden-ink">{event.serviceTitle}</p>
                              <p className="mt-1 text-sm leading-6 text-eden-muted">
                                {formatCredits(event.creditsUsed)} used through {event.usageType.replace(/_/g, " ")}.
                              </p>
                              <p className="mt-1 text-xs text-eden-muted">
                                Gross estimate: {formatCredits(event.estimatedGrossCredits)}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                              {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                            {event.timestampLabel}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                        Usage events will appear here after the active service is run through the mocked execution flow.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Monetization-ready projection
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {usageMetrics.monetization.pricingRuleLabel}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-eden-edge bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Estimated gross</p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.monetization.estimatedGrossCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Builder keeps</p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-eden-edge bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Eden fee share</p>
                      <p className="mt-2 text-sm font-semibold text-eden-ink">
                        {formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top customers by usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.topCustomers.length ? (
                    usageMetrics.topCustomers.map((customer) => (
                      <div
                        key={customer.userId ?? `guest-${customer.userDisplayName}`}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {customer.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                                {customer.isAnonymousUser
                                  ? "Guest"
                                  : customer.username
                                    ? `@${customer.username}`
                                    : "Customer"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              {customer.usageCount} runs across {customer.perService.length} service
                              {customer.perService.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Top service: {customer.topServiceTitle}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-eden-muted">
                              Estimated customer value:{" "}
                              {formatCredits(customer.projectedCustomerValueCredits)}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-eden-ink">
                              {customer.usageSharePercent}% of tracked runs
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              Builder earnings:{" "}
                              {formatCredits(
                                customer.monetization.estimatedBuilderEarningsCredits,
                              )}
                            </p>
                            <p className="mt-2 text-xs text-eden-muted">
                              {customer.lastUsedAtLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      Customer usage rankings will populate after tracked service runs are recorded
                      for this workspace.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent customer activity
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.recentCustomerActivity.length ? (
                    usageMetrics.recentCustomerActivity.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-eden-ink">
                                {event.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                                {event.username ? `@${event.username}` : "Guest wallet"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                              Used {event.serviceTitle} for {formatCredits(event.creditsUsed)}.
                            </p>
                            <p className="mt-1 text-xs text-eden-muted">
                              Estimated customer value:{" "}
                              {formatCredits(event.estimatedGrossCredits)}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                            {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                          {event.timestampLabel}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                      Recent customer activity appears here once the active business records
                      service usage events.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <MockTransactionControls
                businessId={activeBusinessId}
                description={`These development-only actions append local Eden Credits events for ${businessProfile.name}.`}
              />
            </div>
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <WorkspaceSection
            id="settings"
            eyebrow="Settings"
            title="Business controls"
            description="Use these mocked controls to shape profile, discovery metadata, visibility, and team ownership."
            actions={
              <button
                type="button"
                className="rounded-full border border-eden-edge bg-white px-3 py-1.5 text-xs font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
              >
                Edit placeholders
              </button>
            }
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 sm:grid-cols-2"
            >
              {settingsItems.map((item) => (
                <motion.article
                  key={item.id}
                  variants={childVariants}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </motion.article>
              ))}
            </motion.div>
          </WorkspaceSection>
        </motion.div>
      </motion.div>
    </div>
  );
}

type BusinessWorkspaceStarterPanelProps = {
  session: EdenMockSession;
};

export function BusinessWorkspaceStarterPanel({
  session,
}: BusinessWorkspaceStarterPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden rounded-[32px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.7),rgba(255,255,255,0.96)_56%,rgba(255,237,213,0.75))] p-5 md:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
            Business Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
            Create your first mocked Eden business
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
            This business-role session does not have an active workspace yet. Start with the
            mocked creation flow, review the idea-to-business summary, and then enter the builder
            shell with a live local business context.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/business/create?source=business_dashboard"
              className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
            >
              Start business creation
            </Link>
            <span className="rounded-xl border border-eden-edge bg-white/85 px-4 py-2 text-sm text-eden-muted">
              Active operator: {session.user.displayName}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              What you will define
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              Name, description, category, tags, audience, monetization placeholder, and a review
              step before the workspace opens.
            </p>
          </div>
          <div className="rounded-2xl border border-eden-edge bg-white/90 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Result
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              Eden will keep the business local to this mock session and treat it like the active
              workspace for the Business Dashboard.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}





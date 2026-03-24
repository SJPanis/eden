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
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";
import { MockInternalLeavesUsageButton } from "@/modules/core/components/mock-internal-leaves-usage-button";
import {
  edenEarnedLeavesLabel,
  edenPlatformFeeLeavesLabel,
  edenSpendableLeavesLabel,
} from "@/modules/core/credits/eden-currency";
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
import {
  formatServicePricingLabel,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import {
  edenLaunchLabels,
  getLaunchAvailabilityLabel,
  getServiceAffordabilityDetails,
} from "@/ui/consumer/components/service-affordability-shared";
import { BusinessAiAssistantPanel } from "@/ui/business/components/business-ai-assistant-panel";
import { MockServiceBuilder } from "@/ui/business/components/mock-service-builder";
import { ProjectBlueprintPanel } from "@/ui/business/components/project-blueprint-panel";
import {
  createEmptyServiceDraftFormValues,
  parseServiceDraftTags,
  type ServiceDraftFormValues,
} from "@/ui/business/components/service-draft-shared";
import { WorkspaceSection } from "@/ui/business/components/workspace-section";
import type { EdenProjectBlueprintRecord } from "@/modules/core/projects/project-blueprint-shared";

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
    platformFeeCredits: number;
    builderEarningsCredits: number;
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
    platformFeeCredits: number;
    builderEarningsCredits: number;
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
  projectBlueprints: EdenProjectBlueprintRecord[];
};

const workspaceNav = [
  { id: "business-overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "service-innovator", label: "Service Innovator" },
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
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "ready") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (status === "testing") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function getProjectStatusClasses(status: EdenMockProject["status"]) {
  if (status === "Testing") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (status === "Building") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function getPipelineStageClasses(state: EdenMockPipelineStageState) {
  if (state === "ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (state === "attention") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function getChecklistStateClasses(state: EdenMockChecklistState) {
  if (state === "done") {
    return "bg-emerald-500";
  }

  if (state === "pending") {
    return "bg-amber-400";
  }

  return "bg-white/20";
}

function getAffordabilityClasses(tone: "ready" | "warning" | "neutral") {
  if (tone === "ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (tone === "warning") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
}

function getTransactionDirectionClasses(direction: EdenMockTransaction["direction"]) {
  if (direction === "inflow") {
    return "bg-emerald-500/10 text-emerald-400";
  }

  if (direction === "outflow") {
    return "bg-rose-500/10 text-rose-300";
  }

  if (direction === "reserve") {
    return "bg-amber-500/10 text-amber-300";
  }

  return "bg-sky-500/10 text-sky-300";
}

function getPayoutSettlementStatusClasses(
  status: "pending" | "settled" | "canceled",
) {
  if (status === "settled") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "pending") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/[0.07] bg-white/[0.05] text-white/40";
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
  projectBlueprints,
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
          label: edenSpendableLeavesLabel,
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
  const activeServicePricing = resolveServicePricing({
    pricePerUse: workspaceService?.record.pricePerUse ?? activeService?.pricePerUse ?? null,
    pricingType: workspaceService?.record.pricingType ?? activeService?.pricingType ?? null,
    pricingUnit: workspaceService?.record.pricingUnit ?? activeService?.pricingUnit ?? null,
    pricingModel: workspaceService?.record.pricingModel ?? activeService?.pricingModel ?? null,
  });
  const consumerWalletContextCredits =
    billingSnapshot?.userBalanceCredits ?? session.user.edenBalanceCredits;
  const consumerAffordability = getServiceAffordabilityDetails(
    activeServicePricing.pricePerUseCredits,
    consumerWalletContextCredits,
  );
  const consumerLaunchStateLabel = getLaunchAvailabilityLabel(releaseStatus);
  const consumerLaunchStateDetail =
    releaseStatus === "published"
      ? "Consumers can discover this service now in the marketplace and Ask Eden."
      : releaseStatus === "ready"
        ? "The service is one step away from consumer discovery, but it is not live yet."
        : releaseStatus === "testing"
          ? "Consumers cannot run it yet. Finish testing and promote it into discovery."
          : "Consumers cannot see this service until you move it beyond draft.";
  const consumerReadinessValue =
    releaseStatus === "published"
      ? consumerAffordability.label
      : "Preview only";
  const consumerReadinessDetail =
    releaseStatus === "published"
      ? `${consumerAffordability.hint} Using the current wallet context of ${formatCredits(
          consumerWalletContextCredits,
        )}.`
      : activeServicePricing.hasStoredPrice
        ? `Consumers will see ${activeServicePricingLabel} before they decide. Publish the service to expose the wallet cue in discovery.`
        : "Set a visible Eden Leaf’s price so consumers can compare the run cost to their wallet before they decide.";
  const publishLaunchSummaryCards = [
    {
      id: "launch-summary-state",
      label: "Publish state",
      value: getPipelineStatusLabel(releaseStatus),
      detail:
        releaseStatus === "published"
          ? "This service is live in consumer discovery and Ask Eden for the current session."
          : releaseStatus === "ready"
            ? "This service is staged for launch and one step away from consumer discovery."
            : releaseStatus === "testing"
              ? "This service is still in testing and not yet promoted into consumer discovery."
              : "This service is still in draft and not yet visible to consumers.",
    },
    {
      id: "launch-summary-pricing",
      label: "Pricing state",
      value: activeServicePricing.hasStoredPrice
        ? activeServicePricingLabel
        : "Price needs review",
      detail: activeServicePricing.hasStoredPrice
        ? `Consumers see this exact Eden Leaf’s rate before they run the service.`
        : "Set a per-use Eden Leaf’s price so the launch flow and earnings model are explicit.",
    },
    {
      id: "launch-summary-consumer",
      label: edenLaunchLabels.consumerReadiness,
      value: consumerReadinessValue,
      detail: consumerReadinessDetail,
    },
    {
      id: "launch-summary-readiness",
      label: "Readiness",
      value: `${pipelineSnapshot?.readinessPercent ?? businessProfile?.publishReadinessPercent ?? 0}% ready`,
      detail:
        pipelineSnapshot?.nextMilestone ??
        "Finish the remaining checklist items before promoting this service into discovery.",
    },
    {
      id: "launch-summary-wallet",
      label: "Consumer billing path",
      value: edenLaunchLabels.creditsOnlyBilling,
      detail: activeServicePricing.hasStoredPrice
        ? `Each run deducts the visible price from the consumer wallet. ${edenLaunchLabels.noHiddenCheckout}`
        : "Wallet charging is ready, but the final per-use price should be set before launch.",
    },
  ];
  const consumerLaunchPreviewCards = [
    {
      id: "consumer-launch-state",
      label: "Marketplace state",
      value: consumerLaunchStateLabel,
      detail: consumerLaunchStateDetail,
    },
    {
      id: "consumer-launch-pricing",
      label: edenLaunchLabels.visiblePricing,
      value: activeServicePricing.hasStoredPrice ? activeServicePricingLabel : "Price needs review",
      detail: activeServicePricing.hasStoredPrice
        ? `Consumers see the exact Eden Leaf’s price before they run. ${edenLaunchLabels.noHiddenCheckout}`
        : "Add a visible Eden Leaf’s price so the consumer decision stays explicit.",
    },
    {
      id: "consumer-launch-wallet",
      label: "Wallet cue",
      value: consumerAffordability.label,
      detail: `${consumerAffordability.hint} Current wallet context: ${formatCredits(
        consumerWalletContextCredits,
      )}.`,
    },
    {
      id: "consumer-launch-next",
      label: "Consumer next step",
      value:
        releaseStatus === "published"
          ? consumerAffordability.nextStep
          : "Publish to expose this flow in discovery",
      detail:
        releaseStatus === "published"
          ? "This is the same trust-first guidance consumers see across marketplace cards, Ask Eden, and service detail."
          : "Once published, the marketplace will show the same price-visible, Leaf’s-only decision flow to consumers.",
    },
  ];
  const billingUsage: BillingUsageItem[] = businessProfile
    ? [
        {
          id: "billing-usage-01",
          label: edenSpendableLeavesLabel,
          value: formatCredits(billingSnapshot?.businessBalanceCredits ?? businessProfile.creditBalanceCredits),
          detail: "Shared mocked workspace balance available for AI actions, testing, and publish prep.",
        },
        {
          id: "billing-usage-02",
          label: "Operator spendable Leaf’s",
          value: formatCredits(billingSnapshot?.userBalanceCredits ?? session.user.edenBalanceCredits),
          detail: "Current mock operator wallet shown alongside workspace billing context.",
        },
        {
          id: "billing-usage-03",
          label: "Spendable Leaf’s used",
          value: `${formatCredits(billingSnapshot?.usageCredits ?? 0)} this cycle`,
          detail: "Derived from the shared mocked transaction stream tied to this business workspace.",
        },
        {
          id: "billing-usage-04",
          label: "Active service pricing",
          value: activeServicePricingLabel,
          detail: "Current monetization setting on the active service target. Adjust it in the Service Innovator to change earnings projections.",
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
          label: edenEarnedLeavesLabel,
          value: formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits),
          detail: "Estimated innovator share derived from the active services' stored per-use pricing.",
        },
        {
          id: "billing-usage-07",
          label: edenPlatformFeeLeavesLabel,
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
      label: `${edenEarnedLeavesLabel} total`,
      value: formatCredits(payoutAccounting.totalEarnedCredits),
      detail: "Innovator-side earned Leaf’s accrued from priced service usage across this workspace.",
    },
    {
      id: "payout-internal-used",
      label: `${edenEarnedLeavesLabel} used internally`,
      value: formatCredits(payoutAccounting.earnedLeavesUsedInternallyCredits),
      detail: "Earned Leaf’s already spent on internal Eden work instead of remaining payout/accounting balance.",
    },
    {
      id: "payout-unpaid",
      label: `${edenEarnedLeavesLabel} unpaid`,
      value: formatCredits(payoutAccounting.unpaidEarningsCredits),
      detail: "Earned Leaf’s still owed after persistent payout settlements and internal Eden use are applied.",
    },
    {
      id: "payout-internal-available",
      label: "Available for Eden use",
      value: formatCredits(payoutAccounting.availableForInternalUseCredits),
      detail: "Remaining earned Leaf’s that can still be used internally inside Eden without touching the spendable wallet.",
    },
    {
      id: "payout-ready",
      label: "Earned Leaf’s ready",
      value: formatCredits(payoutAccounting.payoutReadyCredits),
      detail: "Accrued earned Leaf’s available after the current internal reserve holdback.",
    },
    {
      id: "payout-fee-share",
      label: edenPlatformFeeLeavesLabel,
      value: formatCredits(payoutAccounting.edenFeeShareCredits),
      detail: "Platform fee Leaf’s derived from the same pricing-based usage accounting.",
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
  const internalUseSuggestedAmount = Math.min(
    40,
    payoutAccounting.availableForInternalUseCredits,
  );
  const serviceUsageLeaders = [...usageMetrics.perService].sort((left, right) => {
    return (
      right.usageCount - left.usageCount ||
      right.monetization.estimatedBuilderEarningsCredits -
        left.monetization.estimatedBuilderEarningsCredits
    );
  });
  const serviceEarningLeaders = [...usageMetrics.perService].sort((left, right) => {
    return (
      right.monetization.estimatedBuilderEarningsCredits -
        left.monetization.estimatedBuilderEarningsCredits ||
      right.usageCount - left.usageCount
    );
  });
  const recentUsageWindow = usageMetrics.recentUsageEvents.slice(0, 8);
  const recentUsageMomentumByService = recentUsageWindow.reduce<Record<string, number>>(
    (lookup, event) => {
      lookup[event.serviceId] = (lookup[event.serviceId] ?? 0) + 1;
      return lookup;
    },
    {},
  );
  const serviceMomentumLeaders = [...usageMetrics.perService]
    .map((service) => ({
      ...service,
      recentMomentumCount: recentUsageMomentumByService[service.serviceId] ?? 0,
    }))
    .sort((left, right) => {
      return (
        right.recentMomentumCount - left.recentMomentumCount ||
        right.usageCount - left.usageCount ||
        right.monetization.estimatedBuilderEarningsCredits -
          left.monetization.estimatedBuilderEarningsCredits
      );
    });
  const topCustomersByValue = [...usageMetrics.topCustomers].sort((left, right) => {
    return (
      right.projectedCustomerValueCredits - left.projectedCustomerValueCredits ||
      right.usageCount - left.usageCount
    );
  });
  const topCustomersByUsage = [...usageMetrics.topCustomers].sort((left, right) => {
    return (
      right.usageCount - left.usageCount ||
      right.projectedCustomerValueCredits - left.projectedCustomerValueCredits
    );
  });
  const highestEarningService = serviceEarningLeaders[0] ?? null;
  const strongestMomentumService =
    serviceMomentumLeaders.find((service) => service.recentMomentumCount > 0) ?? null;
  const highestValueCustomer = topCustomersByValue[0] ?? null;
  const highestUsageCustomer = topCustomersByUsage[0] ?? null;
  const latestCustomerActivity = usageMetrics.recentCustomerActivity[0] ?? null;
  const analyticsHighlights = [
    {
      id: "analytics-highlight-top-service",
      label: "Top service by earnings",
      value: highestEarningService
        ? formatCredits(highestEarningService.monetization.estimatedBuilderEarningsCredits)
        : "No priced runs yet",
      detail: highestEarningService
        ? `${highestEarningService.serviceTitle} at ${getServicePricingDisplay({
            pricingModel: highestEarningService.pricingModel,
            pricePerUse: highestEarningService.pricePerUseCredits,
            pricingUnit: highestEarningService.pricingUnit,
          })}.`
        : "Innovator earnings highlights appear once priced service usage is recorded.",
    },
    {
      id: "analytics-highlight-customer-value",
      label: "Top customer value",
      value: highestValueCustomer
        ? formatCredits(highestValueCustomer.projectedCustomerValueCredits)
        : "No customer value yet",
      detail: highestValueCustomer
        ? `${highestValueCustomer.userDisplayName} across ${highestValueCustomer.perService.length} service${
            highestValueCustomer.perService.length === 1 ? "" : "s"
          }.`
        : "Projected customer value appears after tracked usage is tied to customers.",
    },
    {
      id: "analytics-highlight-payout-ready",
      label: "Payout-ready",
      value: formatCredits(payoutAccounting.payoutReadyCredits),
      detail: `${payoutAccounting.statusOverview.pendingCount} pending settlement record${
        payoutAccounting.statusOverview.pendingCount === 1 ? "" : "s"
      } with ${formatCredits(payoutAccounting.pendingSettlementCredits)} queued internally.`,
    },
    {
      id: "analytics-highlight-usage-pulse",
      label: "Recent usage pulse",
      value: strongestMomentumService
        ? `${strongestMomentumService.recentMomentumCount}/${recentUsageWindow.length} recent runs`
        : "No recent usage pulse",
      detail: strongestMomentumService
        ? `${strongestMomentumService.serviceTitle} is leading recent activity. ${strongestMomentumService.lastUsedAtLabel}.`
        : "Recent service momentum will appear here after fresh runs are recorded.",
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
        className="overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.05] p-5 md:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
          <div>
            <EdenBrandLockup
              size="sm"
              label="Eden"
              subtitle="Innovator workspace"
            />
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Business Workspace
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {businessProfile.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
              {businessProfile.description}
            </p>
            {isSessionCreatedBusiness ? (
              <div className="mt-4 inline-flex rounded-2xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-sky-300">
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
                  className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-1 text-xs text-white/50"
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
                  className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
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
                className="rounded-2xl border border-white/8 bg-white/[0.05] p-4 shadow-[0_18px_36px_-30px_rgba(19,33,68,0.35)]"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-white/50">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">{metric.detail}</p>
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
            className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-white">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
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
                <div className="rounded-2xl border border-white/8 bg-eden-bg/65 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Business name
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {businessProfile.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-eden-bg/65 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Status
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-white">
                    {getPipelineStatusLabel(releaseStatus)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-eden-bg/65 p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Short description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {businessProfile.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-eden-bg/65 p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Tags and category
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {businessProfile.tags.map((tag) => (
                      <span
                        key={`overview-${tag}`}
                        className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent activity
                </p>
                <div className="mt-4 space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{activity.title}</p>
                        <span className="whitespace-nowrap text-xs text-white/50">
                          {activity.timestamp}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/50">{activity.message}</p>
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
            description="Run mocked Eden AI actions against the active service draft, compare the output, and apply useful changes back into the shared innovator form."
            actions={
              <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
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
            description="Track the business concepts currently in motion, from early ideas to active test-ready builds, persistent project blueprints, and the first agent tree foundation."
            actions={
              <button
                type="button"
                className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
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
                  className={`rounded-2xl border bg-white/[0.06] p-4 shadow-[0_18px_40px_-30px_rgba(19,33,68,0.3)] ${
                    pipelineSnapshot?.projectId === project.id
                      ? "border-[#14989a]/50 shadow-[0_18px_40px_-24px_rgba(26,115,232,0.35)]"
                      : "border-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        {project.type}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-white">
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
                      <span className="rounded-full bg-eden-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                        Active pipeline target
                      </span>
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm leading-6 text-white/50">{project.summary}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-white/50">
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
                  <div className="mt-4 rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Next milestone
                    </p>
                    <p className="mt-2 text-sm text-white">{project.milestone}</p>
                  </div>
                  <p className="mt-4 text-xs text-white/50">{project.updatedAt}</p>
                </motion.article>
              ))}
            </motion.div>
            <ProjectBlueprintPanel
              businessId={activeBusinessId}
              businessName={businessProfile?.name ?? "Active business"}
              initialProjects={projectBlueprints}
              availableForInternalUseCredits={payoutAccounting.availableForInternalUseCredits}
            />
          </WorkspaceSection>
        </motion.div>

        <motion.div variants={sectionVariants} className="xl:col-span-2">
          <WorkspaceSection
            id="service-innovator"
            eyebrow="Service Innovator"
            title="Create the next active service"
            description="Stage a new local service draft, attach it to the active workspace, and send it through the mocked release pipeline."
            actions={
              <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                {workspaceService ? "Local service active" : "Using current service"}
              </span>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Active service target
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {pipelineSnapshot?.service?.title ?? businessProfile.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {pipelineSnapshot?.service?.description ??
                      "The active service target is still using the shared workspace baseline."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(pipelineSnapshot?.service?.tags ?? businessProfile.tags).map((tag) => (
                      <span
                        key={`service-innovator-${tag}`}
                        className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Innovator handoff
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {workspaceService
                      ? "The staged local service is now the active pipeline target."
                      : "Create a local service to replace the current pipeline target."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    New service drafts start in `Draft`, become the active service for this
                    workspace, and will flow into consumer discovery automatically after the mocked
                    pipeline reaches `Published`.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Current pricing
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {activeServicePricingLabel}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/50">
                        Update the numeric rate in the Service Innovator form to change monetization analytics.
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl border p-3 ${getAffordabilityClasses(
                        consumerAffordability.tone,
                      )}`}
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-current/80">
                        {edenLaunchLabels.consumerReadiness}
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {releaseStatus === "published"
                          ? consumerReadinessValue
                          : "Previewing launch clarity"}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-current/80">
                        {releaseStatus === "published"
                          ? consumerAffordability.hint
                          : "Publish the service to expose the same affordability cue and visible price in discovery."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        Automation layer
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
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
                <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                  {pipelineSnapshot?.updatedAtLabel ?? "Mocked readiness"}
                </span>
              </div>
            }
          >
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {publishLaunchSummaryCards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.05] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Active release target
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Service</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {pipelineSnapshot?.service?.title ?? businessProfile.name}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      Release status: {getPipelineStatusLabel(releaseStatus)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Project</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {pipelineSnapshot?.project?.title ?? "No active project"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      {pipelineSnapshot?.project?.milestone ?? pipelineSnapshot?.lastActionLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">Current state</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {pipelineSnapshot?.lastActionLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Next milestone: {pipelineSnapshot?.nextMilestone ?? businessProfile.nextMilestone}
                  </p>
                </div>
                <div
                  className={`mt-4 rounded-2xl border p-3 ${getAffordabilityClasses(
                    consumerAffordability.tone,
                  )}`}
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-current/80">
                    {edenLaunchLabels.consumerReadiness}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {consumerLaunchPreviewCards.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-3 text-white"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                        <p className="mt-2 text-xs leading-5 text-white/50">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Pipeline controls
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  These controls mutate mocked local release state only. They are designed to preview the future innovator workflow without adding backend persistence.
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
                  className="relative rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                >
                  {index < (pipelineSnapshot?.stages.length ?? 0) - 1 ? (
                    <div className="pointer-events-none absolute right-[-1.2rem] top-8 hidden h-px w-[1.8rem] bg-eden-edge lg:block" />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-white">{stage.title}</h3>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getPipelineStageClasses(
                        stage.state,
                      )}`}
                    >
                      {stage.readiness}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/50">{stage.summary}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Readiness checklist
                </p>
                <div className="mt-4 space-y-3">
                  {pipelineSnapshot?.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${getChecklistStateClasses(
                          item.state,
                        )}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-white/50">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Publish gate
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    {pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent}%
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Mock publish readiness score based on the active pipeline status, release controls, and readiness checklist.
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-white/[0.05]">
                    <div
                      className="h-2 rounded-full bg-eden-accent"
                      style={{ width: `${pipelineSnapshot?.readinessPercent ?? businessProfile.publishReadinessPercent}%` }}
                    />
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Next unblocker
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {pipelineSnapshot?.nextMilestone ?? "Finish the manual QA pass and confirm the fee summary copy before publish."}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      {pipelineSnapshot?.lastActionLabel}
                    </p>
                  </div>
                </div>

                {publishPrepSuggestions.length ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                          AI publish fixes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/50">
                          Checklist-specific suggestions from the currently selected `Prepare for Publish` assistant run.
                        </p>
                      </div>
                      <a
                        href="#assistant"
                        className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
                      >
                        Review assistant
                      </a>
                    </div>
                    <div className="mt-4 space-y-3">
                      {publishPrepSuggestions.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 rounded-full ${getChecklistStateClasses(
                                item.state,
                              )}`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-white">{item.label}</p>
                              <p className="mt-1 text-sm leading-6 text-white/50">{item.detail}</p>
                              <p className="mt-2 text-sm leading-6 text-white">{item.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-white/50">
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
                <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
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
                  className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
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
                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                        Event filters
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/50">
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
                              ? "border-[#14989a]/50 bg-[#14989a]/15 text-white"
                              : "border-white/8 bg-eden-bg text-white/50 hover:border-[#14989a]/50 hover:text-white"
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
                      className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
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
                          <p className="mt-2 text-sm leading-6 text-white/50">{event.detail}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/50">
                            Actor: {event.actor}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Timestamp</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatPipelineTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <motion.div
                    variants={childVariants}
                    className="rounded-2xl border border-white/8 bg-white/[0.06] p-4 text-sm leading-6 text-white/50"
                  >
                    {releaseEventFilter === "all"
                      ? "No mocked transition history has been recorded for this workspace yet. Use the pipeline controls above to move the active release through build, testing, ready, and publish states."
                      : `No ${releaseEventFilter} transitions have been recorded for this workspace yet.`}
                  </motion.div>
                )}
              </motion.div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Current release summary
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {pipelineSnapshot?.service?.title ?? businessProfile.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {pipelineSnapshot?.project
                      ? `${pipelineSnapshot.project.title} is the active build target and is currently ${getPipelineStatusLabel(releaseStatus).toLowerCase()}.`
                      : `The active release target is currently ${getPipelineStatusLabel(releaseStatus).toLowerCase()} in mock mode.`}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/50">
                    Visibility: {pipelineSnapshot?.visibilityLabel ?? businessProfile.visibility}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Next release step
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {pipelineSnapshot?.nextMilestone ?? businessProfile.nextMilestone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Latest activity: {pipelineSnapshot?.lastActionLabel ?? "Shared mock release baseline."}
                  </p>
                  <div className="mt-4 rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Readiness</p>
                    <p className="mt-2 text-sm font-semibold text-white">
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
            eyebrow="Balances / Eden Leaf’s"
            title="Balance, usage, and fee clarity"
            description="The billing layer is still placeholder-only, but the workspace now exposes spendable Leaf’s, earned Leaf’s, usage, hosting, and fee visibility together."
            actions={
              <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
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
              <motion.div
                variants={childVariants}
                className={`rounded-2xl border p-4 ${getAffordabilityClasses(
                  consumerAffordability.tone,
                )}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-current/80">
                      Consumer launch snapshot
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {consumerLaunchStateLabel} |{" "}
                      {activeServicePricing.hasStoredPrice ? activeServicePricingLabel : "Price needs review"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-current/80">
                      {releaseStatus === "published"
                        ? `${consumerAffordability.hint} ${edenLaunchLabels.noHiddenCheckout}`
                        : "Consumers will see the same visible-price, Leaf’s-only guidance after this service is published."}
                    </p>
                  </div>
                  <span className="rounded-full border border-current/20 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
                    {consumerReadinessValue}
                  </span>
                </div>
              </motion.div>
              {billingUsage.map((item) => (
                <motion.div
                  key={item.id}
                  variants={childVariants}
                  className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {analyticsHighlights.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.05] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-eden-bg/65 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Transparent fee summary
              </p>
              <div className="mt-3 space-y-3">
                {billingSnapshot?.feeBreakdown.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b border-white/8/70 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-white/50">{item.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Innovator payout accounting
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {payoutAccounting.accountingRuleLabel}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                    {payoutAccounting.payoutStatusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {payoutAccountingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.06] p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout-ready services
                </p>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.perService.length ? (
                    payoutAccounting.perService.slice(0, 4).map((service) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{service.serviceTitle}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Unpaid earnings: {formatCredits(service.unpaidEarningsCredits)}
                            </p>
                            {service.internalUseCredits > 0 ? (
                              <p className="mt-1 text-sm leading-6 text-white/50">
                                Used internally: {formatCredits(service.internalUseCredits)}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(service.payoutReadyCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">Payout-ready</p>
                            <p className="mt-2 text-xs text-white/50">
                              Holdback: {formatCredits(service.holdbackCredits)}
                            </p>
                            <p className="mt-2 text-xs text-white/50">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Service-level payout accounting will appear here once the active business records priced usage.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Payout history
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Persistent payout settlement records for this business. These rows adjust paid-out and unpaid totals without sending any real payout.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
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
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
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
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {item.reference ?? "No payout reference recorded."}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {item.notes ?? "Internal accounting note not provided."}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                              Created
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {item.createdAtLabel}
                            </p>
                            <p className="mt-2 text-xs text-white/50">
                              {item.settledAtLabel
                                ? `Settled ${item.settledAtLabel}`
                                : "Not settled yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      No payout settlement records exist for this business yet. The Owner Dashboard can record internal mock settlements, and those rows will appear here immediately.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payout status overview
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Settled records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.settledCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.settledSettlementCredits,
                      )} marked as paid out
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Pending records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.pendingCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.pendingSettlementCredits,
                      )} queued internally
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Canceled records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.statusOverview.canceledCount}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatCredits(
                        payoutAccounting.statusOverview.canceledSettlementCredits,
                      )} removed from settlement history
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Current status
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {payoutAccounting.payoutStatusLabel}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Unpaid {formatCredits(payoutAccounting.unpaidEarningsCredits)} | Ready{" "}
                      {formatCredits(payoutAccounting.payoutReadyCredits)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Internal earned Leaf’s use
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Innovators can now reuse earned Leaf’s for internal Eden work without converting them into the spendable wallet or an external payout.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                    {formatCredits(payoutAccounting.availableForInternalUseCredits)} available
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Used internally
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCredits(payoutAccounting.earnedLeavesUsedInternallyCredits)}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {payoutAccounting.statusOverview.internalUseCount} internal Eden use record
                      {payoutAccounting.statusOverview.internalUseCount === 1 ? "" : "s"} applied.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Remaining earned Leaf’s
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCredits(payoutAccounting.availableForInternalUseCredits)}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      This remaining earned balance stays internal until future payout or transfer rails exist.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <MockInternalLeavesUsageButton
                    businessId={activeBusinessId}
                    amountCredits={internalUseSuggestedAmount}
                    label={
                      internalUseSuggestedAmount > 0
                        ? `Use ${formatCredits(internalUseSuggestedAmount)} internally`
                        : "No earned Leaf’s available for internal use"
                    }
                    detail={
                      internalUseSuggestedAmount > 0
                        ? "Record an internal Eden-use event against earned Leaf’s. This does not change the spendable wallet and does not create an external payout."
                        : "Earned Leaf’s must accrue through priced service usage before internal Eden use can be recorded."
                    }
                    reference={`business-internal-use-${activeBusinessId}`}
                    notes={`Business workspace internal Eden use for ${businessProfile?.name ?? activeBusinessId}`}
                    className="w-full border-sky-500/25 bg-sky-500/10 hover:border-sky-500/50 hover:bg-sky-500/15"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      Internal use history
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Persistent internal Eden-use rows for this business. These entries reduce remaining earned Leaf’s without touching Stripe-funded spendable Leaf’s.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                    {payoutAccounting.internalUseHistorySource === "persistent"
                      ? "Persistent records"
                      : "No persistent records"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {payoutAccounting.internalUseHistory.length ? (
                    payoutAccounting.internalUseHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {formatCredits(item.amountCredits)}
                              </p>
                              <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-sky-300">
                                {item.usageTypeLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {item.reference ?? "No internal-use reference recorded."}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {item.actorLabel}
                              {item.notes ? ` | ${item.notes}` : ""}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                              Recorded
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {item.createdAtLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      No internal earned-Leaf’s usage has been recorded for this business yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest usage services
                </p>
                <div className="mt-4 space-y-3">
                  {serviceUsageLeaders.length ? (
                    serviceUsageLeaders.slice(0, 3).map((service, index) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {service.serviceTitle}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {getServicePricingDisplay({
                                pricingModel: service.pricingModel,
                                pricePerUse: service.pricePerUseCredits,
                                pricingUnit: service.pricingUnit,
                              })}
                            </p>
                          </div>
                          <p className="text-xs text-white/50">{service.lastUsedAtLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Highest-usage services will appear once the workspace records tracked service runs.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Highest earning services
                </p>
                <div className="mt-4 space-y-3">
                  {serviceEarningLeaders.length ? (
                    serviceEarningLeaders.slice(0, 3).map((service, index) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {service.serviceTitle}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Innovator keeps{" "}
                              {formatCredits(service.monetization.estimatedBuilderEarningsCredits)}
                              {" "}from {formatCredits(service.monetization.estimatedGrossCredits)} gross.
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              Eden fee share {formatCredits(
                                service.monetization.estimatedPlatformEarningsCredits,
                              )}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            {getServicePricingDisplay({
                              pricingModel: service.pricingModel,
                              pricePerUse: service.pricePerUseCredits,
                              pricingUnit: service.pricingUnit,
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Pricing-based earning leaders appear here once the active business records priced usage.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent usage momentum
                </p>
                <div className="mt-4 space-y-3">
                  {serviceMomentumLeaders.some((service) => service.recentMomentumCount > 0) ? (
                    serviceMomentumLeaders
                      .filter((service) => service.recentMomentumCount > 0)
                      .slice(0, 3)
                      .map((service) => (
                        <div
                          key={service.serviceId}
                          className="rounded-2xl border border-white/8 bg-white/[0.06] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {service.serviceTitle}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-white/50">
                                {service.recentMomentumCount} of the latest {recentUsageWindow.length} tracked
                                runs landed on this service.
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                                {getServicePricingDisplay({
                                  pricingModel: service.pricingModel,
                                  pricePerUse: service.pricePerUseCredits,
                                  pricingUnit: service.pricingUnit,
                                })}
                              </p>
                            </div>
                            <p className="text-xs text-white/50">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4 text-sm leading-6 text-white/50">
                      Momentum appears after fresh usage events arrive. The latest eight tracked runs are used for this quick pulse.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Recent Eden transactions
              </p>
              <div className="mt-4 space-y-3">
                {billingSnapshot?.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-eden-bg/60 p-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{transaction.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getTransactionDirectionClasses(
                            transaction.direction,
                          )}`}
                        >
                          {transaction.direction}
                        </span>
                        {transaction.simulated ? (
                          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            Local mock
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/50">{transaction.detail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-semibold text-white">{transaction.amountLabel}</p>
                      <p className="mt-1 text-xs text-white/50">{transaction.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(300px,0.94fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Per-service usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.perService.length ? (
                    usageMetrics.perService.map((service) => (
                      <div
                        key={service.serviceId}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{service.serviceTitle}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {service.usageCount} runs | {formatCredits(service.totalCreditsUsed)} used
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Current rate:{" "}
                              {getServicePricingDisplay({
                                pricingModel: service.pricingModel,
                                pricePerUse: service.pricePerUseCredits,
                                pricingUnit: service.pricingUnit,
                              })}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Estimated innovator earnings:{" "}
                              {formatCredits(service.monetization.estimatedBuilderEarningsCredits)}.
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(service.monetization.estimatedPlatformEarningsCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">Eden fee share</p>
                            <p className="mt-2 text-xs text-white/50">
                              Gross: {formatCredits(service.monetization.estimatedGrossCredits)}
                            </p>
                            <p className="mt-2 text-xs text-white/50">{service.lastUsedAtLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      No service usage has been tracked for this workspace yet. Use the mock transaction controls to simulate service usage and populate this view.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Recent usage events
                  </p>
                  <div className="mt-4 space-y-3">
                    {usageMetrics.recentUsageEvents.length ? (
                      usageMetrics.recentUsageEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{event.serviceTitle}</p>
                              <p className="mt-1 text-sm leading-6 text-white/50">
                                {formatCredits(event.creditsUsed)} of spendable Leaf’s used through {event.usageType.replace(/_/g, " ")}.
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                Gross estimate: {formatCredits(event.estimatedGrossCredits)}
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                Innovator share: {formatCredits(event.builderEarningsCredits)} | Eden fee:{" "}
                                {formatCredits(event.platformFeeCredits)}
                              </p>
                            </div>
                            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                              {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                            {event.timestampLabel}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                        Usage events will appear here after the active service is run through the mocked execution flow.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Monetization-ready projection
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {usageMetrics.monetization.pricingRuleLabel}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Estimated gross</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatCredits(usageMetrics.monetization.estimatedGrossCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Innovator keeps</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatCredits(usageMetrics.monetization.estimatedBuilderEarningsCredits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/50">Eden fee share</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatCredits(usageMetrics.monetization.estimatedPlatformEarningsCredits)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top customers by value
                </p>
                <div className="mt-4 space-y-3">
                  {topCustomersByValue.length ? (
                    topCustomersByValue.slice(0, 3).map((customer, index) => (
                      <div
                        key={`${customer.userId ?? customer.userDisplayName}-value`}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {customer.userDisplayName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {customer.username ? `@${customer.username}` : "Guest wallet"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Projected value {formatCredits(customer.projectedCustomerValueCredits)} across{" "}
                              {customer.perService.length} service
                              {customer.perService.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Top service: {customer.topServiceTitle}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatCredits(
                                customer.monetization.estimatedBuilderEarningsCredits,
                              )}
                            </p>
                            <p className="mt-1 text-xs text-white/50">Innovator value</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Customer value leaders appear here after the active business records tracked usage.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top customers by usage
                </p>
                <div className="mt-4 space-y-3">
                  {topCustomersByUsage.length ? (
                    topCustomersByUsage.slice(0, 3).map((customer, index) => (
                      <div
                        key={`${customer.userId ?? customer.userDisplayName}-usage`}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {index + 1}. {customer.userDisplayName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {customer.usageCount} runs | {customer.usageSharePercent}% of tracked usage
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Projected value {formatCredits(customer.projectedCustomerValueCredits)}.
                            </p>
                            <p className="mt-1 text-xs text-white/50">{customer.lastUsedAtLabel}</p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            {customer.topServiceTitle}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Usage leaders appear here once tracked customers accumulate across the active services.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Customer growth pulse
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Highest value customer
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {highestValueCustomer?.userDisplayName ?? "No customer value yet"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {highestValueCustomer
                        ? `${formatCredits(highestValueCustomer.projectedCustomerValueCredits)} projected value with ${formatCredits(
                            highestValueCustomer.monetization.estimatedBuilderEarningsCredits,
                          )} in innovator-side earnings.`
                        : "Projected customer value appears once priced service usage is tracked."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Highest usage customer
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {highestUsageCustomer?.userDisplayName ?? "No usage leader yet"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {highestUsageCustomer
                        ? `${highestUsageCustomer.usageCount} runs and ${highestUsageCustomer.usageSharePercent}% of tracked demand.`
                        : "Usage concentration appears once multiple tracked runs are tied to customers."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Latest customer activity
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {latestCustomerActivity?.userDisplayName ?? "No recent customer activity"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {latestCustomerActivity
                        ? `${latestCustomerActivity.userDisplayName} used ${latestCustomerActivity.serviceTitle} for ${formatCredits(
                            latestCustomerActivity.creditsUsed,
                          )}.`
                        : "Recent customer activity appears here after tracked service runs are recorded."}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      {latestCustomerActivity?.timestampLabel ?? "Waiting for the next tracked customer event."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Top customers by usage
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.topCustomers.length ? (
                    usageMetrics.topCustomers.map((customer) => (
                      <div
                        key={customer.userId ?? `guest-${customer.userDisplayName}`}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {customer.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                {customer.isAnonymousUser
                                  ? "Guest"
                                  : customer.username
                                    ? `@${customer.username}`
                                    : "Customer"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {customer.usageCount} runs across {customer.perService.length} service
                              {customer.perService.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Top service: {customer.topServiceTitle}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-white/50">
                              Estimated customer value:{" "}
                              {formatCredits(customer.projectedCustomerValueCredits)}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-white">
                              {customer.usageSharePercent}% of tracked runs
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Innovator earnings:{" "}
                              {formatCredits(
                                customer.monetization.estimatedBuilderEarningsCredits,
                              )}
                            </p>
                            <p className="mt-2 text-xs text-white/50">
                              {customer.lastUsedAtLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
                      Customer usage rankings will populate after tracked service runs are recorded
                      for this workspace.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Recent customer activity
                </p>
                <div className="mt-4 space-y-3">
                  {usageMetrics.recentCustomerActivity.length ? (
                    usageMetrics.recentCustomerActivity.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">
                                {event.userDisplayName}
                              </p>
                              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                {event.username ? `@${event.username}` : "Guest wallet"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              Used {event.serviceTitle} for {formatCredits(event.creditsUsed)} of spendable Leaf’s.
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Estimated customer value:{" "}
                              {formatCredits(event.estimatedGrossCredits)}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Innovator share: {formatCredits(event.builderEarningsCredits)} | Eden fee:{" "}
                              {formatCredits(event.platformFeeCredits)}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                            {event.source === "persistent" ? "Persistent" : "Mock fallback"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                          {event.timestampLabel}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-eden-bg/60 p-4 text-sm leading-6 text-white/50">
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
                description={`These development-only actions append local Eden Leaf’s events for ${businessProfile.name}.`}
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
                className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
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
                  className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
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
      className="overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.05] p-5 md:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
            Business Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Create your first mocked Eden business
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
            This business-role session does not have an active workspace yet. Start with the
            mocked creation flow, review the idea-to-business summary, and then enter the innovator
            shell with a live local business context.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/business/create?source=business_dashboard"
              className="rounded-xl border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20"
            >
              Start business creation
            </Link>
            <span className="rounded-xl border border-white/[0.07] bg-white/[0.05] px-4 py-2 text-sm text-white/50">
              Active operator: {session.user.displayName}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              What you will define
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Name, description, category, tags, audience, monetization placeholder, and a review
              step before the workspace opens.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Result
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Eden will keep the business local to this mock session and treat it like the active
              workspace for the Business Dashboard.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}





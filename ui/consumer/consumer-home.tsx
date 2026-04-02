"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EdenStakeCard } from "@/components/eden-stake-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
import type {
  EdenAiAction,
  EdenAiBusinessResult,
  EdenAiIdeaResult,
  EdenAiRequest,
  EdenAiRouteResult,
  EdenAiServiceResult,
} from "@/modules/eden-ai/types";
import {
  type EdenDiscoverySnapshot,
  categories,
  formatCredits,
  getUserById,
} from "@/modules/core/mock-data";
import { EdenBrandLockup } from "@/modules/core/components/eden-brand-lockup";
import type { EdenMockSession } from "@/modules/core/session/mock-session";
import {
  formatServicePricingLabel,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import { AskEdenBusinessResultCard } from "@/ui/consumer/components/ask-eden-business-result-card";
import { AskEdenIdeaResultCard } from "@/ui/consumer/components/ask-eden-idea-result-card";
import { AskEdenServiceResultCard } from "@/ui/consumer/components/ask-eden-service-result-card";
import { BusinessCard } from "@/ui/consumer/components/business-card";
import { CategoryCard } from "@/ui/consumer/components/category-card";
import { ConsumerWalletPanel } from "@/ui/consumer/components/consumer-wallet-panel";
import { EarningsPayoutsPanel } from "@/ui/consumer/components/earnings-payouts-panel";
import { DiscoveryRail } from "@/ui/consumer/components/discovery-rail";
import {
  edenLaunchLabels,
  getCreditsOnlyTrustLabel,
  getLaunchAvailabilityLabel,
  getLaunchBadgeLabel,
  getServiceAffordabilityDetails,
} from "@/ui/consumer/components/service-affordability-shared";
import { ServiceCard } from "@/ui/consumer/components/service-card";
import { OrbitalDiagram } from "@/modules/core/components/orbital-diagram";

type ConsumerServiceRailItem = {
  id: string;
  title: string;
  provider: string;
  category: string;
  saved: boolean;
  availabilityLabel: string;
  pricingLabel: string;
  trustLabel: string;
  launchBadgeLabel: string;
  affordabilityLabel: string;
  affordabilityHint: string;
  affordabilityTone: "ready" | "warning" | "neutral";
  href: string;
};

type ConsumerBusinessRailItem = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  saved: boolean;
};

type ConsumerHomePanelProps = {
  session: EdenMockSession;
  discoverySnapshot: EdenDiscoverySnapshot;
  currentBalanceCredits: number;
  recentWalletTransactions: EdenConsumerTransactionHistoryItem[];
};

type EdenResultLane = "service" | "business" | "idea";

type EdenTurn = {
  id: string;
  prompt: string;
  response: EdenAiRouteResult;
};

type SelectedResult = {
  lane: EdenResultLane;
  id: string;
};

type SelectedResultDetails = {
  lane: EdenResultLane;
  laneLabel: string;
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  chips: string[];
  actionLabel: string;
  href: string;
  supportingText: string;
  guidanceTitle?: string;
  guidanceDetail?: string;
  guidanceTone?: "ready" | "warning" | "neutral";
  guidanceCards?: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const railVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const railCardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const responseLaneVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const responseCardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

type ConsumerTopBarActionsProps = {
  savedOnly: boolean;
  savedBusinessCount: number;
  onToggleSaved: () => void;
};

function ConsumerTopBarActions({
  savedOnly,
  savedBusinessCount,
  onToggleSaved,
}: ConsumerTopBarActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleSaved}
        className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
          savedOnly
            ? "border-[#2dd4bf]/50 bg-[#2dd4bf]/15 text-white"
            : "border-[rgba(45,212,191,0.09)] bg-white/[0.035] text-white/50 hover:border-[#2dd4bf]/50 hover:text-white"
        }`}
      >
        Saved Businesses ({savedBusinessCount})
      </button>
    </>
  );
}

function includesSearchTerm(values: string[], searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(searchTerm));
}

function buildSearchParams(values: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (!value) {
      continue;
    }

    searchParams.set(key, value);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonResponseSafely(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function requestEdenAi(body: EdenAiRequest) {
  const response = await fetch("/api/eden-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await readJsonResponseSafely(response);

  if (!response.ok || payload.ok !== true || !payload.result) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Ask Eden could not complete this request.",
    );
  }

  return payload.result as EdenAiRouteResult;
}

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getConsumerServiceLaunchDetails(input: {
  category: string;
  status?: string | null;
  pricePerUse?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  pricingModel?: string | null;
}) {
  const normalizedStatus = (input.status ?? "").toLowerCase();
  const pricing = resolveServicePricing({
    pricePerUse: input.pricePerUse,
    pricingType: input.pricingType,
    pricingUnit: input.pricingUnit,
    pricingModel: input.pricingModel,
  });
  const pricingLabel = formatServicePricingLabel(
    {
      pricePerUse: input.pricePerUse,
      pricingType: input.pricingType,
      pricingUnit: input.pricingUnit,
      pricingModel: input.pricingModel,
    },
    {
      fallbackLabel: input.pricingModel
        ? `${input.pricingModel} pricing not finalized`
        : "Pricing details pending",
      includePricingModel: true,
    },
  );
  const availabilityLabel = getLaunchAvailabilityLabel(normalizedStatus);
  const launchBadgeLabel = getLaunchBadgeLabel(normalizedStatus, pricing.hasStoredPrice);
  const trustLabel = getCreditsOnlyTrustLabel(pricing.hasStoredPrice);

  return {
    availabilityLabel,
    pricingLabel,
    launchBadgeLabel,
    trustLabel,
    pricing,
  };
}

function getLinkedDiscoveryService(
  discoverySnapshot: EdenDiscoverySnapshot,
  serviceId: string,
) {
  return (
    discoverySnapshot.serviceCatalog.find((item) => item.id === serviceId) ??
    discoverySnapshot.marketplaceServices.find((item) => item.id === serviceId) ??
    discoverySnapshot.marketplaceServices[0] ??
    discoverySnapshot.serviceCatalog[0] ??
    null
  );
}

function getLinkedDiscoveryBusiness(
  discoverySnapshot: EdenDiscoverySnapshot,
  businessId?: string | null,
) {
  if (businessId) {
    return (
      discoverySnapshot.businessCatalog.find((item) => item.id === businessId) ??
      discoverySnapshot.marketplaceBusinesses.find((item) => item.id === businessId) ??
      null
    );
  }

  return (
    discoverySnapshot.marketplaceBusinesses[0] ??
    discoverySnapshot.businessCatalog[0] ??
    null
  );
}

function getConsumerServiceDiscoveryState(
  service: Pick<EdenAiServiceResult, "id" | "title" | "category" | "description">,
  discoverySnapshot: EdenDiscoverySnapshot,
  currentBalanceCredits: number,
) {
  const linkedService = getLinkedDiscoveryService(discoverySnapshot, service.id);
  const linkedBusiness = getLinkedDiscoveryBusiness(discoverySnapshot, linkedService?.businessId);
  const launchDetails = getConsumerServiceLaunchDetails({
    category: linkedService?.category ?? service.category,
    status: linkedService?.status,
    pricePerUse: linkedService?.pricePerUse,
    pricingType: linkedService?.pricingType,
    pricingUnit: linkedService?.pricingUnit,
    pricingModel: linkedService?.pricingModel,
  });
  const affordability = getServiceAffordabilityDetails(
    launchDetails.pricing.pricePerUseCredits,
    currentBalanceCredits,
  );

  return {
    linkedService,
    linkedBusiness,
    launchDetails,
    affordability,
    href: buildServiceDetailHref(service, discoverySnapshot),
  };
}

function buildServiceDetailHref(
  service: Pick<EdenAiServiceResult, "id" | "title" | "category" | "description">,
  discoverySnapshot: EdenDiscoverySnapshot,
) {
  const linkedService = getLinkedDiscoveryService(discoverySnapshot, service.id);
  const linkedBusiness = getLinkedDiscoveryBusiness(discoverySnapshot, linkedService?.businessId);
  const routeId = linkedService?.id ?? service.id;
  const category = linkedService?.category ?? service.category;
  const status = linkedService?.status ?? "Standby";
  const summary = linkedService?.summary ?? service.description;
  const tags = linkedService?.tags ?? [category];

  // Custom service pages override the generic detail route
  const customRoutes: Record<string, string> = {
    "service-06": "/services/imagine-auto",
    "service-market-lens": "/services/market-lens",
    "service-spot-splore": "/services/spot-splore",
  };
  if (customRoutes[routeId]) return customRoutes[routeId];

  return `/services/${routeId}${buildSearchParams({
    title: service.title,
    category,
    summary,
    status,
    tags: tags.join(","),
    business: linkedBusiness?.name,
    businessId: linkedBusiness?.id,
  })}`;
}

function buildBusinessDetailHref(
  business: EdenAiBusinessResult,
  discoverySnapshot: EdenDiscoverySnapshot,
) {
  const linkedBusiness =
    discoverySnapshot.businessCatalog.find((item) => item.id === business.id) ??
    discoverySnapshot.marketplaceBusinesses[0] ??
    discoverySnapshot.businessCatalog[0] ??
    null;
  const routeId = linkedBusiness?.id ?? business.id;
  const owner = linkedBusiness ? getUserById(linkedBusiness.ownerUserId) : null;
  const status = linkedBusiness ? toTitleCase(linkedBusiness.status) : "Matched";

  return `/businesses/${routeId}${buildSearchParams({
    name: business.name,
    summary: business.summary,
    status,
    tags: business.tags.join(","),
    owner: owner?.displayName,
    serviceId: linkedBusiness?.featuredServiceId,
  })}`;
}

function getDefaultSelectedResult(response: EdenAiRouteResult): SelectedResult | null {
  const prioritizedLanes = new Set<EdenResultLane>();

  for (const route of response.lanes) {
    if (route === "service_search") {
      prioritizedLanes.add("service");
      continue;
    }

    if (route === "business_discovery") {
      prioritizedLanes.add("business");
      continue;
    }

    prioritizedLanes.add("idea");
  }

  prioritizedLanes.add("service");
  prioritizedLanes.add("business");
  prioritizedLanes.add("idea");

  for (const lane of prioritizedLanes) {
    if (lane === "service" && response.results.services[0]) {
      return { lane, id: response.results.services[0].id };
    }

    if (lane === "business" && response.results.businesses[0]) {
      return { lane, id: response.results.businesses[0].id };
    }

    if (lane === "idea" && response.results.ideas[0]) {
      return { lane, id: response.results.ideas[0].id };
    }
  }

  return null;
}

function getSelectedServiceDetails(
  service: EdenAiServiceResult,
  discoverySnapshot: EdenDiscoverySnapshot,
  currentBalanceCredits: number,
): SelectedResultDetails {
  const { href, launchDetails, linkedBusiness, linkedService, affordability } = getConsumerServiceDiscoveryState(
    service,
    discoverySnapshot,
    currentBalanceCredits,
  );

  return {
    lane: "service",
    laneLabel: "Service",
    id: service.id,
    title: service.title,
    description: linkedService?.summary ?? service.description,
    eyebrow: `${launchDetails.availabilityLabel} ${linkedService?.category ?? service.category} service`,
    chips: [
      launchDetails.launchBadgeLabel,
      launchDetails.pricingLabel,
      affordability.label,
      edenLaunchLabels.creditsOnlyBilling,
      ...(linkedService?.tags ?? [service.category]),
    ].slice(0, 5),
    actionLabel: edenLaunchLabels.openService,
    href,
    supportingText:
      `This canonical service route keeps Ask Eden aligned with ${linkedBusiness?.name ?? "the wider Eden platform"}: ${launchDetails.availabilityLabel.toLowerCase()}, ${edenLaunchLabels.visiblePricing.toLowerCase()}, and ${edenLaunchLabels.creditsOnlyBilling.toLowerCase()} with ${edenLaunchLabels.noHiddenCheckout.toLowerCase()} ${affordability.hint}`,
    guidanceTitle:
      affordability.tone === "ready"
        ? "You can open and run this service now"
        : affordability.tone === "warning"
          ? "Top up before your first run"
          : "Open the service to confirm the run price",
    guidanceDetail:
      affordability.tone === "ready"
        ? `${service.title} is already within your current wallet balance, so the next step is to open the service and confirm the visible price before you run it.`
        : affordability.tone === "warning"
          ? `${service.title} is published and priced, but your wallet is not yet high enough for one run. ${edenLaunchLabels.addCredits} first, then reopen the service and ${edenLaunchLabels.runService.toLowerCase()} at the visible price.`
          : `${service.title} still needs a final visible pricing confirmation on the service detail route before the wallet decision becomes explicit.`,
    guidanceTone: affordability.tone,
    guidanceCards: [
      {
        label: "Availability",
        value: launchDetails.availabilityLabel,
        detail: "Discovery stays aligned with the live publish state shown on the service route.",
      },
      {
        label: edenLaunchLabels.visiblePricing,
        value: launchDetails.pricingLabel,
        detail: "The same Eden Leafs price is shown before the service run begins.",
      },
      {
        label: "Wallet position",
        value:
          affordability.tone === "warning"
            ? affordability.hint
            : `${formatCredits(currentBalanceCredits)} available right now.`,
        detail: "Affordability is checked against your current Eden Wallet balance.",
      },
      {
        label: "Next step",
        value: affordability.nextStep,
        detail: edenLaunchLabels.noHiddenCheckout,
      },
    ],
  };
}

function getSelectedBusinessDetails(
  business: EdenAiBusinessResult,
  discoverySnapshot: EdenDiscoverySnapshot,
): SelectedResultDetails {
  return {
    lane: "business",
    laneLabel: "Business",
    id: business.id,
    title: business.name,
    description: business.summary,
    eyebrow: "Business match",
    chips: business.tags,
    actionLabel: "Open Business",
    href: buildBusinessDetailHref(business, discoverySnapshot),
    supportingText:
      "Use this business surface to inspect the current marketplace profile and continue from Ask Eden into the broader platform.",
  };
}

function buildBusinessCreationHref(idea: EdenAiIdeaResult) {
  if (idea.projectArtifact?.created && idea.projectArtifact.projectId) {
    return "/business";
  }

  const searchParams = new URLSearchParams({
    source: "ask_eden",
    ideaTitle: idea.title,
    ideaDescription: idea.description,
  });

  return `/business/create?${searchParams.toString()}`;
}

function getSelectedIdeaDetails(idea: EdenAiIdeaResult): SelectedResultDetails {
  return {
    lane: "idea",
    laneLabel: "Idea",
    id: idea.id,
    title: idea.title,
    description: idea.description,
    eyebrow: "Idea suggestion",
    chips: ["Concept", "Prototype-ready"],
    actionLabel: "Start Building",
    href: buildBusinessCreationHref(idea),
    supportingText:
      idea.projectArtifact?.created
        ? "This project is already staged in the Business workspace, so the next step is to open the innovator surface and continue operating it."
        : "This idea is still a proposed build path until you stage it inside the Business workspace.",
  };
}

function getSelectedResultDetails(
  response: EdenAiRouteResult,
  selection: SelectedResult | null,
  discoverySnapshot: EdenDiscoverySnapshot,
  currentBalanceCredits: number,
): SelectedResultDetails | null {
  if (!selection) {
    return null;
  }

  if (selection.lane === "service") {
    const service = response.results.services.find((item) => item.id === selection.id);
    return service ? getSelectedServiceDetails(service, discoverySnapshot, currentBalanceCredits) : null;
  }

  if (selection.lane === "business") {
    const business = response.results.businesses.find((item) => item.id === selection.id);
    return business ? getSelectedBusinessDetails(business, discoverySnapshot) : null;
  }

  const idea = response.results.ideas.find((item) => item.id === selection.id);
  return idea ? getSelectedIdeaDetails(idea) : null;
}

export function ConsumerHomePanel({
  session,
  discoverySnapshot,
  currentBalanceCredits,
  recentWalletTransactions,
}: ConsumerHomePanelProps) {
  const router = useRouter();
  const activeUser = getUserById(session.user.id);
  const [promptInput, setPromptInput] = useState("");
  const [modalService, setModalService] = useState<ConsumerServiceRailItem | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [turns, setTurns] = useState<EdenTurn[]>([]);
  const [assistantStateText, setAssistantStateText] = useState(
    "Ask Eden is ready for discovery.",
  );
  const [selectedResult, setSelectedResult] = useState<SelectedResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{ leafsToday: number; transactionsToday: number; activeServices: number } | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      fetch("/api/stats/live").then((r) => r.json()).then((d) => { if (d.ok) setLiveStats(d); }).catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);
  const normalizedQuery = activeQuery.trim().toLowerCase();
  const savedBusinessIds = useMemo(() => new Set(activeUser?.savedBusinessIds ?? []), [activeUser]);
  const savedServiceIds = useMemo(() => new Set(activeUser?.savedServiceIds ?? []), [activeUser]);
  const savedBusinessCount = activeUser?.savedBusinessIds.length ?? 0;
  const latestTurn = turns.length ? turns[turns.length - 1] : null;
  const selectedResultDetails = useMemo(
    () =>
      latestTurn
        ? getSelectedResultDetails(
            latestTurn.response,
            selectedResult,
            discoverySnapshot,
            currentBalanceCredits,
          )
        : null,
    [currentBalanceCredits, discoverySnapshot, latestTurn, selectedResult],
  );
  const consumerLaunchClarityCards = useMemo(
    () => [
      {
        id: "consumer-launch-services",
        label: "Published services",
        value: `${discoverySnapshot.marketplaceServices.length}`,
        detail: "Discover live services that are already visible in Eden's consumer marketplace.",
      },
      {
        id: "consumer-launch-price",
        label: edenLaunchLabels.visiblePricing,
        value: "Shown before every run",
        detail: "Each service detail page shows the exact Eden Leafs price before usage begins.",
      },
      {
        id: "consumer-launch-wallet",
        label: "Wallet balance",
        value: formatCredits(currentBalanceCredits),
        detail: "Top up once, then reuse Eden Leafs across discovery and service runs.",
      },
      {
        id: "consumer-launch-payments",
        label: edenLaunchLabels.creditsOnlyBilling,
        value: "Top-up only",
        detail: "Checkout appears only when you explicitly Add Leafs. Service runs deduct only the visible wallet price.",
      },
    ],
    [currentBalanceCredits, discoverySnapshot.marketplaceServices.length],
  );
  const consumerJourneySteps = useMemo(
    () => [
      {
        id: "consumer-step-open",
        label: "1. Open a published service",
        detail:
          "Use marketplace cards or Ask Eden results to open a service with visible availability and pricing.",
      },
      {
        id: "consumer-step-compare",
        label: "2. Compare price to your wallet",
        detail:
          "Check the Eden Leafs price against your current balance before you decide to run the service.",
      },
      {
        id: "consumer-step-topup",
        label: "3. Add Leafs only if needed",
        detail:
          "Top up through the wallet if your balance is too low. Checkout appears only during this explicit step.",
      },
      {
        id: "consumer-step-run",
        label: "4. Run Service with visible pricing",
        detail:
          "A successful run deducts only the shown wallet amount and records the service usage immediately.",
      },
    ],
    [],
  );
  const consumerNextStepSummary = useMemo(() => {
    const pricedMarketplaceServices = discoverySnapshot.marketplaceServices
      .map((service) => ({
        service,
        pricing: resolveServicePricing({
          pricePerUse: service.pricePerUse,
          pricingType: service.pricingType,
          pricingUnit: service.pricingUnit,
          pricingModel: service.pricingModel,
        }),
      }))
      .filter((entry) => entry.pricing.pricePerUseCredits !== null)
      .sort(
        (left, right) =>
          (left.pricing.pricePerUseCredits ?? Number.MAX_SAFE_INTEGER) -
          (right.pricing.pricePerUseCredits ?? Number.MAX_SAFE_INTEGER),
      );
    const lowestPricedService = pricedMarketplaceServices[0] ?? null;

    if (!lowestPricedService) {
      return {
        title: "Open Service to preview the first run flow",
        detail:
          "Published marketplace services still use fallback pricing in this environment, so the wallet and service detail screens explain the Leafs flow step by step.",
        cue: edenLaunchLabels.openService,
      };
    }

    if (
      lowestPricedService.pricing.pricePerUseCredits !== null &&
      currentBalanceCredits >= lowestPricedService.pricing.pricePerUseCredits
    ) {
      return {
        title: "You can run a published service now",
        detail: `${lowestPricedService.service.title} is already within your wallet balance. Open the service, confirm the visible price, and run it through Eden Leafs.`,
        cue: `${edenLaunchLabels.openService}, then ${edenLaunchLabels.runService}`,
      };
    }

    return {
      title: "Top up before your first service run",
      detail: `${lowestPricedService.service.title} is the lowest-priced published service right now, and it still needs ${formatCredits(
        lowestPricedService.pricing.pricePerUseCredits ?? 0,
      )}. ${edenLaunchLabels.addCredits} in Eden Wallet first, then ${edenLaunchLabels.openService.toLowerCase()} and ${edenLaunchLabels.runService.toLowerCase()} at the visible price.`,
      cue: `${edenLaunchLabels.addCredits} in Eden Wallet, then ${edenLaunchLabels.openService}`,
    };
  }, [currentBalanceCredits, discoverySnapshot.marketplaceServices]);
  const consumerHeaderSummaryCards = useMemo(
    () => [
      {
        id: "header-innovators",
        label: "For innovators",
        detail:
          "Innovators publish services with visible pricing so they can appear as published and available in discovery.",
      },
      {
        id: "header-consumers",
        label: "For consumers",
        detail:
          "Consumers open published services, compare the visible price to their wallet, then Add Leafs only if needed.",
      },
      {
        id: "header-billing",
        label: edenLaunchLabels.creditsOnlyBilling,
        detail:
          "Service runs use wallet Leafs only, and no hidden checkout appears during service use.",
      },
    ],
    [],
  );

  const recommendedServices = useMemo<ConsumerServiceRailItem[]>(
    () =>
      discoverySnapshot.marketplaceServices
        .map((service) => {
          const { href, launchDetails, linkedBusiness, affordability } = getConsumerServiceDiscoveryState(
            {
              id: service.id,
              title: service.title,
              category: service.category,
              description: service.summary,
            },
            discoverySnapshot,
            currentBalanceCredits,
          );

          return {
            id: service.id,
            title: service.title,
            provider: linkedBusiness?.name ?? "Connected Business",
            category: service.category,
            saved: savedServiceIds.has(service.id),
            availabilityLabel: launchDetails.availabilityLabel,
            pricingLabel: launchDetails.pricingLabel,
            trustLabel: launchDetails.trustLabel,
            launchBadgeLabel: launchDetails.launchBadgeLabel,
            affordabilityLabel: affordability.label,
            affordabilityHint: affordability.hint,
            affordabilityTone: affordability.tone,
            href,
          };
        })
        .filter((service) =>
          includesSearchTerm([service.title, service.provider, service.category], normalizedQuery),
        )
        .sort((left, right) => {
          const tonePriority = {
            ready: 0,
            neutral: 1,
            warning: 2,
          } as const;

          const toneDifference =
            tonePriority[left.affordabilityTone] - tonePriority[right.affordabilityTone];

          if (toneDifference !== 0) {
            return toneDifference;
          }

          return left.title.localeCompare(right.title);
        }),
    [currentBalanceCredits, discoverySnapshot, normalizedQuery, savedServiceIds],
  );
  const recommendedServicesReadyCount = useMemo(
    () => recommendedServices.filter((service) => service.affordabilityTone === "ready").length,
    [recommendedServices],
  );

  const trendingBusinesses = useMemo<ConsumerBusinessRailItem[]>(
    () =>
      discoverySnapshot.marketplaceBusinesses
        .map((business) => ({
          id: business.id,
          name: business.name,
          tagline: business.tagline,
          category: business.category,
          saved: savedBusinessIds.has(business.id),
        }))
        .filter((business) => {
          const matchesSavedFilter = !savedOnly || business.saved;
          const matchesSearch = includesSearchTerm(
            [business.name, business.tagline, business.category],
            normalizedQuery,
          );

          return matchesSavedFilter && matchesSearch;
        }),
    [discoverySnapshot, normalizedQuery, savedBusinessIds, savedOnly],
  );

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery && !savedOnly) {
      return categories;
    }

    const activeCategories = new Set<string>();

    for (const service of recommendedServices) {
      activeCategories.add(service.category);
    }

    for (const business of trendingBusinesses) {
      activeCategories.add(business.category);
    }

    return categories.filter((category) => activeCategories.has(category.label));
  }, [normalizedQuery, recommendedServices, savedOnly, trendingBusinesses]);

  async function handleAskEden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isThinking) {
      return;
    }

    const submittedPrompt = promptInput.trim();
    if (!submittedPrompt) {
      return;
    }

    setActiveQuery(submittedPrompt);
    setPendingPrompt(submittedPrompt);
    setIsThinking(true);
    setAssistantStateText("Routing your request across discovery lanes...");

    try {
      const response = await requestEdenAi({
        prompt: submittedPrompt,
      });
      const defaultSelection = getDefaultSelectedResult(response);

      setTurns((currentTurns) => [
        ...currentTurns,
        {
          id: `turn-${currentTurns.length + 1}`,
          prompt: submittedPrompt,
          response,
        },
      ]);
      setSelectedResult(defaultSelection);
      setAssistantStateText(
        response.actionOutcome?.message ??
          "Results are ready. Explore the cards and continue from a live or proposed Eden action.",
      );
    } catch (error) {
      setAssistantStateText(
        error instanceof Error
          ? error.message
          : "Ask Eden could not complete this request. Please try again.",
      );
    } finally {
      setIsThinking(false);
      setPendingPrompt("");
    }
  }

  function buildSelectedContext() {
    const context: {
      businessId?: string;
      projectId?: string;
      agentId?: string;
      serviceId?: string;
    } = {};

    if (selectedResult?.lane === "service") {
      context.serviceId = selectedResult.id;
    }

    if (selectedResult?.lane === "business") {
      context.businessId = selectedResult.id;
    }

    if (selectedResult?.lane === "idea" && latestTurn?.response.results.project?.projectId) {
      context.projectId = latestTurn.response.results.project.projectId;
      if (latestTurn.response.results.project.businessId) {
        context.businessId = latestTurn.response.results.project.businessId;
      }
    }

    if (latestTurn?.response.results.project?.businessId && !context.businessId) {
      context.businessId = latestTurn.response.results.project.businessId;
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  async function handleAskEdenAction(action: EdenAiAction) {
    if (!latestTurn || isThinking) {
      return;
    }

    if (action.href) {
      handleResultAction(action.label, action.label, action.href);
      return;
    }

    setIsThinking(true);
    setAssistantStateText(`${action.label} is running through the Eden operator layer...`);

    try {
      const response = await requestEdenAi({
        prompt: latestTurn.prompt,
        selectedContext: buildSelectedContext(),
        requestedAction: {
          type: action.type,
          targetId: action.targetId,
          payload: action.payload,
        },
      });

      setTurns((currentTurns) => [
        ...currentTurns,
        {
          id: `turn-${currentTurns.length + 1}`,
          prompt: latestTurn.prompt,
          response,
        },
      ]);
      setSelectedResult(getDefaultSelectedResult(response));
      setAssistantStateText(
        response.actionOutcome?.message ??
          `${action.label} completed through the Eden operator layer.`,
      );
    } catch (error) {
      setAssistantStateText(
        error instanceof Error
          ? error.message
          : `${action.label} could not complete right now.`,
      );
    } finally {
      setIsThinking(false);
    }
  }

  function handleSelectResult(lane: EdenResultLane, id: string, label: string) {
    setSelectedResult({ lane, id });
    setAssistantStateText(`Selected: ${label}`);
  }

  function handleResultAction(actionLabel: string, label: string, href: string) {
    setAssistantStateText(`${actionLabel} opened for ${label} .`);
    router.push(href);
  }

  return (
    <div className="space-y-6">
      {/* Hero heading */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center py-12"
      >
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl" style={{ fontFamily: "var(--font-serif)" }}>
          The economy<br />
          <span className="italic" style={{ color: "#2dd4bf" }}>is alive.</span>
        </h1>
        <p className="mt-4 text-sm text-white/30">AI agents building. Humans earning. The garden grows.</p>
      </motion.section>

      {/* Orbital service browser */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex justify-center py-2 overflow-hidden"
      >
        <OrbitalDiagram
          size={420}
          interactive
          centerLabel="Eden"
          centerSublabel="Discover"
          innerNodes={visibleCategories.slice(0, 3).map((cat, i) => ({
            label: cat.label,
            angle: -90 + i * 120,
          }))}
          middleNodes={recommendedServices.slice(0, 2).map((svc, i) => ({
            label: svc.title.length > 14 ? svc.title.slice(0, 12) + "..." : svc.title,
            angle: 60 + i * 160,
          }))}
          onNodeClick={(label) => {
            const matchedCat = visibleCategories.find((c) => c.label === label);
            if (matchedCat) {
              setActiveCategory((prev) => prev === matchedCat.label ? null : matchedCat.label);
            } else {
              const matchedSvc = recommendedServices.find((s) => s.title.startsWith(label.replace("...", "")));
              if (matchedSvc) setModalService(matchedSvc);
            }
          }}
        />
      </motion.section>

      {/* Active category filter pills */}
      {activeCategory ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <span className="rounded-full border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-3 py-1 text-xs text-[#2dd4bf]">
            {activeCategory}
          </span>
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="text-xs text-white/40 hover:text-white/60"
          >
            Clear filter
          </button>
        </motion.div>
      ) : null}

      {/* TOP: Search bar */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.01 }}
      >
        <form
          onSubmit={(event) => {
            void handleAskEden(event);
          }}
        >
          <div className="relative">
            <input
              type="text"
              value={promptInput}
              onChange={(event) => setPromptInput(event.target.value)}
              placeholder="Search services, businesses, or ask Eden..."
              className="w-full rounded-2xl border border-white/8 px-5 py-4 pl-12 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#2dd4bf]/50"
              style={{ background: "rgba(13,30,46,0.8)", backdropFilter: "blur(12px)" }}
            />
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>
      </motion.section>

      {/* MAIN CONTENT: Grid with services + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* LEFT: Service grid */}
        <div className="space-y-6">
          {/* Service cards in 3 columns */}
          {recommendedServices.length > 0 ? (
            <motion.div
              variants={railVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-5 sm:grid-cols-2"
            >
              {(activeCategory ? recommendedServices.filter(s => s.category === activeCategory) : recommendedServices).map((service) => (
                <motion.div
                  key={service.id}
                  variants={railCardVariants}
                  className="group cursor-pointer rounded-2xl border border-white/8 bg-white/[0.035] p-4 transition-all hover:border-[#2dd4bf]/40 hover:shadow-[0_0_20px_-4px_rgba(45,212,191,0.15)]"
                  onClick={() => setModalService(service)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Generative gradient thumbnail with service monogram */}
                  <div
                    className="h-56 w-full rounded-xl mb-3 overflow-hidden relative group/thumb"
                    style={{
                      background: service.category === "Automotive"
                        ? "linear-gradient(135deg, rgba(245,158,11,0.35) 0%, rgba(180,100,5,0.2) 40%, rgba(11,22,34,0.95) 100%)"
                        : service.category === "Finance"
                          ? "linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,80,50,0.2) 40%, rgba(11,22,34,0.95) 100%)"
                          : service.category === "Music"
                            ? "linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(100,20,200,0.2) 40%, rgba(11,22,34,0.95) 100%)"
                            : `linear-gradient(${135 + (service.title.charCodeAt(0) % 6) * 30}deg, ${
                                ["rgba(45,212,191,0.2)", "rgba(168,85,247,0.2)", "rgba(245,158,11,0.2)", "rgba(59,130,246,0.2)", "rgba(236,72,153,0.2)", "rgba(34,197,94,0.2)"][service.title.charCodeAt(0) % 6]
                              }, rgba(13,30,46,0.85))`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {service.category === "Automotive" ? (
                        <svg viewBox="0 0 200 200" width="160" height="160">
                          <defs><radialGradient id={`ia-g-${service.id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8"/><stop offset="100%" stopColor="#92400e" stopOpacity="0"/></radialGradient></defs>
                          <circle cx="100" cy="100" r="60" fill={`url(#ia-g-${service.id})`}><animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="30" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="30;45;30" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="8" fill="#fbbf24"/>
                        </svg>
                      ) : service.category === "Finance" ? (
                        <svg viewBox="0 0 200 200" width="160" height="160">
                          <defs><radialGradient id={`ml-g-${service.id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.7"/><stop offset="100%" stopColor="#064e3b" stopOpacity="0"/></radialGradient></defs>
                          <circle cx="100" cy="100" r="55" fill={`url(#ml-g-${service.id})`}><animate attributeName="r" values="50;60;50" dur="4s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="35" fill="none" stroke="#2dd4bf" strokeWidth="0.8" opacity="0.3"><animate attributeName="r" values="35;48;35" dur="3s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="6" fill="#2dd4bf"/>
                          <circle cx="100" cy="40" r="3" fill="#2dd4bf" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite"/></circle>
                          <circle cx="60" cy="100" r="2.5" fill="#5eead4" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="120 100 100" to="480 100 100" dur="8s" repeatCount="indefinite"/></circle>
                          <circle cx="140" cy="100" r="2" fill="#99f6e4" opacity="0.4"><animateTransform attributeName="transform" type="rotate" from="240 100 100" to="600 100 100" dur="10s" repeatCount="indefinite"/></circle>
                        </svg>
                      ) : service.category === "Music" ? (
                        <svg viewBox="0 0 200 200" width="160" height="160">
                          <defs><radialGradient id={`ss-g-${service.id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.7"/><stop offset="100%" stopColor="#3b0764" stopOpacity="0"/></radialGradient></defs>
                          <circle cx="100" cy="100" r="50" fill={`url(#ss-g-${service.id})`}><animate attributeName="r" values="45;55;45" dur="2s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="28" fill="none" stroke="#ec4899" strokeWidth="0.8" opacity="0.4"><animate attributeName="r" values="28;38;28" dur="2.5s" repeatCount="indefinite"/></circle>
                          <circle cx="100" cy="100" r="5" fill="#a855f7"/>
                          {[0, 72, 144, 216, 288].map((angle) => (
                            <circle key={angle} cx="100" cy="45" r="2" fill="#c084fc" opacity="0.6">
                              <animateTransform attributeName="transform" type="rotate" from={`${angle} 100 100`} to={`${angle + 360} 100 100`} dur={`${4 + (angle % 3)}s`} repeatCount="indefinite"/>
                            </circle>
                          ))}
                        </svg>
                      ) : (
                        <span className="text-[40px] font-bold select-none" style={{ fontFamily: "var(--font-serif)", color: "rgba(45,212,191,0.3)" }}>
                          {service.title.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite" }} />
                  </div>
                  {/* Service name */}
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>{service.title}</h3>
                  {/* Business name + category */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm text-white/50">{service.provider}</span>
                    <span className="rounded-full border border-white/8 bg-eden-bg px-2 py-0.5 text-[10px] text-white/40">{service.category}</span>
                  </div>
                  {/* Price badge */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#2dd4bf]">{service.pricingLabel}</span>
                    <span className="text-xs text-white/0 transition-all group-hover:text-white/60">Use Service &rarr;</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <OrbitalDiagram size={160} showOuterRing={false} centerLabel="..." glowIntensity={0.3} innerNodes={[]} middleNodes={[]} />
              <p className="text-lg text-white/40 italic" style={{ fontFamily: "var(--font-serif)" }}>
                That service doesn&apos;t exist yet.
              </p>
              <p className="mt-1 text-sm text-white/30">This is your sign to build it.</p>
              <a href="/business" className="mt-3 text-xs font-medium text-[#2dd4bf] transition-colors hover:text-white">
                Start building &rarr;
              </a>
            </div>
          )}

          {/* Ask Eden response section */}
          <AnimatePresence initial={false}>
            {isThinking || latestTurn ? (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4 md:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-eden-accent">
                    Ask Eden Response
                  </p>
                  {latestTurn ? (
                    <p className="text-xs text-white/50">
                      Route confidence: {latestTurn.response.confidence}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {pendingPrompt || latestTurn ? (
                    <div className="ml-auto max-w-3xl rounded-xl border border-white/8 bg-[#2dd4bf]/15/55 p-3 text-left">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">You</p>
                      <p className="mt-1 text-sm text-white">{pendingPrompt || latestTurn?.prompt}</p>
                    </div>
                  ) : null}

                  <div className="mr-auto max-w-4xl rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                      Ask Eden
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {isThinking
                        ? "Routing your prompt across service search, business discovery, and idea generation..."
                        : latestTurn?.response.summary}
                    </p>
                  </div>
                </div>

                {!isThinking && latestTurn ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {latestTurn.response.lanes.map((route) => (
                        <span
                          key={route}
                          className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-xs text-white/50"
                        >
                          {route.replace("_", " ")}
                        </span>
                      ))}
                      <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-xs text-white/50">
                        Grounding: {latestTurn.response.groundingMode}
                      </span>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={assistantStateText}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="mt-4 rounded-lg border border-white/8 bg-[#2dd4bf]/10 px-3 py-2 text-sm text-white"
                      >
                        {assistantStateText}
                      </motion.p>
                    </AnimatePresence>

                    {latestTurn.response.nextActions.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {latestTurn.response.nextActions.map((action) => (
                          <button
                            key={`${latestTurn.id}-${action.type}-${action.label}`}
                            type="button"
                            disabled={!action.enabled || isThinking}
                            onClick={() => {
                              void handleAskEdenAction(action);
                            }}
                            className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#2dd4bf]/50 hover:bg-eden-bg disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {latestTurn.response.warnings.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10/70 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-amber-300">
                          Grounding notes
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
                          {latestTurn.response.warnings.map((warning) => (
                            <li key={`${latestTurn.id}-${warning}`}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 xl:grid-cols-3">
                      <section className="rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              Recommended services
                            </h3>
                            <p className="mt-1 text-xs text-white/50">
                              Open Service to inspect published state, visible pricing, and the Leafs-only run flow.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50">
                            {latestTurn.response.results.services.length} ready
                          </span>
                        </div>
                        <motion.div
                          key={`services-${latestTurn.id}`}
                          variants={responseLaneVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ staggerChildren: 0.08, delayChildren: 0.04 }}
                          className="mt-3 space-y-2"
                        >
                          {latestTurn.response.results.services.map((service) => {
                            const serviceDiscoveryState = getConsumerServiceDiscoveryState(
                              service,
                              discoverySnapshot,
                              currentBalanceCredits,
                            );

                            return (
                              <motion.div key={service.id} variants={responseCardVariants}>
                                <AskEdenServiceResultCard
                                  service={service}
                                  availabilityLabel={
                                    serviceDiscoveryState.launchDetails.availabilityLabel
                                  }
                                  pricingLabel={serviceDiscoveryState.launchDetails.pricingLabel}
                                  launchBadgeLabel={
                                    serviceDiscoveryState.launchDetails.launchBadgeLabel
                                  }
                                  trustLabel={serviceDiscoveryState.launchDetails.trustLabel}
                                  affordabilityLabel={serviceDiscoveryState.affordability.label}
                                  affordabilityHint={serviceDiscoveryState.affordability.hint}
                                  affordabilityTone={serviceDiscoveryState.affordability.tone}
                                  isSelected={
                                    selectedResult?.lane === "service" &&
                                    selectedResult.id === service.id
                                  }
                                  onSelect={() =>
                                    handleSelectResult("service", service.id, service.title)
                                  }
                                  onAction={() =>
                                    handleResultAction(
                                      "Open Service",
                                      service.title,
                                      serviceDiscoveryState.href,
                                    )
                                  }
                                />
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </section>

                      <section className="rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-white">Business matches</h3>
                            <p className="mt-1 text-xs text-white/50">
                              Open a business card to inspect the matched business surface and current publish state.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50">
                            {latestTurn.response.results.businesses.length} ready
                          </span>
                        </div>
                        <motion.div
                          key={`business-${latestTurn.id}`}
                          variants={responseLaneVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ staggerChildren: 0.08, delayChildren: 0.08 }}
                          className="mt-3 space-y-2"
                        >
                          {latestTurn.response.results.businesses.map((business) => (
                            <motion.div key={business.id} variants={responseCardVariants}>
                              <AskEdenBusinessResultCard
                                business={business}
                                isSelected={
                                  selectedResult?.lane === "business" &&
                                  selectedResult.id === business.id
                                }
                                onSelect={() => handleSelectResult("business", business.id, business.name)}
                                onAction={() =>
                                  handleResultAction(
                                    "Open Business",
                                    business.name,
                                    buildBusinessDetailHref(business, discoverySnapshot),
                                  )
                                }
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      </section>

                      <section className="rounded-xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              Ideas you could build
                            </h3>
                            <p className="mt-1 text-xs text-white/50">
                              Choose an idea card to stage or inspect the project-build path Eden mapped from your prompt.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50">
                            {latestTurn.response.results.ideas.length} ready
                          </span>
                        </div>
                        <motion.div
                          key={`ideas-${latestTurn.id}`}
                          variants={responseLaneVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ staggerChildren: 0.08, delayChildren: 0.12 }}
                          className="mt-3 space-y-2"
                        >
                          {latestTurn.response.results.ideas.map((idea) => (
                            <motion.div key={idea.id} variants={responseCardVariants}>
                              <AskEdenIdeaResultCard
                                idea={idea}
                                isSelected={selectedResult?.lane === "idea" && selectedResult.id === idea.id}
                                onSelect={() => handleSelectResult("idea", idea.id, idea.title)}
                                onAction={() =>
                                  handleResultAction(
                                    "Start Building",
                                    idea.title,
                                    buildBusinessCreationHref(idea),
                                  )
                                }
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      </section>

                      <section className="xl:col-span-3">
                        <div className="rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                Interactive selection
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-white">
                                Turn the response into a discovery flow
                              </h3>
                              <p className="mt-1 text-sm text-white/50">
                                Ask Eden now keeps service discovery, wallet context, and project
                                actions inside one grounded operator surface.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {latestTurn.response.lanes.map((route) => (
                                <span
                                  key={`preview-${route}`}
                                  className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/50"
                                >
                                  {route.replace("_", " ")}
                                </span>
                              ))}
                            </div>
                          </div>

                          <AnimatePresence mode="wait" initial={false}>
                            {selectedResultDetails ? (
                              <motion.div
                                key={`${selectedResultDetails.lane}-${selectedResultDetails.id}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.95fr)]"
                              >
                                <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                        {selectedResultDetails.eyebrow}
                                      </p>
                                      <h4 className="mt-1 text-lg font-semibold text-white">
                                        {selectedResultDetails.title}
                                      </h4>
                                    </div>
                                    <span className="rounded-full bg-eden-bg px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/50">
                                      {selectedResultDetails.laneLabel}
                                    </span>
                                  </div>
                                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                                    {selectedResultDetails.description}
                                  </p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedResultDetails.chips.map((chip) => (
                                      <span
                                        key={`${selectedResultDetails.id}-${chip}`}
                                        className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50"
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="mt-5 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleResultAction(
                                          selectedResultDetails.actionLabel,
                                          selectedResultDetails.title,
                                          selectedResultDetails.href,
                                        )
                                      }
                                      className="rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/20"
                                    >
                                      {selectedResultDetails.actionLabel}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedResult(null)}
                                      className="rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#2dd4bf]/50 hover:text-white"
                                    >
                                      Clear selection
                                    </button>
                                  </div>
                                </div>

                                <div className="grid gap-3">
                                  {selectedResultDetails.guidanceTitle ? (
                                    <div
                                      className={`rounded-2xl border p-4 ${
                                        selectedResultDetails.guidanceTone === "ready"
                                          ? "border-emerald-500/30 bg-emerald-500/10/70"
                                          : selectedResultDetails.guidanceTone === "warning"
                                            ? "border-amber-500/25 bg-amber-500/10/70"
                                            : "border-[rgba(45,212,191,0.09)] bg-white/[0.035]"
                                      }`}
                                    >
                                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                        Next step
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-white">
                                        {selectedResultDetails.guidanceTitle}
                                      </p>
                                      <p className="mt-2 text-sm leading-6 text-white/50">
                                        {selectedResultDetails.guidanceDetail}
                                      </p>
                                      {selectedResultDetails.guidanceCards?.length ? (
                                        <div className="mt-4 grid gap-3">
                                          {selectedResultDetails.guidanceCards.map((card) => (
                                            <div
                                              key={`${selectedResultDetails.id}-${card.label}`}
                                              className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-3"
                                            >
                                              <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                                                {card.label}
                                              </p>
                                              <p className="mt-2 text-sm font-semibold text-white">
                                                {card.value}
                                              </p>
                                              <p className="mt-2 text-sm leading-6 text-white/50">
                                                {card.detail}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                      What this unlocks
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-white/50">
                                      {selectedResultDetails.supportingText}
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                      Routing signals
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(
                                        latestTurn.response.trace?.signals?.length
                                          ? latestTurn.response.trace?.signals
                                          : ["No explicit signals captured"]
                                      )
                                        .slice(0, 4)
                                        .map((signal) => (
                                          <span
                                            key={`signal-${signal}`}
                                            className="rounded-full border border-white/8 bg-eden-bg px-2.5 py-1 text-[11px] text-white/50"
                                          >
                                            {signal}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                      Grounding mode
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-white/50">
                                      This response is currently marked as{" "}
                                      <span className="font-semibold text-white">
                                        {latestTurn.response.groundingMode}
                                      </span>
                                      , so Eden is distinguishing live platform state from proposed
                                      or simulated output instead of pretending everything is confirmed.
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="empty-selection"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="mt-4 rounded-2xl border border-dashed border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4 text-sm text-white/50"
                              >
                                Select a service, business, or idea card to inspect the grounded
                                details and next step here.
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </section>
                    </div>
                  </>
                ) : null}
              </motion.section>
            ) : null}
          </AnimatePresence>

          {/* Trending Businesses discovery rail */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          >
            <DiscoveryRail
              title="Trending Businesses"
              subtitle={
                savedOnly
                  ? "Favorites filter is active. Showing saved businesses only."
                  : "Popular innovator spaces in Eden right now. Open a business to inspect what they publish into the consumer marketplace."
              }
              hasItems={trendingBusinesses.length > 0}
              emptyMessage="No businesses match the current filters yet."
            >
              <motion.div
                variants={railVariants}
                initial="hidden"
                animate="visible"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              >
                {trendingBusinesses.map((business) => (
                  <motion.div key={business.id} variants={railCardVariants}>
                    <BusinessCard
                      name={business.name}
                      tagline={business.tagline}
                      category={business.category}
                      saved={business.saved}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </DiscoveryRail>
          </motion.section>

          {/* Categories discovery rail */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
          >
            <DiscoveryRail
              title="Categories"
              subtitle="Browse popular service verticals in Eden."
              hasItems={visibleCategories.length > 0}
              emptyMessage="No categories match the current filters yet."
            >
              <motion.div
                variants={railVariants}
                initial="hidden"
                animate="visible"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              >
                {visibleCategories.map((category) => (
                  <motion.div key={category.id} variants={railCardVariants}>
                    <CategoryCard label={category.label} description={category.description} />
                  </motion.div>
                ))}
              </motion.div>
            </DiscoveryRail>
          </motion.section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hidden w-[280px] shrink-0 space-y-4 lg:block">
          {/* Live stats */}
          {liveStats && (
            <div style={{ borderBottom: "1px solid rgba(45,212,191,0.1)", paddingBottom: "12px" }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "rgba(45,212,191,0.4)", textTransform: "uppercase" }}>Eden Live</p>
              <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: "bold", color: "white" }}>{liveStats.leafsToday.toLocaleString()}</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>Leafs today</p>
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: "bold", color: "white" }}>{liveStats.transactionsToday}</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>Transactions</p>
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: "bold", color: "white" }}>{liveStats.activeServices}</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>Services</p>
                </div>
              </div>
            </div>
          )}

          {/* Leaf balance card */}
          <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(45,212,191,0.12)", background: "rgba(13,30,46,0.82)", backdropFilter: "blur(12px)" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#2dd4bf]">Leaf Balance</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 44 44" className="h-14 w-14 -rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(45,212,191,0.1)" strokeWidth="3" />
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeDasharray={`${Math.min(113, (currentBalanceCredits / 500) * 113)} 113`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#2dd4bf]">&#x1F33F;</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white whitespace-nowrap">{formatCredits(currentBalanceCredits)}</p>
                <p className="text-[10px] text-white/30">Eden Leafs</p>
              </div>
            </div>
            <a href="/topup" className="mt-3 block w-full rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/25" style={{ boxShadow: "0 0 12px -4px rgba(45,212,191,0.2)" }}>
              Top Up
            </a>
          </div>

          {/* Eden Stake card */}
          <EdenStakeCard />

          {/* Recent activity */}
          <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(13,30,46,0.82)", backdropFilter: "blur(12px)" }}>
            <p className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>Recent Activity</p>
            <div className="mt-3 space-y-2">
              {recentWalletTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-white/60 truncate max-w-[180px]">{tx.title}</span>
                  <span className={tx.direction === "inflow" ? "text-emerald-400" : "text-white/40"}>
                    {tx.direction === "inflow" ? "+" : "-"}{tx.amountLabel}
                  </span>
                </div>
              ))}
              {recentWalletTransactions.length === 0 ? (
                <p className="text-xs text-white/30 italic">No recent activity</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Service detail modal with zoom transition */}
      <AnimatePresence>
        {modalService ? (
          <>
            {/* Dark overlay */}
            <motion.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setModalService(null)}
            />
            {/* Modal card */}
            <motion.div
              key="modal-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg overflow-hidden rounded-3xl"
              style={{
                border: "1px solid rgba(45,212,191,0.2)",
                background: "rgba(13,30,46,0.95)",
                boxShadow: "0 24px 80px -12px rgba(0,0,0,0.7), 0 0 40px -8px rgba(45,212,191,0.1)",
              }}
            >
              {/* Full-width thumbnail */}
              <div
                className="h-48 w-full"
                style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.2), rgba(13,30,46,0.9))" }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
                      {modalService.title}
                    </h2>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-sm text-white/50">{modalService.provider}</span>
                      <span className="rounded-full border border-white/8 bg-eden-bg px-2 py-0.5 text-[10px] text-white/40">
                        {modalService.category}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalService(null)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-colors hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-3 py-1 text-xs font-semibold text-[#2dd4bf]">
                    {modalService.pricingLabel}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
                    {modalService.availabilityLabel}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
                    {modalService.launchBadgeLabel}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/45">
                  {modalService.affordabilityHint}
                </p>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={modalService.href}
                    className="flex-1 rounded-xl border border-[#2dd4bf]/50 bg-[#2dd4bf]/15 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2dd4bf]/25"
                    style={{ boxShadow: "0 0 16px -4px rgba(45,212,191,0.25)" }}
                  >
                    Run Service
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalService(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-medium text-white/50 transition-colors hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}





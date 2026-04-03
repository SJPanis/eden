"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EdenStakeCard } from "@/components/eden-stake-card";
import { WelcomeScreen } from "@/ui/consumer/welcome-screen";
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
  const [dbServices, setDbServices] = useState<Array<{ id: string; slug: string; name: string; description: string; category: string; leafCost: number; thumbnailColor: string }>>([]);
  const searchParams2 = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [newServiceToast, setNewServiceToast] = useState(searchParams2?.get("new_service") === "true");

  useEffect(() => {
    fetch("/api/services/list").then((r) => r.json()).then((d) => { if (d.ok) setDbServices(d.services); }).catch(() => {});
    if (newServiceToast) {
      const t = setTimeout(() => setNewServiceToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [newServiceToast]);

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
      <WelcomeScreen />
      {/* Toast */}
      {newServiceToast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm text-center"
          style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", color: "#2dd4bf" }}>
          {"🌿"} Your service is live!
        </motion.div>
      )}

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center py-16"
      >
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
          The economy<br />
          <span className="italic" style={{ color: "#2dd4bf" }}>is alive.</span>
        </h1>
        <p className="mt-4 text-sm text-white/30">AI agents building. Humans earning. The garden grows.</p>
      </motion.section>

      {/* ORBIT — full width centered */}
      <div className="flex justify-center" style={{ padding: "60px 0" }}>
        <div style={{ width: 420, height: 420, overflow: "visible", position: "relative" }}>
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
              if (matchedCat) setActiveCategory((prev) => prev === matchedCat.label ? null : matchedCat.label);
            }}
          />
        </div>
      </div>

      {/* MAIN: Content + Sidebar */}
      <div className="flex gap-6 items-start">

        {/* LEFT: Search + Services */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Search */}
          <form onSubmit={(event) => { void handleAskEden(event); }}>
            <div className="relative">
              <input
                type="text"
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="Search services or ask Eden..."
                className="w-full rounded-2xl px-5 py-4 pl-12 text-base text-white outline-none transition placeholder:text-white/30 focus:ring-1 focus:ring-[#2dd4bf]/50"
                style={{ background: "rgba(13,30,46,0.8)", backdropFilter: "blur(12px)" }}
              />
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Services */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-white/20 mb-4">Services</p>

          {dbServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dbServices.map((svc) => (
                <a href={`/services/${svc.slug}`} key={svc.id}
                  className="group block rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_-8px_rgba(45,212,191,0.15)]"
                >
                  <div className="h-52 relative overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 50%, ${svc.thumbnailColor}18, transparent 70%), #060a10` }}>
                    <svg width="100%" height="100%" viewBox="0 0 400 210" className="absolute inset-0">
                      <defs>
                        <radialGradient id={`bg-${svc.id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={svc.thumbnailColor} stopOpacity="0.2"/><stop offset="100%" stopColor={svc.thumbnailColor} stopOpacity="0"/></radialGradient>
                      </defs>
                      <rect width="400" height="210" fill={`url(#bg-${svc.id})`}/>
                      {svc.category === "Finance" ? (<>
                        {/* Market Lens — geometric lens/eye */}
                        {[0,1,2,3,4,5].map(i => <line key={`g${i}`} x1="0" y1={35*i} x2="400" y2={35*i} stroke="rgba(45,212,191,0.06)" strokeWidth="0.5"/>)}
                        <ellipse cx="200" cy="105" rx="90" ry="55" fill="none" stroke="rgba(45,212,191,0.3)" strokeWidth="1"/>
                        <ellipse cx="200" cy="105" rx="65" ry="40" fill="none" stroke="rgba(45,212,191,0.5)" strokeWidth="0.8" transform="rotate(8 200 105)"/>
                        <circle cx="200" cy="105" r="18" fill="rgba(45,212,191,0.15)" stroke="rgba(45,212,191,0.6)" strokeWidth="1"><animate attributeName="r" values="16;19;16" dur="4s" repeatCount="indefinite"/></circle>
                        <circle cx="200" cy="105" r="5" fill="#2dd4bf"><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/></circle>
                        <line x1="130" y1="60" x2="270" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>
                        {[{x:140,y:70,d:"1.2s"},{x:260,y:80,d:"1.8s"},{x:170,y:140,d:"1.5s"},{x:250,y:130,d:"2.1s"},{x:155,y:95,d:"1.0s"},{x:240,y:110,d:"1.7s"}].map((p,i) =>
                          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#2dd4bf"><animate attributeName="opacity" values="0.2;0.8;0.2" dur={p.d} repeatCount="indefinite"/></circle>
                        )}
                      </>) : svc.category === "Automotive" ? (<>
                        {/* Imagine Auto — geometric engine */}
                        <polygon points="200,45 255,72 255,138 200,165 145,138 145,72" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="1"><animateTransform attributeName="transform" type="rotate" from="0 200 105" to="360 200 105" dur="20s" repeatCount="indefinite"/></polygon>
                        <circle cx="200" cy="105" r="45" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.8"/>
                        <circle cx="200" cy="105" r="30" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="0.8"/>
                        <circle cx="200" cy="105" r="15" fill="none" stroke="rgba(245,158,11,0.4)" strokeWidth="0.8"/>
                        {[0,60,120,180,240,300].map(a => <line key={a} x1="200" y1="105" x2={200+Math.cos(a*Math.PI/180)*50} y2={105+Math.sin(a*Math.PI/180)*50} stroke="rgba(245,158,11,0.2)" strokeWidth="0.5"/>)}
                        <circle cx="200" cy="105" r="6" fill="#f59e0b"><animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/></circle>
                        {[0,90,180,270].map(a => <rect key={a} x="197" y="58" width="6" height="6" fill="#fbbf24" opacity="0.5" transform={`rotate(45 200 61)`}><animateTransform attributeName="transform" type="rotate" from={`${a} 200 105`} to={`${a+360} 200 105`} dur="12s" repeatCount="indefinite"/></rect>)}
                      </>) : svc.category === "Music" ? (<>
                        {/* Spot Splore — audio waveform */}
                        {[0,1,2].map(i => <circle key={i} cx="200" cy="105" r={30+i*25} fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="0.5"><animate attributeName="r" values={`${30+i*25};${35+i*25};${30+i*25}`} dur={`${3+i}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.15;0.05;0.15" dur={`${3+i}s`} repeatCount="indefinite"/></circle>)}
                        {[135,155,175,190,205,220,235,250,260,170,215,245].map((x,i) => {
                          const h = 20 + (Math.sin(i*1.7)*15 + 15); const d = (0.8+i*0.07).toFixed(1);
                          return <rect key={i} x={x} y={105-h/2} width="4" height={h} rx="2" fill="rgba(168,85,247,0.6)"><animate attributeName="height" values={`${h};${h*1.6};${h*0.7};${h}`} dur={`${d}s`} repeatCount="indefinite"/><animate attributeName="y" values={`${105-h/2};${105-h*0.8};${105-h*0.35};${105-h/2}`} dur={`${d}s`} repeatCount="indefinite"/></rect>;
                        })}
                        <circle cx="200" cy="60" r="2" fill="#c084fc" opacity="0.6"><animateTransform attributeName="transform" type="rotate" from="0 200 105" to="360 200 105" dur="6s" repeatCount="indefinite"/></circle>
                        <circle cx="200" cy="150" r="1.5" fill="#e879f9" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="180 200 105" to="540 200 105" dur="8s" repeatCount="indefinite"/></circle>
                      </>) : (<>
                        {/* Default — organic growth */}
                        <circle cx="200" cy="105" r="8" fill="rgba(16,185,129,0.6)"><animate attributeName="r" values="7;10;7" dur="3s" repeatCount="indefinite"/></circle>
                        {[{x:140,y:70},{x:260,y:75},{x:150,y:145},{x:255,y:140},{x:200,y:50}].map((n,i) => (<g key={i}>
                          <line x1="200" y1="105" x2={n.x} y2={n.y} stroke="rgba(16,185,129,0.2)" strokeWidth="0.8"/>
                          <circle cx={n.x} cy={n.y} r="4" fill="rgba(16,185,129,0.4)"><animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2+i*0.5}s`} repeatCount="indefinite" begin={`${i*0.3}s`}/></circle>
                          {[{dx:-15,dy:-10},{dx:12,dy:8}].map((b,j) => <circle key={j} cx={n.x+b.dx} cy={n.y+b.dy} r="2" fill="rgba(16,185,129,0.3)"><animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2.5+j}s`} repeatCount="indefinite" begin={`${i*0.2+j*0.4}s`}/></circle>)}
                        </g>))}
                        {[...Array(8)].map((_,i) => <circle key={`p${i}`} cx={120+i*35} cy={40+Math.random()*130} r="1" fill="rgba(16,185,129,0.2)"><animate attributeName="cy" values={`${80+i*10};${70+i*10};${80+i*10}`} dur={`${4+i*0.5}s`} repeatCount="indefinite"/></circle>)}
                      </>)}
                    </svg>
                    <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: svc.thumbnailColor, color: "#000" }}>
                        Run — {svc.leafCost} {"🍃"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-base" style={{ fontFamily: "var(--font-serif)" }}>{svc.name}</h3>
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{svc.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-white/20">{svc.leafCost} Leafs per use</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/20 text-sm">Services loading...</div>
          )}
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="hidden lg:block w-52 shrink-0 sticky top-4 space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/20 mb-2">Your Balance</p>
            <p className="text-3xl font-bold text-white">{currentBalanceCredits.toLocaleString()}</p>
            <p className="text-xs text-white/30 mt-0.5">Leafs</p>
            <a href="/topup" className="inline-block mt-3 text-xs font-semibold px-4 py-2 rounded-full transition-colors" style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}>
              + Top Up
            </a>
          </div>

          {liveStats && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/20 mb-2">Eden Live</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-white/30">Leafs today</span><span className="text-white font-medium">{liveStats.leafsToday}</span></div>
                <div className="flex justify-between text-xs"><span className="text-white/30">Transactions</span><span className="text-white font-medium">{liveStats.transactionsToday}</span></div>
                <div className="flex justify-between text-xs"><span className="text-white/30">Services</span><span className="text-white font-medium">{liveStats.activeServices}</span></div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/20 mb-2">Your Stake</p>
            <EdenStakeCard />
          </div>
        </div>
      </div>
    </div>
  );
}





"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { DiscoveryRail } from "@/ui/consumer/components/discovery-rail";
import {
  edenLaunchLabels,
  getCreditsOnlyTrustLabel,
  getLaunchAvailabilityLabel,
  getLaunchBadgeLabel,
  getServiceAffordabilityDetails,
} from "@/ui/consumer/components/service-affordability-shared";
import { ServiceCard } from "@/ui/consumer/components/service-card";

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
            ? "border-[#14989a]/50 bg-[#14989a]/15 text-white"
            : "border-white/8 bg-white/[0.06] text-white/50 hover:border-[#14989a]/50 hover:text-white"
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
        detail: "The same Eden Leaf's price is shown before the service run begins.",
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
        ? "This project is already staged in the Business workspace, so the next step is to open the builder surface and continue operating it."
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
  const [activeQuery, setActiveQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [turns, setTurns] = useState<EdenTurn[]>([]);
  const [assistantStateText, setAssistantStateText] = useState(
    "Ask Eden is ready for discovery.",
  );
  const [selectedResult, setSelectedResult] = useState<SelectedResult | null>(null);
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
        detail: "Each service detail page shows the exact Eden Leaf's price before usage begins.",
      },
      {
        id: "consumer-launch-wallet",
        label: "Wallet balance",
        value: formatCredits(currentBalanceCredits),
        detail: "Top up once, then reuse Eden Leaf's across discovery and service runs.",
      },
      {
        id: "consumer-launch-payments",
        label: edenLaunchLabels.creditsOnlyBilling,
        value: "Top-up only",
        detail: "Checkout appears only when you explicitly Add Leaf's. Service runs deduct only the visible wallet price.",
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
          "Check the Eden Leaf's price against your current balance before you decide to run the service.",
      },
      {
        id: "consumer-step-topup",
        label: "3. Add Leaf's only if needed",
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
          "Published marketplace services still use fallback pricing in this environment, so the wallet and service detail screens explain the Leaf's flow step by step.",
        cue: edenLaunchLabels.openService,
      };
    }

    if (
      lowestPricedService.pricing.pricePerUseCredits !== null &&
      currentBalanceCredits >= lowestPricedService.pricing.pricePerUseCredits
    ) {
      return {
        title: "You can run a published service now",
        detail: `${lowestPricedService.service.title} is already within your wallet balance. Open the service, confirm the visible price, and run it through Eden Leaf's.`,
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
        id: "header-builders",
        label: "For builders",
        detail:
          "Builders publish services with visible pricing so they can appear as published and available in discovery.",
      },
      {
        id: "header-consumers",
        label: "For consumers",
        detail:
          "Consumers open published services, compare the visible price to their wallet, then Add Leaf's only if needed.",
      },
      {
        id: "header-billing",
        label: edenLaunchLabels.creditsOnlyBilling,
        detail:
          "Service runs use wallet Leaf's only, and no hidden checkout appears during service use.",
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
    <div className="space-y-7">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.01 }}
        className="rounded-[28px] border border-white/8 bg-white/[0.05] p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <EdenBrandLockup
              size="sm"
              label="Eden"
              subtitle="Consumer marketplace"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Public marketplace
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Explore published services with visible pricing.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
              Eden connects builders who publish services with consumers who explore them, top up
              Eden Leaf's only if needed, and run with no hidden charges during service use.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400">
                Published and priced
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                {edenLaunchLabels.visiblePricing}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
                {edenLaunchLabels.creditsOnlyBilling}
              </span>
            </div>
            <ConsumerTopBarActions
              savedOnly={savedOnly}
              savedBusinessCount={savedBusinessCount}
              onToggleSaved={() => setSavedOnly((value) => !value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {consumerHeaderSummaryCards.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.02 }}
      >
        <ConsumerWalletPanel
          currentBalanceCredits={currentBalanceCredits}
          recentTransactions={recentWalletTransactions}
        />
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.04 }}
        className="rounded-[28px] border border-white/8 bg-white/[0.05] p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              How Eden Works
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Discover, top up, and use services with visible credit pricing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Eden&apos;s consumer loop is simple: discover a published service, check the visible Eden Leaf's price, top up only if needed, and run the service through the wallet flow.
            </p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
            First-time clarity
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {consumerLaunchClarityCards.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  First-time sequence
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Follow the same loop everywhere in Eden: open a service, compare visible price to wallet balance, top up only if needed, then run.
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                Same flow in cards, detail, and wallet
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {consumerJourneySteps.map((step) => (
                <div key={step.id} className="rounded-2xl border border-white/8 bg-eden-bg/60 p-3">
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#14989a]/50 bg-white/[0.05] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Next step right now
            </p>
            <p className="mt-3 text-base font-semibold text-white">
              {consumerNextStepSummary.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              {consumerNextStepSummary.detail}
            </p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Recommended action</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {consumerNextStepSummary.cue}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">Ask Eden</p>
          <form
            onSubmit={(event) => {
              void handleAskEden(event);
            }}
            className="mt-5 rounded-2xl border border-white/8 bg-white/[0.06] p-3 md:p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="What's on your mind?"
                className="w-full rounded-xl border border-white/8 bg-eden-bg px-4 py-3 text-sm text-white outline-none transition focus:border-[#14989a]/50 focus:ring-2 focus:ring-eden-ring/40 md:text-base"
              />
              <button
                type="submit"
                disabled={isThinking}
                className="rounded-xl border border-[#14989a]/50 bg-[#14989a]/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isThinking ? "Routing..." : "Ask Eden"}
              </button>
            </div>
          </form>
          <p className="mt-3 text-sm text-white/50">
            Ask Eden helps you discover published services, visible pricing, and the same Leaf's-only run flow shown across the marketplace.
          </p>
        </motion.section>

        <AnimatePresence initial={false}>
          {isThinking || latestTurn ? (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.06] p-4 md:p-5"
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
                  <div className="ml-auto max-w-3xl rounded-xl border border-white/8 bg-[#14989a]/15/55 p-3 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">You</p>
                    <p className="mt-1 text-sm text-white">{pendingPrompt || latestTurn?.prompt}</p>
                  </div>
                ) : null}

                <div className="mr-auto max-w-4xl rounded-xl border border-white/8 bg-white/[0.06] p-3 text-left">
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
                    <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-xs text-white/50">
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
                      className="mt-4 rounded-lg border border-white/8 bg-[#14989a]/10 px-3 py-2 text-sm text-white"
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
                          className="rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-eden-bg disabled:cursor-not-allowed disabled:opacity-60"
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
                    <section className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            Recommended services
                          </h3>
                          <p className="mt-1 text-xs text-white/50">
                            Open Service to inspect published state, visible pricing, and the Leaf's-only run flow.
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

                    <section className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
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

                    <section className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
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
                      <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
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
                                className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/50"
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
                              <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
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
                                    className="rounded-xl border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20"
                                  >
                                    {selectedResultDetails.actionLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedResult(null)}
                                    className="rounded-xl border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-[#14989a]/50 hover:text-white"
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
                                          : "border-white/8 bg-white/[0.06]"
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
                                            className="rounded-2xl border border-white/8 bg-white/[0.06] p-3"
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
                                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
                                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                    What this unlocks
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-white/50">
                                    {selectedResultDetails.supportingText}
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
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
                                <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
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
                              className="mt-4 rounded-2xl border border-dashed border-white/8 bg-white/[0.06] p-4 text-sm text-white/50"
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

      <div className="space-y-6">
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.045 }}
            className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Marketplace clarity
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  These rails show the public Eden loop in one place: published services,{" "}
                  {edenLaunchLabels.visiblePricing.toLowerCase()}, {edenLaunchLabels.creditsOnlyBilling.toLowerCase()},
                  {" "}and wallet-aware next steps before any run begins.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400">
                  Published and priced
                </span>
                <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                  {edenLaunchLabels.visiblePricing}
                </span>
                <span className="rounded-full border border-white/8 bg-eden-bg px-3 py-1 text-xs text-white/50">
                  {edenLaunchLabels.creditsOnlyBilling}
                </span>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          >
            <DiscoveryRail
              title="Recommended Services"
              subtitle="Published services with visible Eden Leaf's pricing and no hidden checkout during runs. Services your wallet likely covers appear first."
              badgeLabel={
                recommendedServicesReadyCount
                  ? `${recommendedServicesReadyCount} ready now`
                  : "Top-up likely first"
              }
              hasItems={recommendedServices.length > 0}
              emptyMessage="No services match the current filters yet."
            >
              <motion.div
                variants={railVariants}
                initial="hidden"
                animate="visible"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              >
                {recommendedServices.map((service) => (
                  <motion.div key={service.id} variants={railCardVariants}>
                    <ServiceCard
                      title={service.title}
                      provider={service.provider}
                      category={service.category}
                      saved={service.saved}
                      availabilityLabel={service.availabilityLabel}
                      pricingLabel={service.pricingLabel}
                      trustLabel={service.trustLabel}
                      launchBadgeLabel={service.launchBadgeLabel}
                      affordabilityLabel={service.affordabilityLabel}
                      affordabilityHint={service.affordabilityHint}
                      affordabilityTone={service.affordabilityTone}
                      href={service.href}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </DiscoveryRail>
          </motion.section>

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
                  : "Popular builder spaces in Eden right now. Open a business to inspect what they publish into the consumer marketplace."
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
    </div>
  );
}







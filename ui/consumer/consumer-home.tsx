"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createEdenAgent } from "@/modules/eden-ai/eden-agent";
import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";
import type {
  EdenAgentResponse,
  EdenBusinessResult,
  EdenIdeaResult,
  EdenServiceResult,
} from "@/modules/eden-ai/eden-types";
import {
  type EdenDiscoverySnapshot,
  categories,
  formatCredits,
  getUserById,
} from "@/modules/core/mock-data";
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
  response: EdenAgentResponse;
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

const edenAgent = createEdenAgent();

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
            ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
            : "border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
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
        ? `${input.pricingModel} pricing placeholder`
        : "Pricing placeholder pending",
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
  service: Pick<EdenServiceResult, "id" | "title" | "category" | "description">,
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
  service: Pick<EdenServiceResult, "id" | "title" | "category" | "description">,
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
  business: EdenBusinessResult,
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

function getDefaultSelectedResult(response: EdenAgentResponse): SelectedResult | null {
  const prioritizedLanes = new Set<EdenResultLane>();

  for (const route of response.routeDecision.routes) {
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
    if (lane === "service" && response.outputs.recommendedServices[0]) {
      return { lane, id: response.outputs.recommendedServices[0].id };
    }

    if (lane === "business" && response.outputs.businessMatches[0]) {
      return { lane, id: response.outputs.businessMatches[0].id };
    }

    if (lane === "idea" && response.outputs.ideasToBuild[0]) {
      return { lane, id: response.outputs.ideasToBuild[0].id };
    }
  }

  return null;
}

function getSelectedServiceDetails(
  service: EdenServiceResult,
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
        detail: "The same Eden Credits price is shown before the service run begins.",
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
  business: EdenBusinessResult,
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
      "Use this mocked business surface to preview how Ask Eden can move from routing to business exploration.",
  };
}

function buildBusinessCreationHref(idea: EdenIdeaResult) {
  const searchParams = new URLSearchParams({
    source: "ask_eden",
    ideaTitle: idea.title,
    ideaDescription: idea.description,
  });

  return `/business/create?${searchParams.toString()}`;
}

function getSelectedIdeaDetails(idea: EdenIdeaResult): SelectedResultDetails {
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
      "This keeps the build lane interactive while the underlying AI adapter remains a mocked placeholder.",
  };
}

function getSelectedResultDetails(
  response: EdenAgentResponse,
  selection: SelectedResult | null,
  discoverySnapshot: EdenDiscoverySnapshot,
  currentBalanceCredits: number,
): SelectedResultDetails | null {
  if (!selection) {
    return null;
  }

  if (selection.lane === "service") {
    const service = response.outputs.recommendedServices.find((item) => item.id === selection.id);
    return service ? getSelectedServiceDetails(service, discoverySnapshot, currentBalanceCredits) : null;
  }

  if (selection.lane === "business") {
    const business = response.outputs.businessMatches.find((item) => item.id === selection.id);
    return business ? getSelectedBusinessDetails(business, discoverySnapshot) : null;
  }

  const idea = response.outputs.ideasToBuild.find((item) => item.id === selection.id);
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
        detail: "Each service detail page shows the exact Eden Credits price before usage begins.",
      },
      {
        id: "consumer-launch-wallet",
        label: "Wallet balance",
        value: formatCredits(currentBalanceCredits),
        detail: "Top up once, then reuse Eden Credits across discovery and service runs.",
      },
      {
        id: "consumer-launch-payments",
        label: edenLaunchLabels.creditsOnlyBilling,
        value: "Top-up only",
        detail: "Checkout appears only when you explicitly add credits. Service runs deduct only the visible wallet price.",
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
          "Check the Eden Credits price against your current balance before you decide to run the service.",
      },
      {
        id: "consumer-step-topup",
        label: "3. Add Credits only if needed",
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
          "Published marketplace services still use fallback pricing in this environment, so the wallet and service detail screens explain the credits flow step by step.",
        cue: edenLaunchLabels.openService,
      };
    }

    if (
      lowestPricedService.pricing.pricePerUseCredits !== null &&
      currentBalanceCredits >= lowestPricedService.pricing.pricePerUseCredits
    ) {
      return {
        title: "You can run a published service now",
        detail: `${lowestPricedService.service.title} is already within your wallet balance. Open the service, confirm the visible price, and run it through Eden Credits.`,
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
      const response = await edenAgent.ask({
        prompt: submittedPrompt,
        timestamp: new Date().toISOString(),
        discoverySnapshot,
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
      setAssistantStateText("Results are ready. Explore the cards and open a mock direction.");
    } catch {
      setAssistantStateText("Ask Eden could not complete this request. Please try again.");
    } finally {
      setIsThinking(false);
      setPendingPrompt("");
    }
  }

  function handleSelectResult(lane: EdenResultLane, id: string, label: string) {
    setSelectedResult({ lane, id });
    setAssistantStateText(`Selected: ${label}`);
  }

  function handleResultAction(actionLabel: string, label: string, href: string) {
    setAssistantStateText(`${actionLabel} opened for ${label} (placeholder route).`);
    router.push(href);
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <ConsumerTopBarActions
          savedOnly={savedOnly}
          savedBusinessCount={savedBusinessCount}
          onToggleSaved={() => setSavedOnly((value) => !value)}
        />
      </div>

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
        className="rounded-[28px] border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.35),rgba(255,255,255,0.98),rgba(255,247,237,0.9))] p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              How Eden Works
            </p>
            <h2 className="mt-2 text-lg font-semibold text-eden-ink">
              Discover, top up, and use services with visible credit pricing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-eden-muted">
              Eden&apos;s consumer loop is simple: discover a published service, check the visible Eden Credits price, top up only if needed, and run the service through the wallet flow.
            </p>
          </div>
          <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-xs text-eden-muted">
            First-time clarity
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {consumerLaunchClarityCards.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-eden-edge bg-white/90 p-4"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-eden-edge bg-white/92 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  First-time sequence
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Follow the same loop everywhere in Eden: open a service, compare visible price to wallet balance, top up only if needed, then run.
                </p>
              </div>
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                Same flow in cards, detail, and wallet
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {consumerJourneySteps.map((step) => (
                <div key={step.id} className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                  <p className="text-sm font-semibold text-eden-ink">{step.label}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-eden-ring bg-[linear-gradient(135deg,rgba(219,234,254,0.52),rgba(255,255,255,0.98))] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Next step right now
            </p>
            <p className="mt-3 text-base font-semibold text-eden-ink">
              {consumerNextStepSummary.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              {consumerNextStepSummary.detail}
            </p>
            <div className="mt-4 rounded-2xl border border-eden-edge bg-white/92 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Recommended action</p>
              <p className="mt-2 text-sm font-semibold text-eden-ink">
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
            className="mt-5 rounded-2xl border border-eden-edge bg-white/85 p-3 md:p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={promptInput}
                onChange={(event) => setPromptInput(event.target.value)}
                placeholder="What's on your mind?"
                className="w-full rounded-xl border border-eden-edge bg-eden-bg px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40 md:text-base"
              />
              <button
                type="submit"
                disabled={isThinking}
                className="rounded-xl border border-eden-ring bg-eden-accent-soft px-5 py-3 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isThinking ? "Routing..." : "Ask Eden"}
              </button>
            </div>
          </form>
          <p className="mt-3 text-sm text-eden-muted">
            Conversational discovery entry point powered by Eden AI routing placeholders.
          </p>
        </motion.section>

        <AnimatePresence initial={false}>
          {isThinking || latestTurn ? (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="overflow-hidden rounded-2xl border border-eden-edge bg-white/75 p-4 md:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-eden-accent">
                  Ask Eden Response
                </p>
                {latestTurn ? (
                  <p className="text-xs text-eden-muted">
                    Route confidence: {latestTurn.response.routeDecision.confidence}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {pendingPrompt || latestTurn ? (
                  <div className="ml-auto max-w-3xl rounded-xl border border-eden-edge bg-eden-accent-soft/55 p-3 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-muted">You</p>
                    <p className="mt-1 text-sm text-eden-ink">{pendingPrompt || latestTurn?.prompt}</p>
                  </div>
                ) : null}

                <div className="mr-auto max-w-4xl rounded-xl border border-eden-edge bg-white p-3 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-muted">
                    Ask Eden
                  </p>
                  <p className="mt-1 text-sm text-eden-ink">
                    {isThinking
                      ? "Routing your prompt across service search, business discovery, and idea generation..."
                      : latestTurn?.response.summary}
                  </p>
                </div>
              </div>

              {!isThinking && latestTurn ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {latestTurn.response.routeDecision.routes.map((route) => (
                      <span
                        key={route}
                        className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-xs text-eden-muted"
                      >
                        {route.replace("_", " ")}
                      </span>
                    ))}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={assistantStateText}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="mt-4 rounded-lg border border-eden-edge bg-eden-accent-soft/35 px-3 py-2 text-sm text-eden-ink"
                    >
                      {assistantStateText}
                    </motion.p>
                  </AnimatePresence>

                  <div className="mt-5 grid gap-3 xl:grid-cols-3">
                    <section className="rounded-xl border border-eden-edge bg-white/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-eden-ink">
                            Recommended services
                          </h3>
                          <p className="mt-1 text-xs text-eden-muted">
                            Open Service to inspect published state, visible pricing, and the credits-only run flow.
                          </p>
                        </div>
                        <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted">
                          {latestTurn.response.outputs.recommendedServices.length} ready
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
                        {latestTurn.response.outputs.recommendedServices.map((service) => {
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

                    <section className="rounded-xl border border-eden-edge bg-white/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-eden-ink">Business matches</h3>
                          <p className="mt-1 text-xs text-eden-muted">
                            Open a business card to preview the mocked match surface.
                          </p>
                        </div>
                        <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted">
                          {latestTurn.response.outputs.businessMatches.length} ready
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
                        {latestTurn.response.outputs.businessMatches.map((business) => (
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

                    <section className="rounded-xl border border-eden-edge bg-white/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-eden-ink">
                            Ideas you could build
                          </h3>
                          <p className="mt-1 text-xs text-eden-muted">
                            Choose an idea card to stage a mocked build direction.
                          </p>
                        </div>
                        <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted">
                          {latestTurn.response.outputs.ideasToBuild.length} ready
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
                        {latestTurn.response.outputs.ideasToBuild.map((idea) => (
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
                      <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(239,246,255,0.78),rgba(255,255,255,0.96))] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                              Interactive selection
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-eden-ink">
                              Turn the response into a discovery flow
                            </h3>
                            <p className="mt-1 text-sm text-eden-muted">
                              Every card remains mocked, but the panel now behaves like an
                              interactive system with selection, preview, and placeholder actions.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {latestTurn.response.routeDecision.routes.map((route) => (
                              <span
                                key={`preview-${route}`}
                                className="rounded-full border border-eden-edge bg-white/85 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-eden-muted"
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
                              <div className="rounded-2xl border border-eden-edge bg-white/92 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                      {selectedResultDetails.eyebrow}
                                    </p>
                                    <h4 className="mt-1 text-lg font-semibold text-eden-ink">
                                      {selectedResultDetails.title}
                                    </h4>
                                  </div>
                                  <span className="rounded-full bg-eden-bg px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-eden-muted">
                                    {selectedResultDetails.laneLabel}
                                  </span>
                                </div>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-eden-muted">
                                  {selectedResultDetails.description}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {selectedResultDetails.chips.map((chip) => (
                                    <span
                                      key={`${selectedResultDetails.id}-${chip}`}
                                      className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted"
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
                                    className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
                                  >
                                    {selectedResultDetails.actionLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedResult(null)}
                                    className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
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
                                        ? "border-emerald-200 bg-emerald-50/70"
                                        : selectedResultDetails.guidanceTone === "warning"
                                          ? "border-amber-200 bg-amber-50/70"
                                          : "border-eden-edge bg-white/88"
                                    }`}
                                  >
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                      Next step
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-eden-ink">
                                      {selectedResultDetails.guidanceTitle}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                                      {selectedResultDetails.guidanceDetail}
                                    </p>
                                    {selectedResultDetails.guidanceCards?.length ? (
                                      <div className="mt-4 grid gap-3">
                                        {selectedResultDetails.guidanceCards.map((card) => (
                                          <div
                                            key={`${selectedResultDetails.id}-${card.label}`}
                                            className="rounded-2xl border border-eden-edge bg-white/90 p-3"
                                          >
                                            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                                              {card.label}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-eden-ink">
                                              {card.value}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-eden-muted">
                                              {card.detail}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
                                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                    What this unlocks
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                                    {selectedResultDetails.supportingText}
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
                                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                    Routing signals
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(
                                      latestTurn.response.routeDecision.signals.length
                                        ? latestTurn.response.routeDecision.signals
                                        : ["No explicit signals captured"]
                                    )
                                      .slice(0, 4)
                                      .map((signal) => (
                                        <span
                                          key={`signal-${signal}`}
                                          className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[11px] text-eden-muted"
                                        >
                                          {signal}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-eden-edge bg-white/88 p-4">
                                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                                    Mock mode
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                                    All cards, previews, and actions stay placeholder-driven so
                                    real models can plug into the existing `modules/eden-ai/`
                                    routing layer later.
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
                              className="mt-4 rounded-2xl border border-dashed border-eden-edge bg-white/82 p-4 text-sm text-eden-muted"
                            >
                              Select a service, business, or idea card to inspect the mock
                              details here.
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
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          >
            <DiscoveryRail
              title="Recommended Services"
              subtitle="Published services with visible Eden Credits pricing and no hidden checkout during runs. Services your wallet likely covers appear first."
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
                  : "Popular business spaces in the consumer layer right now."
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

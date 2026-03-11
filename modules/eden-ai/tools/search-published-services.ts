import "server-only";

import { formatLeaves } from "@/modules/core/credits/eden-currency";
import { getAskEdenRecommendedServices } from "@/modules/core/mock-data/discovery-selectors";
import { formatServicePricingLabel, resolveServicePricing } from "@/modules/core/services/service-pricing";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import type { EdenAiGroundingMode, EdenAiServiceResult } from "@/modules/eden-ai/types";

export async function searchPublishedServices(
  context: EdenAiToolContext,
  input: { prompt: string; limit?: number },
) {
  const groundingMode = resolveServiceGroundingMode();
  const results = getAskEdenRecommendedServices(
    input.prompt,
    input.limit ?? 3,
    context.discoverySnapshot,
  ).map((service) => {
    const pricing = resolveServicePricing({
      pricePerUse: service.pricePerUse,
      pricingType: service.pricingType,
      pricingUnit: service.pricingUnit,
      pricingModel: service.pricingModel,
    });

    return {
      kind: "service",
      id: service.id,
      title: service.title,
      category: service.category,
      description: service.summary ?? service.description,
      groundingMode,
      pricingLabel: formatServicePricingLabel(
        {
          pricePerUse: service.pricePerUse,
          pricingType: service.pricingType,
          pricingUnit: service.pricingUnit,
          pricingModel: service.pricingModel,
        },
        {
          fallbackLabel: service.pricingModel
            ? `${service.pricingModel} pricing placeholder`
            : "Pricing placeholder pending",
          includePricingModel: true,
        },
      ),
      pricePerUseCredits: pricing.pricePerUseCredits,
      availabilityLabel:
        service.status.toLowerCase() === "published"
          ? "Published and available"
          : service.status,
      trustLabel:
        pricing.pricePerUseCredits === null
          ? "Eden Leaf’s only | visible price still pending"
          : `Eden Leaf’s only | ${formatLeaves(pricing.pricePerUseCredits)} shown before each run`,
      businessId: service.businessId,
      actionLabel: "Open Service",
    } satisfies EdenAiServiceResult;
  });

  return {
    groundingMode,
    warnings:
      groundingMode === "live"
        ? []
        : [
            "Published service matches are currently grounded in Eden's shared discovery snapshot while persistent reads continue to expand.",
          ],
    results,
  };
}

function resolveServiceGroundingMode(): EdenAiGroundingMode {
  if (process.env.EDEN_BUILDER_LOOP_READ_MODE === "mock_only") {
    return "simulated";
  }

  return "live";
}

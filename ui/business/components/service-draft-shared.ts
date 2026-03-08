export type ServiceDraftFormValues = {
  name: string;
  description: string;
  category: string;
  tagsInput: string;
  pricingModel: string;
  pricePerUse: string;
  automationDescription: string;
};

export function createEmptyServiceDraftFormValues(
  defaultCategory: string,
  defaultTags: string[],
  seed: Partial<ServiceDraftFormValues> = {},
): ServiceDraftFormValues {
  return {
    name: seed.name ?? "",
    description: seed.description ?? "",
    category: seed.category ?? defaultCategory,
    tagsInput: seed.tagsInput ?? defaultTags.join(", "),
    pricingModel: seed.pricingModel ?? "",
    pricePerUse: seed.pricePerUse ?? "",
    automationDescription: seed.automationDescription ?? "",
  };
}

export function parseServiceDraftTags(tagsInput: string) {
  return Array.from(
    new Set(
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

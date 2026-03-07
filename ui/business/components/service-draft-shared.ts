export type ServiceDraftFormValues = {
  name: string;
  description: string;
  category: string;
  tagsInput: string;
  pricingModel: string;
  automationDescription: string;
};

export function createEmptyServiceDraftFormValues(
  defaultCategory: string,
  defaultTags: string[],
): ServiceDraftFormValues {
  return {
    name: "",
    description: "",
    category: defaultCategory,
    tagsInput: defaultTags.join(", "),
    pricingModel: "",
    automationDescription: "",
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

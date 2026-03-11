import type {
  EdenMockLog,
  EdenMockProject,
  EdenMockService,
} from "../mock-data/platform-types";
import {
  defaultServicePricingType,
  defaultServicePricingUnit,
  formatServicePricingLabel,
  normalizePricePerUse,
} from "../services/service-pricing";

export type EdenMockWorkspaceServiceInput = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel?: string;
  pricePerUse?: number;
  pricingType?: string;
  pricingUnit?: string;
  automationDescription?: string;
};

export type EdenMockWorkspaceServiceRecord = {
  businessId: string;
  ownerUserId: string;
  serviceId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel?: string;
  pricePerUse?: number;
  pricingType?: string;
  pricingUnit?: string;
  automationDescription?: string;
};

export type EdenMockWorkspaceServiceState = {
  record: EdenMockWorkspaceServiceRecord;
  service: EdenMockService;
  project: EdenMockProject;
  logs: EdenMockLog[];
};

export const mockWorkspaceServicesCookieName = "eden_v1_mock_workspace_services";

export function parseMockWorkspaceServicesCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isMockWorkspaceServiceRecord);
  } catch {
    return [];
  }
}

export function serializeMockWorkspaceServicesCookie(
  records: EdenMockWorkspaceServiceRecord[],
) {
  return JSON.stringify(records);
}

export function getSanitizedMockWorkspaceServiceInput(
  input: Partial<EdenMockWorkspaceServiceInput>,
) {
  const name = input.name?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const pricingModel = input.pricingModel?.trim() ?? "";
  const pricingType = input.pricingType?.trim() ?? "";
  const pricingUnit = input.pricingUnit?.trim() ?? "";
  const automationDescription = input.automationDescription?.trim() ?? "";
  const pricePerUse = normalizePricePerUse(input.pricePerUse);
  const tags = Array.from(
    new Set(
      (input.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);

  if (!name || !description || !category || tags.length < 2) {
    return null;
  }

  return {
    name,
    description,
    category,
    tags,
    pricingModel: pricingModel || undefined,
    pricePerUse: pricePerUse ?? undefined,
    pricingType: pricePerUse ? pricingType || defaultServicePricingType : undefined,
    pricingUnit: pricePerUse ? pricingUnit || defaultServicePricingUnit : undefined,
    automationDescription: automationDescription || undefined,
  } satisfies EdenMockWorkspaceServiceInput;
}

export function buildMockWorkspaceServiceRecord(
  input: EdenMockWorkspaceServiceInput,
  options: {
    businessId: string;
    ownerUserId: string;
  },
) {
  const { businessId, ownerUserId } = options;
  const slug = slugify(input.name) || "service-builder";
  const suffix = Date.now().toString(36);
  const timestamp = new Date().toISOString();

  return {
    businessId,
    ownerUserId,
    serviceId: `service-local-${slug}-${suffix}`,
    projectId: `project-local-${slug}-${suffix}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
    pricingModel: input.pricingModel,
    pricePerUse: input.pricePerUse,
    pricingType: input.pricingType,
    pricingUnit: input.pricingUnit,
    automationDescription: input.automationDescription,
  } satisfies EdenMockWorkspaceServiceRecord;
}

export function upsertMockWorkspaceServiceRecord(
  record: EdenMockWorkspaceServiceRecord,
  records: EdenMockWorkspaceServiceRecord[] = [],
) {
  return [record, ...records.filter((entry) => entry.businessId !== record.businessId)];
}

export function getMockWorkspaceServiceStateForBusiness(
  businessId: string,
  records: EdenMockWorkspaceServiceRecord[] = [],
) {
  const record = records.find((entry) => entry.businessId === businessId);
  return record ? getMockWorkspaceServiceState(record) : null;
}

export function getMockWorkspaceServiceStates(
  records: EdenMockWorkspaceServiceRecord[] = [],
) {
  return records.map((record) => getMockWorkspaceServiceState(record));
}

export function getMockWorkspaceServiceState(
  record: EdenMockWorkspaceServiceRecord,
) {
  const pricingSummary = formatServicePricingLabel(
    {
      pricePerUse: record.pricePerUse,
      pricingType: record.pricingType,
      pricingUnit: record.pricingUnit,
      pricingModel: record.pricingModel,
    },
    {
      fallbackLabel: record.pricingModel
        ? `${record.pricingModel.toLowerCase()} pricing placeholders`
        : "placeholder pricing options",
      includePricingModel: true,
    },
  );
  const automationSummary = record.automationDescription
    ? ` AI layer: ${record.automationDescription}`
    : "";
  const service: EdenMockService = {
    id: record.serviceId,
    title: record.name,
    businessId: record.businessId,
    category: record.category,
    description: `${record.description} This service was staged locally inside Eden's Service Builder.${automationSummary}`,
    summary: `A local service-builder draft with ${pricingSummary} for ${record.category.toLowerCase()} discovery.`,
    status: "Draft",
    tags: record.tags,
    pricingModel: record.pricingModel,
    pricePerUse: record.pricePerUse ?? null,
    pricingType: record.pricingType,
    pricingUnit: record.pricingUnit,
    automationSummary: record.automationDescription,
  };
  const project: EdenMockProject = {
    id: record.projectId,
    businessId: record.businessId,
    title: `${record.name} Launch Build`,
    type: "Service Builder",
    status: "Idea",
    summary: `Prepare ${record.name} for testing, readiness review, and mocked publish inside the business workspace.`,
    milestone: record.pricingModel
      ? `Validate ${record.pricingModel.toLowerCase()} packaging and service positioning`
      : "Validate packaging, positioning, and launch messaging",
    updatedAt: "Created just now",
    progress: 16,
  };
  const logs: EdenMockLog[] = [
    {
      id: `log-local-service-${record.serviceId}-01`,
      level: "info",
      source: "builder",
      title: `${record.name} was staged in the Service Builder`,
      message: `The active workspace service was replaced with a local draft for ${record.category.toLowerCase()} discovery and publish testing.`,
      timestamp: "Just now",
      businessId: record.businessId,
      serviceId: record.serviceId,
      userId: record.ownerUserId,
    },
  ];

  return {
    record,
    service,
    project,
    logs,
  } satisfies EdenMockWorkspaceServiceState;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 24);
}

function isMockWorkspaceServiceRecord(
  value: unknown,
): value is EdenMockWorkspaceServiceRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockWorkspaceServiceRecord>;

  return (
    typeof candidate.businessId === "string" &&
    typeof candidate.ownerUserId === "string" &&
    typeof candidate.serviceId === "string" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.category === "string" &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === "string") &&
    (typeof candidate.pricingModel === "string" ||
      typeof candidate.pricingModel === "undefined") &&
    (typeof candidate.pricePerUse === "number" ||
      typeof candidate.pricePerUse === "undefined") &&
    (typeof candidate.pricingType === "string" ||
      typeof candidate.pricingType === "undefined") &&
    (typeof candidate.pricingUnit === "string" ||
      typeof candidate.pricingUnit === "undefined") &&
    (typeof candidate.automationDescription === "string" ||
      typeof candidate.automationDescription === "undefined")
  );
}

import type {
  EdenMockBusiness,
  EdenMockLog,
  EdenMockProject,
  EdenMockService,
} from "@/modules/core/mock-data/platform-types";

export type EdenMockBusinessCreationSource = "ask_eden" | "business_dashboard";

export type EdenMockCreatedBusinessInput = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  targetAudience: string;
  monetizationModel?: string;
  source: EdenMockBusinessCreationSource;
  sourceIdeaTitle?: string;
  sourceIdeaDescription?: string;
};

export type EdenMockCreatedBusinessRecord = {
  businessId: string;
  serviceId: string;
  projectId: string;
  ownerUserId: string;
  createdAt: string;
  source: EdenMockBusinessCreationSource;
  sourceIdeaTitle?: string;
  sourceIdeaDescription?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  targetAudience: string;
  monetizationModel?: string;
};

export type EdenMockCreatedBusinessState = {
  record: EdenMockCreatedBusinessRecord;
  business: EdenMockBusiness;
  service: EdenMockService;
  project: EdenMockProject;
  logs: EdenMockLog[];
};

export const mockCreatedBusinessCookieName = "eden_v1_mock_created_business";
export const defaultBusinessCreationUserId = "user-07";

export function parseMockCreatedBusinessCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;
    return isMockCreatedBusinessRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function serializeMockCreatedBusinessCookie(
  record: EdenMockCreatedBusinessRecord | null,
) {
  return record ? JSON.stringify(record) : "";
}

export function getSanitizedMockCreatedBusinessInput(
  input: Partial<EdenMockCreatedBusinessInput>,
) {
  const name = input.name?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const targetAudience = input.targetAudience?.trim() ?? "";
  const monetizationModel = input.monetizationModel?.trim() ?? "";
  const source = input.source === "business_dashboard" ? "business_dashboard" : "ask_eden";
  const sourceIdeaTitle = input.sourceIdeaTitle?.trim() ?? "";
  const sourceIdeaDescription = input.sourceIdeaDescription?.trim() ?? "";
  const tags = Array.from(
    new Set(
      (input.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);

  if (!name || !description || !category || !targetAudience || tags.length < 2) {
    return null;
  }

  return {
    name,
    description,
    category,
    tags,
    targetAudience,
    monetizationModel: monetizationModel || undefined,
    source,
    sourceIdeaTitle: sourceIdeaTitle || undefined,
    sourceIdeaDescription: sourceIdeaDescription || undefined,
  } satisfies EdenMockCreatedBusinessInput;
}

export function buildMockCreatedBusinessRecord(
  input: EdenMockCreatedBusinessInput,
  ownerUserId: string,
) {
  const slug = slugify(input.name) || "eden-workspace";
  const suffix = Date.now().toString(36);

  return {
    businessId: `business-local-${slug}-${suffix}`,
    serviceId: `service-local-${slug}-${suffix}`,
    projectId: `project-local-${slug}-${suffix}`,
    ownerUserId,
    createdAt: new Date().toISOString(),
    source: input.source,
    sourceIdeaTitle: input.sourceIdeaTitle,
    sourceIdeaDescription: input.sourceIdeaDescription,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
    targetAudience: input.targetAudience,
    monetizationModel: input.monetizationModel,
  } satisfies EdenMockCreatedBusinessRecord;
}

export function getMockCreatedBusinessState(
  record?: EdenMockCreatedBusinessRecord | null,
) {
  if (!record) {
    return null;
  }

  const business: EdenMockBusiness = {
    id: record.businessId,
    name: record.name,
    ownerUserId: record.ownerUserId,
    status: "draft",
    category: record.category,
    tags: record.tags,
    description: record.description,
    summary: `A session-created Eden workspace for ${record.targetAudience.toLowerCase()} in ${record.category.toLowerCase()}.`,
    tagline: `${record.category} workspace for ${record.targetAudience.toLowerCase()}.`,
    visibility: "Private preview",
    teamLabel: "Local mock workspace + 1 operator",
    creditBalanceCredits: 1400,
    publishReadinessPercent: 28,
    nextMilestone: "Complete build setup",
    featuredServiceId: record.serviceId,
  };

  const service: EdenMockService = {
    id: record.serviceId,
    title: buildServiceTitle(record.name),
    businessId: record.businessId,
    category: record.category,
    description: `${record.description} Built for ${record.targetAudience.toLowerCase()} inside Eden's mocked business creation flow.`,
    summary: `A session-created service shell for ${record.targetAudience.toLowerCase()} with ${getMonetizationSummary(record.monetizationModel)}.`,
    status: "Draft",
    tags: record.tags,
  };

  const project: EdenMockProject = {
    id: record.projectId,
    businessId: record.businessId,
    title: `${record.name} Launch Build`,
    type: "New workspace",
    status: "Idea",
    summary: `Turn ${record.name} into a publish-ready Eden business for ${record.targetAudience.toLowerCase()}.`,
    milestone: record.monetizationModel
      ? `Validate ${record.monetizationModel.toLowerCase()} packaging and launch positioning`
      : "Validate packaging, pricing, and launch positioning",
    updatedAt: "Created just now",
    progress: 18,
  };

  const logs: EdenMockLog[] = [
    {
      id: `log-local-${record.businessId}-01`,
      level: "info",
      source: "workspace",
      title: `${record.name} was staged in the business creator`,
      message: `Initial workspace context was created for ${record.targetAudience.toLowerCase()} with ${record.tags.join(", ")}.`,
      timestamp: "Just now",
      businessId: record.businessId,
      serviceId: record.serviceId,
      userId: record.ownerUserId,
    },
    {
      id: `log-local-${record.businessId}-02`,
      level: "info",
      source: "review",
      title: "Idea-to-business review completed",
      message:
        record.sourceIdeaTitle
          ? `${record.sourceIdeaTitle} was accepted as the starting concept for this mocked business workspace.`
          : "The workspace was created from the business dashboard starter flow.",
      timestamp: "Just now",
      businessId: record.businessId,
      serviceId: record.serviceId,
      userId: record.ownerUserId,
    },
  ];

  return {
    record,
    business,
    service,
    project,
    logs,
  } satisfies EdenMockCreatedBusinessState;
}

export function getMockCreatedBusinessStateForUser(
  userId: string,
  record?: EdenMockCreatedBusinessRecord | null,
) {
  if (!record || record.ownerUserId !== userId) {
    return null;
  }

  return getMockCreatedBusinessState(record);
}

function buildServiceTitle(name: string) {
  if (/\b(app|studio|lab|workspace|platform)\b/i.test(name)) {
    return name;
  }

  return `${name} Experience`;
}

function getMonetizationSummary(monetizationModel?: string) {
  if (!monetizationModel) {
    return "a placeholder monetization model";
  }

  return `${monetizationModel.toLowerCase()} pricing placeholders`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 24);
}

function isMockCreatedBusinessRecord(
  value: unknown,
): value is EdenMockCreatedBusinessRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockCreatedBusinessRecord>;

  return (
    typeof candidate.businessId === "string" &&
    typeof candidate.serviceId === "string" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.ownerUserId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.category === "string" &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === "string") &&
    typeof candidate.targetAudience === "string" &&
    (typeof candidate.monetizationModel === "string" ||
      typeof candidate.monetizationModel === "undefined") &&
    (typeof candidate.sourceIdeaTitle === "string" ||
      typeof candidate.sourceIdeaTitle === "undefined") &&
    (typeof candidate.sourceIdeaDescription === "string" ||
      typeof candidate.sourceIdeaDescription === "undefined")
  );
}

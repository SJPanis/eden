import type { DiscoveryRepo } from "@/modules/core/repos/discovery-repo";
import {
  businesses as platformBusinesses,
  projects as platformProjects,
  services as platformServices,
} from "@/modules/core/mock-data/platform-data";
import type {
  EdenMockBusiness,
  EdenMockPipelineRecord,
  EdenMockProject,
  EdenMockReleaseStatus,
  EdenMockService,
} from "@/modules/core/mock-data/platform-types";
import {
  getBusinessById,
  loadBusinessById,
} from "@/modules/core/services/business-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import {
  mapRepoBusinessToMockBusiness,
  mapRepoServiceToMockService,
  mergeCatalogLayers,
} from "@/modules/core/services/read-record-mappers";
import {
  resolveBuilderLoopReadMode,
  resolveBuilderLoopReadRepos,
  tryPersistentBuilderLoopRead,
} from "@/modules/core/services/read-service-runtime";

export interface DiscoveryService {
  getSnapshot(): ReturnType<DiscoveryRepo["getDiscoverySnapshot"]>;
}

export function createDiscoveryService(discoveryRepo: DiscoveryRepo): DiscoveryService {
  return {
    getSnapshot() {
      return discoveryRepo.getDiscoverySnapshot();
    },
  };
}

export type EdenDiscoverySnapshot = {
  marketplaceServices: EdenMockService[];
  marketplaceBusinesses: EdenMockBusiness[];
  projects: EdenMockProject[];
  serviceCatalog: EdenMockService[];
  businessCatalog: EdenMockBusiness[];
};

export function buildDiscoverySnapshot(
  options: EdenReadServiceOptions = {},
): EdenDiscoverySnapshot {
  const { pipelineRecords = [], createdBusiness, workspaceServices = [] } = options;
  const localProjects = workspaceServices.map((entry) => entry.project);
  const businessSource = mergeCatalogLayers(platformBusinesses, [createdBusiness?.business]);
  const serviceSource = mergeCatalogLayers(platformServices, [
    createdBusiness?.service,
    ...workspaceServices.map((entry) => entry.service),
  ]);

  const businessCatalog = businessSource.map((business) => {
    const relatedServices = serviceSource.filter((service) => service.businessId === business.id);
    const activeServiceId = resolveActiveServiceId(
      business,
      relatedServices,
      pipelineRecords,
      workspaceServices,
    );
    const effectiveStatus = resolveBusinessReleaseStatus(
      business,
      relatedServices,
      pipelineRecords,
    );

    return {
      ...business,
      featuredServiceId: activeServiceId,
      status: effectiveStatus,
      visibility: getVisibilityLabel(effectiveStatus),
      publishReadinessPercent:
        effectiveStatus === "published"
          ? Math.max(100, business.publishReadinessPercent)
          : business.publishReadinessPercent,
      nextMilestone:
        effectiveStatus === "published"
          ? "Monitor live usage and iterate"
          : business.nextMilestone,
    } satisfies EdenMockBusiness;
  });
  const businessLookup = new Map(businessCatalog.map((business) => [business.id, business]));
  const serviceCatalog = serviceSource.map((service) => {
    const business = businessLookup.get(service.businessId) ?? null;
    const effectiveStatus = resolveServiceReleaseStatus(service, business, pipelineRecords);

    return {
      ...service,
      status: getServiceStatusLabel(effectiveStatus),
    } satisfies EdenMockService;
  });
  const publishedBusinessIds = new Set(
    serviceCatalog
      .filter((service) => service.status.toLowerCase() === "published")
      .map((service) => service.businessId),
  );
  const marketplaceBusinesses = businessCatalog
    .filter((business) => publishedBusinessIds.has(business.id))
    .sort((left, right) => {
      if (right.publishReadinessPercent !== left.publishReadinessPercent) {
        return right.publishReadinessPercent - left.publishReadinessPercent;
      }

      return left.name.localeCompare(right.name);
    });
  const marketplaceServices = serviceCatalog
    .filter((service) => service.status.toLowerCase() === "published")
    .sort((left, right) => {
      const rightBusiness = businessLookup.get(right.businessId);
      const leftBusiness = businessLookup.get(left.businessId);
      const readinessDelta =
        (rightBusiness?.publishReadinessPercent ?? 0) -
        (leftBusiness?.publishReadinessPercent ?? 0);

      if (readinessDelta !== 0) {
        return readinessDelta;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    marketplaceServices,
    marketplaceBusinesses,
    projects: mergeCatalogRecord(platformProjects, createdBusiness?.project)
      .concat(localProjects)
      .filter(
        (project, index, projects) =>
          projects.findIndex((entry) => entry.id === project.id) === index,
      ),
    serviceCatalog,
    businessCatalog,
  };
}

export async function loadDiscoverySnapshot(
  options: EdenReadServiceOptions = {},
): Promise<EdenDiscoverySnapshot> {
  const { pipelineRecords = [], createdBusiness, workspaceServices = [] } = options;
  const localProjects = workspaceServices.map((entry) => entry.project);
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentSnapshot = readRepos
    ? await tryPersistentBuilderLoopRead("build_discovery_snapshot", readMode, async () =>
        readRepos.discoveryRepo.getDiscoverySnapshot(),
      )
    : null;
  const persistentBusinesses =
    persistentSnapshot?.businesses.map(mapRepoBusinessToMockBusiness) ?? [];
  const persistentServices =
    persistentSnapshot?.services.map(mapRepoServiceToMockService) ?? [];
  const baseBusinesses = readMode === "real_only" ? [] : platformBusinesses;
  const baseServices = readMode === "real_only" ? [] : platformServices;
  const businessSource = mergeCatalogLayers(baseBusinesses, [
    createdBusiness?.business,
    ...persistentBusinesses,
  ]);
  const serviceSource = mergeCatalogLayers(baseServices, [
    createdBusiness?.service,
    ...workspaceServices.map((entry) => entry.service),
    ...persistentServices,
  ]);

  return createDiscoverySnapshotFromSources(
    {
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    },
    businessSource,
    serviceSource,
    localProjects,
  );
}

export function getDiscoveryServiceById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  return buildDiscoverySnapshot(options).serviceCatalog.find((service) => service.id === id) ?? null;
}

export async function loadDiscoveryServiceById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  const snapshot = await loadDiscoverySnapshot(options);
  return snapshot.serviceCatalog.find((service) => service.id === id) ?? null;
}

export function getDiscoveryBusinessById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  return buildDiscoverySnapshot(options).businessCatalog.find((business) => business.id === id) ?? null;
}

export async function loadDiscoveryBusinessById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  const snapshot = await loadDiscoverySnapshot(options);
  return snapshot.businessCatalog.find((business) => business.id === id) ?? null;
}

export function getDiscoveryBusinessForService(
  serviceOrId: string | EdenMockService,
  options: EdenReadServiceOptions = {},
) {
  const service =
    typeof serviceOrId === "string"
      ? getDiscoveryServiceById(serviceOrId, options)
      : serviceOrId;

  if (!service) {
    return null;
  }

  return getBusinessById(service.businessId, options);
}

export async function loadDiscoveryBusinessForService(
  serviceOrId: string | EdenMockService,
  options: EdenReadServiceOptions = {},
) {
  const service =
    typeof serviceOrId === "string"
      ? await loadDiscoveryServiceById(serviceOrId, options)
      : serviceOrId;

  if (!service) {
    return null;
  }

  return loadBusinessById(service.businessId, options);
}

export function listPublishedServices(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const services = buildDiscoverySnapshot(options).marketplaceServices;
  return typeof limit === "number" ? services.slice(0, limit) : services;
}

export async function loadPublishedServices(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const snapshot = await loadDiscoverySnapshot(options);
  const services = snapshot.marketplaceServices;
  return typeof limit === "number" ? services.slice(0, limit) : services;
}

export function listPublishedBusinesses(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const businesses = buildDiscoverySnapshot(options).marketplaceBusinesses;
  return typeof limit === "number" ? businesses.slice(0, limit) : businesses;
}

export async function loadPublishedBusinesses(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const snapshot = await loadDiscoverySnapshot(options);
  const businesses = snapshot.marketplaceBusinesses;
  return typeof limit === "number" ? businesses.slice(0, limit) : businesses;
}

function createDiscoverySnapshotFromSources(
  options: EdenReadServiceOptions,
  businessSource: EdenMockBusiness[],
  serviceSource: EdenMockService[],
  localProjects: EdenMockProject[],
): EdenDiscoverySnapshot {
  const { pipelineRecords = [], createdBusiness, workspaceServices = [] } = options;

  const businessCatalog = businessSource.map((business) => {
    const relatedServices = serviceSource.filter((service) => service.businessId === business.id);
    const activeServiceId = resolveActiveServiceId(
      business,
      relatedServices,
      pipelineRecords,
      workspaceServices,
    );
    const effectiveStatus = resolveBusinessReleaseStatus(
      business,
      relatedServices,
      pipelineRecords,
    );

    return {
      ...business,
      featuredServiceId: activeServiceId,
      status: effectiveStatus,
      visibility: getVisibilityLabel(effectiveStatus),
      publishReadinessPercent:
        effectiveStatus === "published"
          ? Math.max(100, business.publishReadinessPercent)
          : business.publishReadinessPercent,
      nextMilestone:
        effectiveStatus === "published"
          ? "Monitor live usage and iterate"
          : business.nextMilestone,
    } satisfies EdenMockBusiness;
  });
  const businessLookup = new Map(businessCatalog.map((business) => [business.id, business]));
  const serviceCatalog = serviceSource.map((service) => {
    const business = businessLookup.get(service.businessId) ?? null;
    const effectiveStatus = resolveServiceReleaseStatus(service, business, pipelineRecords);

    return {
      ...service,
      status: getServiceStatusLabel(effectiveStatus),
    } satisfies EdenMockService;
  });
  const publishedBusinessIds = new Set(
    serviceCatalog
      .filter((service) => service.status.toLowerCase() === "published")
      .map((service) => service.businessId),
  );
  const marketplaceBusinesses = businessCatalog
    .filter((business) => publishedBusinessIds.has(business.id))
    .sort((left, right) => {
      if (right.publishReadinessPercent !== left.publishReadinessPercent) {
        return right.publishReadinessPercent - left.publishReadinessPercent;
      }

      return left.name.localeCompare(right.name);
    });
  const marketplaceServices = serviceCatalog
    .filter((service) => service.status.toLowerCase() === "published")
    .sort((left, right) => {
      const rightBusiness = businessLookup.get(right.businessId);
      const leftBusiness = businessLookup.get(left.businessId);
      const readinessDelta =
        (rightBusiness?.publishReadinessPercent ?? 0) -
        (leftBusiness?.publishReadinessPercent ?? 0);

      if (readinessDelta !== 0) {
        return readinessDelta;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    marketplaceServices,
    marketplaceBusinesses,
    projects: mergeCatalogRecord(platformProjects, createdBusiness?.project)
      .concat(localProjects)
      .filter(
        (project, index, projects) =>
          projects.findIndex((entry) => entry.id === project.id) === index,
      ),
    serviceCatalog,
    businessCatalog,
  };
}

function mergeCatalogRecord<T extends { id: string }>(records: T[], record?: T | null) {
  if (!record) {
    return records;
  }

  return [record, ...records.filter((entry) => entry.id !== record.id)];
}

function resolveActiveServiceId(
  business: EdenMockBusiness,
  relatedServices: EdenMockService[],
  pipelineRecords: EdenMockPipelineRecord[],
  workspaceServices: EdenReadServiceOptions["workspaceServices"] = [],
) {
  const storedRecord =
    pipelineRecords.find((record) => record.businessId === business.id) ?? null;

  if (storedRecord && relatedServices.some((service) => service.id === storedRecord.serviceId)) {
    return storedRecord.serviceId;
  }

  const localService = workspaceServices.find((entry) => entry.record.businessId === business.id);

  if (localService) {
    return localService.service.id;
  }

  return business.featuredServiceId;
}

function resolveBusinessReleaseStatus(
  business: EdenMockBusiness,
  relatedServices: EdenMockService[],
  pipelineRecords: EdenMockPipelineRecord[],
): EdenMockBusiness["status"] {
  const storedRecord = pipelineRecords.find((record) => record.businessId === business.id) ?? null;
  const statuses = relatedServices.map((service) =>
    resolveServiceReleaseStatus(service, business, pipelineRecords),
  );

  if (storedRecord?.status === "published" || statuses.includes("published")) {
    return "published";
  }

  if (
    storedRecord?.status === "ready" ||
    storedRecord?.status === "testing" ||
    statuses.includes("ready") ||
    statuses.includes("testing")
  ) {
    return "testing";
  }

  return "draft";
}

function resolveServiceReleaseStatus(
  service: EdenMockService,
  business: EdenMockBusiness | null,
  pipelineRecords: EdenMockPipelineRecord[],
): EdenMockReleaseStatus {
  const exactRecord =
    pipelineRecords.find(
      (record) =>
        record.businessId === service.businessId && record.serviceId === service.id,
    ) ?? null;

  if (exactRecord) {
    return exactRecord.status;
  }

  const businessRecord =
    business?.featuredServiceId === service.id
      ? pipelineRecords.find((record) => record.businessId === service.businessId) ?? null
      : null;

  if (businessRecord) {
    return businessRecord.status;
  }

  const normalizedStatus = service.status.toLowerCase();

  if (normalizedStatus.includes("publish") || business?.status === "published") {
    return "published";
  }

  if (normalizedStatus.includes("ready")) {
    return "ready";
  }

  if (normalizedStatus.includes("testing") || business?.status === "testing") {
    return "testing";
  }

  return "draft";
}

function getServiceStatusLabel(status: EdenMockReleaseStatus) {
  if (status === "published") {
    return "Published";
  }

  if (status === "ready") {
    return "Ready";
  }

  if (status === "testing") {
    return "Testing";
  }

  return "Draft";
}

function getVisibilityLabel(
  status: EdenMockReleaseStatus | EdenMockBusiness["status"],
) {
  if (status === "published") {
    return "Published";
  }

  if (status === "testing" || status === "ready") {
    return "Internal testing";
  }

  return "Private preview";
}

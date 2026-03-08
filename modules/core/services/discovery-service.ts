import "server-only";

import {
  businesses as platformBusinesses,
  services as platformServices,
} from "@/modules/core/mock-data/platform-data";
import {
  createDiscoverySnapshotFromSources,
  type EdenDiscoverySnapshot,
} from "@/modules/core/mock-data/discovery-selectors";
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

export async function loadDiscoveryServiceById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  const snapshot = await loadDiscoverySnapshot(options);
  return snapshot.serviceCatalog.find((service) => service.id === id) ?? null;
}

export async function loadDiscoveryBusinessById(
  id: string,
  options: EdenReadServiceOptions = {},
) {
  const snapshot = await loadDiscoverySnapshot(options);
  return snapshot.businessCatalog.find((business) => business.id === id) ?? null;
}

export async function loadDiscoveryBusinessForService(
  serviceOrId: string | { id: string; businessId: string },
  options: EdenReadServiceOptions = {},
) {
  const service =
    typeof serviceOrId === "string"
      ? await loadDiscoveryServiceById(serviceOrId, options)
      : serviceOrId;

  if (!service) {
    return null;
  }

  const snapshot = await loadDiscoverySnapshot(options);
  return snapshot.businessCatalog.find((business) => business.id === service.businessId) ?? null;
}

export async function loadPublishedServices(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const snapshot = await loadDiscoverySnapshot(options);
  const services = snapshot.marketplaceServices;
  return typeof limit === "number" ? services.slice(0, limit) : services;
}

export async function loadPublishedBusinesses(
  options: EdenReadServiceOptions = {},
  limit?: number,
) {
  const snapshot = await loadDiscoverySnapshot(options);
  const businesses = snapshot.marketplaceBusinesses;
  return typeof limit === "number" ? businesses.slice(0, limit) : businesses;
}

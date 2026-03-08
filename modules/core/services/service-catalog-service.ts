import "server-only";

import type { ServiceRepo } from "@/modules/core/repos/service-repo";
import {
  getServiceById as getMockServiceById,
  services as platformServices,
} from "@/modules/core/mock-data/platform-data";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import {
  resolveBuilderLoopReadMode,
  resolveBuilderLoopReadRepos,
  tryPersistentBuilderLoopRead,
} from "@/modules/core/services/read-service-runtime";
import {
  mapRepoServiceToMockService,
  mergeCatalogLayers,
} from "@/modules/core/services/read-record-mappers";

export interface ServiceCatalogService {
  getServiceById(serviceId: string): ReturnType<ServiceRepo["findById"]>;
  getServicesByBusinessId(businessId: string): ReturnType<ServiceRepo["findByBusinessId"]>;
  listPublishedServices(): ReturnType<ServiceRepo["listPublished"]>;
}

export function createServiceCatalogService(serviceRepo: ServiceRepo): ServiceCatalogService {
  return {
    getServiceById(serviceId) {
      return serviceRepo.findById(serviceId);
    },
    getServicesByBusinessId(businessId) {
      return serviceRepo.findByBusinessId(businessId);
    },
    listPublishedServices() {
      return serviceRepo.listPublished();
    },
  };
}

export function listServices(
  options: Pick<EdenReadServiceOptions, "createdBusiness" | "workspaceServices"> = {},
) {
  const localServices = (options.workspaceServices ?? []).map((entry) => entry.service);

  return mergeCatalogRecord(platformServices, options.createdBusiness?.service)
    .concat(localServices)
    .filter(
      (service, index, services) =>
        services.findIndex((entry) => entry.id === service.id) === index,
    );
}

export async function loadServiceById(
  serviceId: string,
  options: Pick<EdenReadServiceOptions, "createdBusiness" | "workspaceServices"> = {},
) {
  const localService =
    options.createdBusiness?.service?.id === serviceId
      ? options.createdBusiness.service
      : (options.workspaceServices ?? []).find((entry) => entry.service.id === serviceId)?.service ?? null;

  if (localService) {
    return localService;
  }

  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentService = readRepos
    ? await tryPersistentBuilderLoopRead("get_service_by_id", readMode, async () => {
        const service = await readRepos.serviceRepo.findById(serviceId);
        return service ? mapRepoServiceToMockService(service) : null;
      })
    : null;

  if (persistentService) {
    return persistentService;
  }

  if (readMode === "real_only") {
    return null;
  }

  return getMockServiceById(
    serviceId,
    options.createdBusiness,
    options.workspaceServices ?? [],
  );
}

export async function loadServiceCatalog(
  options: Pick<EdenReadServiceOptions, "createdBusiness" | "workspaceServices"> = {},
) {
  const localServices = (options.workspaceServices ?? []).map((entry) => entry.service);
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentServices = readRepos
    ? await tryPersistentBuilderLoopRead("list_service_catalog", readMode, async () => {
        const snapshot = await readRepos.discoveryRepo.getDiscoverySnapshot();
        return snapshot.services.map(mapRepoServiceToMockService);
      })
    : null;
  const baseServices = readMode === "real_only" ? [] : platformServices;

  return mergeCatalogLayers(baseServices, [
    options.createdBusiness?.service,
    ...localServices,
    ...(persistentServices ?? []),
  ]);
}

export function getServiceById(
  serviceId: string,
  options: Pick<EdenReadServiceOptions, "createdBusiness" | "workspaceServices"> = {},
) {
  return getMockServiceById(
    serviceId,
    options.createdBusiness,
    options.workspaceServices ?? [],
  );
}

function mergeCatalogRecord<T extends { id: string }>(records: T[], record?: T | null) {
  if (!record) {
    return records;
  }

  return [record, ...records.filter((entry) => entry.id !== record.id)];
}

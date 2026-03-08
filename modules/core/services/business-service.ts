import "server-only";

import type { BusinessRepo } from "@/modules/core/repos/business-repo";
import type { EdenMockBusiness, EdenMockService } from "@/modules/core/mock-data/platform-types";
import {
  businesses as platformBusinesses,
  getBusinessById as getMockBusinessById,
  getBusinessForService as getMockBusinessForService,
  getBusinessOwner as getMockBusinessOwner,
} from "@/modules/core/mock-data/platform-data";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import {
  resolveBuilderLoopReadMode,
  resolveBuilderLoopReadRepos,
  tryPersistentBuilderLoopRead,
} from "@/modules/core/services/read-service-runtime";
import {
  mapRepoBusinessToMockBusiness,
  mergeCatalogLayers,
} from "@/modules/core/services/read-record-mappers";

export interface BusinessService {
  getBusinessById(businessId: string): ReturnType<BusinessRepo["findById"]>;
  getBusinessesForOwner(ownerUserId: string): ReturnType<BusinessRepo["findByOwnerUserId"]>;
  listBusinesses(): ReturnType<BusinessRepo["list"]>;
}

export function createBusinessService(businessRepo: BusinessRepo): BusinessService {
  return {
    getBusinessById(businessId) {
      return businessRepo.findById(businessId);
    },
    getBusinessesForOwner(ownerUserId) {
      return businessRepo.findByOwnerUserId(ownerUserId);
    },
    listBusinesses() {
      return businessRepo.list();
    },
  };
}

export function listBusinesses(
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  return mergeCatalogRecord(platformBusinesses, options.createdBusiness?.business);
}

export async function loadBusinessById(
  businessId: string,
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  const localBusiness = options.createdBusiness?.business?.id === businessId
    ? options.createdBusiness.business
    : null;

  if (localBusiness) {
    return localBusiness;
  }

  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentBusiness = readRepos
    ? await tryPersistentBuilderLoopRead("get_business_by_id", readMode, async () => {
        const business = await readRepos.businessRepo.findById(businessId);
        return business ? mapRepoBusinessToMockBusiness(business) : null;
      })
    : null;

  if (persistentBusiness) {
    return persistentBusiness;
  }

  if (readMode === "real_only") {
    return null;
  }

  return getMockBusinessById(businessId, options.createdBusiness);
}

export async function loadBusinessCatalog(
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentBusinesses = readRepos
    ? await tryPersistentBuilderLoopRead("list_business_catalog", readMode, async () => {
        const businesses = await readRepos.businessRepo.list();
        return businesses.map(mapRepoBusinessToMockBusiness);
      })
    : null;
  const baseBusinesses = readMode === "real_only" ? [] : platformBusinesses;

  return mergeCatalogLayers(baseBusinesses, [
    options.createdBusiness?.business,
    ...(persistentBusinesses ?? []),
  ]);
}

export async function loadBusinessesForOwner(
  ownerUserId: string,
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  const localBusiness =
    options.createdBusiness?.business?.ownerUserId === ownerUserId
      ? options.createdBusiness.business
      : null;
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentBusinesses = readRepos
    ? await tryPersistentBuilderLoopRead("list_business_catalog", readMode, async () => {
        const businesses = await readRepos.businessRepo.findByOwnerUserId(ownerUserId);
        return businesses.map(mapRepoBusinessToMockBusiness);
      })
    : null;
  const baseBusinesses =
    readMode === "real_only"
      ? []
      : platformBusinesses.filter((business) => business.ownerUserId === ownerUserId);

  return mergeCatalogLayers(baseBusinesses, [
    localBusiness,
    ...(persistentBusinesses ?? []),
  ]);
}

export function getBusinessById(
  businessId: string,
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  return getMockBusinessById(businessId, options.createdBusiness);
}

export function getBusinessOwner(
  businessOrId: string | EdenMockBusiness,
  options: Pick<EdenReadServiceOptions, "createdBusiness"> = {},
) {
  return getMockBusinessOwner(businessOrId, options.createdBusiness);
}

export function getBusinessForService(
  serviceOrId: string | EdenMockService,
  options: Pick<EdenReadServiceOptions, "createdBusiness" | "workspaceServices"> = {},
) {
  return getMockBusinessForService(
    serviceOrId,
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

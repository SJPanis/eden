import "server-only";

import {
  ownerDashboardBusinessIds,
  ownerDashboardServiceIds,
  ownerDashboardUserIds,
} from "@/modules/core/mock-data/platform-data";
import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
import type {
  EdenMockBusiness,
  EdenMockService,
  EdenMockUser,
} from "@/modules/core/mock-data/platform-types";
import { loadBusinessById, loadBusinessCatalog } from "@/modules/core/services/business-service";
import { loadServiceCatalog } from "@/modules/core/services/service-catalog-service";
import { loadUserById, loadUserCatalog } from "@/modules/core/services/user-service";

type DashboardReadOptions = {
  createdBusiness?: EdenMockCreatedBusinessState | null;
  workspaceServices?: EdenMockWorkspaceServiceState[];
};

export type BusinessWorkspaceOverviewData = {
  businessProfile: EdenMockBusiness | null;
  businessOwner: EdenMockUser | null;
};

export type OwnerDashboardData = {
  userCatalog: EdenMockUser[];
  businessCatalog: EdenMockBusiness[];
  serviceCatalog: EdenMockService[];
  watchedUsers: EdenMockUser[];
  watchedBusinesses: EdenMockBusiness[];
  watchedServices: EdenMockService[];
};

export async function loadBusinessWorkspaceOverview(
  activeBusinessId: string,
  options: DashboardReadOptions = {},
): Promise<BusinessWorkspaceOverviewData> {
  const businessProfile = await loadBusinessById(activeBusinessId, {
    createdBusiness: options.createdBusiness,
  });
  const businessOwner = businessProfile
    ? await loadUserById(businessProfile.ownerUserId)
    : null;

  return {
    businessProfile,
    businessOwner,
  };
}

export async function loadOwnerDashboardData(
  options: DashboardReadOptions = {},
): Promise<OwnerDashboardData> {
  const [userCatalog, businessCatalog, serviceCatalog] = await Promise.all([
    loadUserCatalog(),
    loadBusinessCatalog({
      createdBusiness: options.createdBusiness,
    }),
    loadServiceCatalog({
      createdBusiness: options.createdBusiness,
      workspaceServices: options.workspaceServices,
    }),
  ]);

  return {
    userCatalog,
    businessCatalog,
    serviceCatalog,
    watchedUsers: filterCatalogByIds(userCatalog, ownerDashboardUserIds),
    watchedBusinesses: filterCatalogByIds(businessCatalog, ownerDashboardBusinessIds),
    watchedServices: filterCatalogByIds(serviceCatalog, ownerDashboardServiceIds),
  };
}

function filterCatalogByIds<T extends { id: string }>(catalog: T[], ids: string[]) {
  const idSet = new Set(ids);
  return catalog.filter((record) => idSet.has(record.id));
}

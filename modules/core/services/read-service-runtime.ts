import "server-only";

import { createPrismaBusinessRepo } from "@/modules/core/repos/prisma-business-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { createPrismaDiscoveryRepo } from "@/modules/core/repos/prisma-discovery-repo";
import { createPrismaServiceRepo } from "@/modules/core/repos/prisma-service-repo";
import { createPrismaUserRepo } from "@/modules/core/repos/prisma-user-repo";
import type { BusinessRepo } from "@/modules/core/repos/business-repo";
import type { DiscoveryRepo } from "@/modules/core/repos/discovery-repo";
import type { ServiceRepo } from "@/modules/core/repos/service-repo";
import type { UserRepo } from "@/modules/core/repos/user-repo";
import type { EdenBuilderLoopReadMode } from "@/modules/core/services/read-service-types";

type EdenBuilderLoopReadRepos = {
  userRepo: UserRepo;
  businessRepo: BusinessRepo;
  serviceRepo: ServiceRepo;
  discoveryRepo: DiscoveryRepo;
};

type EdenBuilderLoopReadOperation =
  | "initialize_persistent_read_repos"
  | "get_user_by_id"
  | "get_user_by_username"
  | "list_users"
  | "get_business_by_id"
  | "get_service_by_id"
  | "list_business_catalog"
  | "list_published_services"
  | "list_published_businesses"
  | "list_service_catalog"
  | "build_discovery_snapshot";

const allowedBuilderLoopReadModes = new Set<EdenBuilderLoopReadMode>([
  "mock_only",
  "hybrid",
  "real_only",
]);

let cachedBuilderLoopReadRepos: EdenBuilderLoopReadRepos | null | undefined;

export function resolveBuilderLoopReadMode(
  input = process.env.EDEN_BUILDER_LOOP_READ_MODE,
): EdenBuilderLoopReadMode {
  if (input && allowedBuilderLoopReadModes.has(input as EdenBuilderLoopReadMode)) {
    return input as EdenBuilderLoopReadMode;
  }

  return "mock_only";
}

export function shouldAttemptPersistentBuilderLoopReads(
  mode: EdenBuilderLoopReadMode,
) {
  return mode === "hybrid" || mode === "real_only";
}

export function resolveBuilderLoopReadRepos(
  mode: EdenBuilderLoopReadMode,
): EdenBuilderLoopReadRepos | null {
  if (!shouldAttemptPersistentBuilderLoopReads(mode)) {
    return null;
  }

  if (cachedBuilderLoopReadRepos !== undefined) {
    return cachedBuilderLoopReadRepos;
  }

  try {
    const prisma = getPrismaClient();

    cachedBuilderLoopReadRepos = {
      userRepo: createPrismaUserRepo(prisma),
      businessRepo: createPrismaBusinessRepo(prisma),
      serviceRepo: createPrismaServiceRepo(prisma),
      discoveryRepo: createPrismaDiscoveryRepo(prisma),
    };

    return cachedBuilderLoopReadRepos;
  } catch (error) {
    logBuilderLoopReadFailure("initialize_persistent_read_repos", error, mode);

    if (mode === "real_only") {
      throw error;
    }

    cachedBuilderLoopReadRepos = null;
    return null;
  }
}

export async function tryPersistentBuilderLoopRead<T>(
  operation: EdenBuilderLoopReadOperation,
  mode: EdenBuilderLoopReadMode,
  callback: () => Promise<T>,
) {
  if (!shouldAttemptPersistentBuilderLoopReads(mode)) {
    return null;
  }

  try {
    const result = await callback();
    logBuilderLoopReadSuccess(operation, mode);
    return result;
  } catch (error) {
    logBuilderLoopReadFailure(operation, error, mode);

    if (mode === "real_only") {
      throw error;
    }

    return null;
  }
}

function logBuilderLoopReadSuccess(
  operation: EdenBuilderLoopReadOperation,
  mode: EdenBuilderLoopReadMode,
) {
  if (process.env.EDEN_LOG_HYBRID_READS !== "true") {
    return;
  }

  console.info(
    `[eden-builder-read] ${mode} persistent read completed: ${operation}`,
  );
}

function logBuilderLoopReadFailure(
  operation: EdenBuilderLoopReadOperation,
  error: unknown,
  mode: EdenBuilderLoopReadMode,
) {
  const message = error instanceof Error ? error.message : "Unknown persistent read error";
  const fallbackMessage =
    mode === "real_only"
      ? "Persistent-only reads are reserved for the future full cutover path."
      : "Mock read fallbacks remain authoritative.";

  console.warn(
    `[eden-builder-read] ${mode} persistent read failed during ${operation}. ${fallbackMessage} ${message}`,
  );
}

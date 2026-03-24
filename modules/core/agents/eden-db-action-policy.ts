import "server-only";

import { Prisma } from "@prisma/client";
import {
  buildAutonomyModeState,
  checkDbActionAllowed,
  resolveEnvironmentScope,
  type EdenAutonomyModeState,
  type EdenDbActionKey,
} from "@/modules/core/agents/eden-autonomy-boundary";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { edenOwnerInternalSandboxRuntimeId } from "@/modules/core/projects/project-runtime-shared";

export type { EdenAutonomyModeState, EdenDbActionKey };
export { checkDbActionAllowed, resolveEnvironmentScope };

/**
 * Load the full autonomy mode state by reading live runtime conditions from the DB.
 * Never throws — returns a safe degraded state if the DB is unavailable.
 */
export async function loadAutonomyModeState(): Promise<EdenAutonomyModeState> {
  const openAiKeyPresent = Boolean(process.env.OPENAI_API_KEY);

  try {
    const prisma = getPrismaClient();

    const runtime = await prisma.projectRuntime.findUnique({
      where: { id: edenOwnerInternalSandboxRuntimeId },
      select: {
        id: true,
        accessPolicy: true,
        runtimeType: true,
        status: true,
        secretBoundaries: {
          select: { providerKey: true, status: true, isRequired: true },
        },
        providerApprovals: {
          select: { providerKey: true, approvalStatus: true },
        },
      },
    });

    const sandboxRuntimeReady =
      runtime?.accessPolicy === "OWNER_ONLY" &&
      runtime?.runtimeType === "INTERNAL_SANDBOX";

    const providerApproved =
      runtime?.providerApprovals.some(
        (a) => a.providerKey === "OPENAI" && a.approvalStatus === "APPROVED",
      ) ?? false;

    const secretBoundaryConfigured =
      runtime?.secretBoundaries.some(
        (b) => b.providerKey === "OPENAI" && b.status === "CONFIGURED",
      ) ?? false;

    // Migrations are considered pending if the runtime table doesn't exist
    // (which would have caused the findUnique to throw a P2021/P2022 error).
    // If we got here, the table exists and migrations are applied.
    const migrationsPending = false;

    return buildAutonomyModeState({
      openAiKeyPresent,
      sandboxRuntimeReady,
      providerApproved,
      secretBoundaryConfigured,
      migrationsPending,
    });
  } catch (error) {
    // If the DB is unavailable (e.g. migrations not applied), report as pending.
    const isMigrationGap =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022");

    return buildAutonomyModeState({
      openAiKeyPresent,
      sandboxRuntimeReady: false,
      providerApproved: false,
      secretBoundaryConfigured: false,
      migrationsPending: isMigrationGap,
    });
  }
}

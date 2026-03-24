import "server-only";

import { createProjectAgent, loadProjectBlueprintById } from "@/modules/core/services/project-workspace-service";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";

export async function createProjectAgentTool(
  context: EdenAiToolContext,
  input: {
    projectId: string;
    name: string;
    roleTitle: string;
    instructions: string;
    parentAgentId?: string | null;
    branchLabel?: string | null;
  },
) {
  const project = await loadProjectBlueprintById(input.projectId);

  if (!project) {
    return {
      created: false,
      warnings: ["The selected project no longer exists."],
    };
  }

  if (!canManageProject(context, project.businessId)) {
    return {
      created: false,
      warnings: ["This project is outside the current innovator scope."],
    };
  }

  const agent = await createProjectAgent({
    projectId: input.projectId,
    name: input.name,
    roleTitle: input.roleTitle,
    instructions: input.instructions,
    parentAgentId: input.parentAgentId ?? null,
    branchLabel: input.branchLabel ?? null,
  });

  return {
    created: true,
    warnings: [],
    agent,
  };
}

function canManageProject(context: EdenAiToolContext, businessId: string) {
  return context.session.role === "owner" || context.session.user.businessIds.includes(businessId);
}

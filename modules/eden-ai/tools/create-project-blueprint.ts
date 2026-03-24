import "server-only";

import { createProjectAgent, createProjectBlueprint } from "@/modules/core/services/project-workspace-service";
import { buildProjectArtifactFromPrompt } from "@/modules/eden-ai/tools/project-draft-shared";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";

export async function createProjectBlueprintTool(
  context: EdenAiToolContext,
  input: { prompt: string; businessId?: string | null },
) {
  const businessId = resolveBusinessId(context, input.businessId);

  if (!businessId) {
    return {
      project: buildProjectArtifactFromPrompt({
        prompt: input.prompt,
        groundingMode: "proposed",
      }),
      warnings: [
        "A innovator workspace is required before Eden can create a real project from this prompt.",
      ],
      created: false,
    };
  }

  const proposedProject = buildProjectArtifactFromPrompt({
    prompt: input.prompt,
    groundingMode: "live",
    businessId,
    created: true,
  });
  const project = await createProjectBlueprint({
    businessId,
    creatorUserId: context.session.user.id,
    title: proposedProject.title,
    description: proposedProject.description,
    goal: proposedProject.goal,
  });

  for (const agent of proposedProject.suggestedAgents) {
    await createProjectAgent({
      projectId: project.id,
      name: agent.name,
      roleTitle: agent.roleTitle,
      instructions: agent.instructions,
      branchLabel: agent.branchLabel ?? null,
      parentAgentId: null,
    });
  }

  return {
    project: buildProjectArtifactFromPrompt({
      prompt: input.prompt,
      groundingMode: "live",
      created: true,
      projectId: project.id,
      businessId,
      statusLabel: project.isPublished ? "Published project" : "Project created",
      detail:
        "Eden created this project in the Business workspace and staged the initial project agents.",
    }),
    warnings: [],
    created: true,
  };
}

function resolveBusinessId(
  context: EdenAiToolContext,
  requestedBusinessId?: string | null,
) {
  if (requestedBusinessId) {
    if (context.session.role === "owner") {
      return requestedBusinessId;
    }

    if (context.session.user.businessIds.includes(requestedBusinessId)) {
      return requestedBusinessId;
    }
  }

  if (context.activeBusinessId) {
    return context.activeBusinessId;
  }

  return null;
}

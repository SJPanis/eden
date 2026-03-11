import "server-only";

import { edenProjectAgentRunLeavesCost } from "@/modules/core/projects/project-blueprint-shared";
import { buildBusinessPayoutAccountingSummary } from "@/modules/core/services/payout-accounting-service";
import {
  loadProjectAgentRunByExecutionKey,
  loadProjectBlueprintById,
  runProjectAgent,
} from "@/modules/core/services/project-workspace-service";
import { loadBusinessServiceUsageMetrics } from "@/modules/core/services/service-usage-service";
import type { EdenAiToolContext } from "@/modules/eden-ai/tool-registry";

export async function runProjectAgentTool(
  context: EdenAiToolContext,
  input: {
    projectId: string;
    agentId: string;
    prompt: string;
    executionKey?: string | null;
  },
) {
  const project = await loadProjectBlueprintById(input.projectId);

  if (!project) {
    return {
      ran: false,
      warnings: ["The selected project no longer exists."],
    };
  }

  if (!canManageProject(context, project.businessId)) {
    return {
      ran: false,
      warnings: ["This project is outside the current builder scope."],
    };
  }

  const executionKey =
    input.executionKey?.trim() || `${project.id}-${input.agentId}-${Date.now()}`;
  const existingRun = await loadProjectAgentRunByExecutionKey(executionKey);

  if (existingRun) {
    return {
      ran: true,
      warnings: [],
      alreadyRecorded: true,
      agentRun: existingRun,
    };
  }

  const usageMetrics = await loadBusinessServiceUsageMetrics(project.businessId, {
    simulatedTransactions: context.simulatedTransactions,
    pipelineRecords: context.pipelineRecords,
    createdBusiness: context.createdBusiness,
    workspaceServices: context.workspaceServices,
  });
  const payoutAccounting = await buildBusinessPayoutAccountingSummary(usageMetrics, {
    createdBusiness: context.createdBusiness,
    workspaceServices: context.workspaceServices,
  });

  if (payoutAccounting.availableForInternalUseCredits < edenProjectAgentRunLeavesCost) {
    return {
      ran: false,
      warnings: ["Insufficient earned Leaf’s are available for Eden agent execution right now."],
    };
  }

  const agentRun = await runProjectAgent({
    projectId: project.id,
    agentId: input.agentId,
    userId: context.session.user.id,
    prompt: input.prompt,
    executionKey,
    costLeaves: edenProjectAgentRunLeavesCost,
  });

  if (!agentRun) {
    return {
      ran: false,
      warnings: ["Eden could not run the selected project agent."],
    };
  }

  return {
    ran: true,
    warnings: [],
    alreadyRecorded: !agentRun.recorded,
    agentRun: agentRun.agentRun,
  };
}

function canManageProject(context: EdenAiToolContext, businessId: string) {
  return context.session.role === "owner" || context.session.user.businessIds.includes(businessId);
}


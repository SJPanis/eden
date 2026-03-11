import { NextResponse } from "next/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getUserById } from "@/modules/core/mock-data";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import {
  edenProjectAgentRunLeavesCost,
  edenProjectHostingFundingIncrementLeaves,
} from "@/modules/core/projects/project-blueprint-shared";
import {
  buildBusinessPayoutAccountingSummary,
  createProjectAgent,
  createProjectBlueprint,
  fundProjectHosting,
  loadBusinessProjectBlueprints,
  loadProjectAgentRunByExecutionKey,
  loadBusinessServiceUsageMetrics,
  loadProjectBlueprintById,
  markProjectBlueprintTesting,
  publishProjectBlueprint,
  recordInternalLeavesUsage,
  runProjectAgent,
  runProjectBlueprintTest,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      businessId?: string;
      projectId?: string;
      title?: string;
      description?: string;
      goal?: string;
      status?: string;
      name?: string;
      roleTitle?: string;
      instructions?: string;
      parentAgentId?: string;
      branchLabel?: string;
      prompt?: string;
      amountLeaves?: number;
      agentId?: string;
      executionKey?: string;
    };
    const session = await getServerSession();

    if (session.role === "consumer") {
      return NextResponse.json(
        {
          ok: false,
          error: "Only builders and the owner can operate business projects.",
        },
        { status: 403 },
      );
    }

    const createdBusiness = await getMockCreatedBusiness();
    const action = body.action?.trim();

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error: "A business project action is required.",
        },
        { status: 400 },
      );
    }

    if (action === "create_project") {
      const businessId = body.businessId?.trim();
      const title = body.title?.trim();
      const description = body.description?.trim();
      const goal = body.goal?.trim();

      if (!businessId || !title || !description || !goal) {
        return NextResponse.json(
          {
            ok: false,
            error: "Title, description, goal, and business context are required to create a project blueprint.",
          },
          { status: 400 },
        );
      }

      if (!canManageBusiness(session, businessId, createdBusiness)) {
        return NextResponse.json(
          {
            ok: false,
            error: "This business is outside the current builder scope.",
          },
          { status: 403 },
        );
      }

      const project = await createProjectBlueprint({
        businessId,
        creatorUserId: session.user.id,
        title,
        description,
        goal,
      });
      const projects = await loadBusinessProjectBlueprints(businessId);

      return NextResponse.json({
        ok: true,
        action,
        project,
        projects,
      });
    }

    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "A project id is required for this business action.",
        },
        { status: 400 },
      );
    }

    const project = await loadProjectBlueprintById(projectId);

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: "The selected project no longer exists.",
        },
        { status: 404 },
      );
    }

    if (!canManageBusiness(session, project.businessId, createdBusiness)) {
      return NextResponse.json(
        {
          ok: false,
          error: "This business is outside the current builder scope.",
        },
        { status: 403 },
      );
    }

    if (action === "create_agent") {
      const name = body.name?.trim();
      const roleTitle = body.roleTitle?.trim();
      const instructions = body.instructions?.trim();

      if (!name || !roleTitle || !instructions) {
        return NextResponse.json(
          {
            ok: false,
            error: "Agent name, role, and instructions are required.",
          },
          { status: 400 },
        );
      }

      await createProjectAgent({
        projectId,
        name,
        roleTitle,
        instructions,
        parentAgentId: body.parentAgentId?.trim() || null,
        branchLabel: body.branchLabel?.trim() || null,
      });

      return NextResponse.json({
        ok: true,
        action,
        project: await loadProjectBlueprintById(projectId),
      });
    }

    if (action === "run_test") {
      const prompt = body.prompt?.trim();

      if (!prompt || prompt.length < 8) {
        return NextResponse.json(
          {
            ok: false,
            error: "Enter at least 8 characters before running a project test.",
          },
          { status: 400 },
        );
      }

      await markProjectBlueprintTesting(projectId);
      const testResult = await runProjectBlueprintTest({
        projectId,
        prompt,
      });

      return NextResponse.json({
        ok: true,
        action,
        project: await loadProjectBlueprintById(projectId),
        testResult,
      });
    }

    if (action === "run_agent") {
      const agentId = body.agentId?.trim();
      const prompt = body.prompt?.trim();
      const executionKey = body.executionKey?.trim();

      if (!agentId || !prompt || prompt.length < 8 || !executionKey) {
        return NextResponse.json(
          {
            ok: false,
            error: "Agent, prompt, and execution key are required before running a project agent.",
          },
          { status: 400 },
        );
      }

      const existingAgentRun = await loadProjectAgentRunByExecutionKey(executionKey);

      if (existingAgentRun) {
        return NextResponse.json({
          ok: true,
          action,
          project: await loadProjectBlueprintById(projectId),
          agentRun: existingAgentRun,
        });
      }

      const [workspaceServices, simulatedTransactions, pipelineRecords] = await Promise.all([
        getMockWorkspaceServices(),
        getSimulatedTransactions(),
        getMockPipelineRecords(),
      ]);
      const usageMetrics = await loadBusinessServiceUsageMetrics(project.businessId, {
        simulatedTransactions,
        pipelineRecords,
        createdBusiness,
        workspaceServices,
      });
      const payoutAccounting = await buildBusinessPayoutAccountingSummary(usageMetrics, {
        createdBusiness,
        workspaceServices,
      });
      const costLeaves = edenProjectAgentRunLeavesCost;

      if (payoutAccounting.availableForInternalUseCredits < costLeaves) {
        return NextResponse.json(
          {
            ok: false,
            error: "Insufficient earned Leaf’s available for this agent run.",
            insufficientBalance: true,
            previousAvailableCredits: payoutAccounting.availableForInternalUseCredits,
            nextAvailableCredits: payoutAccounting.availableForInternalUseCredits,
          },
          { status: 409 },
        );
      }

      const agentRunResult = await runProjectAgent({
        projectId: project.id,
        agentId,
        userId: session.user.id,
        prompt,
        executionKey,
        costLeaves,
      });

      if (!agentRunResult) {
        return NextResponse.json(
          {
            ok: false,
            error: "Eden could not run that project agent. Confirm the selected project and agent still exist.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        project: await loadProjectBlueprintById(projectId),
        agentRun: agentRunResult.agentRun,
        previousAvailableCredits: payoutAccounting.availableForInternalUseCredits,
        nextAvailableCredits: Math.max(
          payoutAccounting.availableForInternalUseCredits -
            (agentRunResult.recorded ? costLeaves : 0),
          0,
        ),
      });
    }

    if (action === "publish_project") {
      const publishResult = await publishProjectBlueprint(projectId);

      if (!publishResult) {
        return NextResponse.json(
          {
            ok: false,
            error: "The selected project no longer exists.",
          },
          { status: 404 },
        );
      }

      if (!publishResult.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: publishResult.error,
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        project: publishResult.project,
      });
    }

    if (action === "fund_hosting") {
      const amountLeaves = Math.round(
        body.amountLeaves ?? edenProjectHostingFundingIncrementLeaves,
      );

      if (amountLeaves <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "A positive Leaf’s amount is required to fund hosting.",
          },
          { status: 400 },
        );
      }

      const [workspaceServices, simulatedTransactions, pipelineRecords] = await Promise.all([
        getMockWorkspaceServices(),
        getSimulatedTransactions(),
        getMockPipelineRecords(),
      ]);
      const usageMetrics = await loadBusinessServiceUsageMetrics(project.businessId, {
        simulatedTransactions,
        pipelineRecords,
        createdBusiness,
        workspaceServices,
      });
      const payoutAccounting = await buildBusinessPayoutAccountingSummary(usageMetrics, {
        createdBusiness,
        workspaceServices,
      });

      if (payoutAccounting.availableForInternalUseCredits < amountLeaves) {
        return NextResponse.json(
          {
            ok: false,
            error: "Insufficient earned Leaf’s available for Eden use.",
            insufficientBalance: true,
            previousAvailableCredits: payoutAccounting.availableForInternalUseCredits,
            nextAvailableCredits: payoutAccounting.availableForInternalUseCredits,
          },
          { status: 409 },
        );
      }

      const usageResult = await recordInternalLeavesUsage({
        businessId: project.businessId,
        userId: session.user.id,
        amountCredits: amountLeaves,
        usageType: "project_hosting_fund",
        reference: `project-hosting-${project.id}`,
        notes: `Hosted ${project.title} inside Eden.`,
      });

      if (!usageResult.recorded) {
        return NextResponse.json(
          {
            ok: false,
            error: "Unable to record the hosting Leaf’s usage.",
          },
          { status: 500 },
        );
      }

      const fundedProject = await fundProjectHosting({
        projectId: project.id,
        amountLeaves,
      });

      return NextResponse.json({
        ok: true,
        action,
        project: fundedProject,
        previousAvailableCredits: payoutAccounting.availableForInternalUseCredits,
        nextAvailableCredits: Math.max(
          payoutAccounting.availableForInternalUseCredits - amountLeaves,
          0,
        ),
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported business project action.",
      },
      { status: 400 },
    );
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown project workspace error";
    console.error(`[eden][business-projects] ${detail}`);

    return NextResponse.json(
      {
        ok: false,
        error: "Eden could not complete that project action. Confirm the business workspace exists and try again.",
      },
      { status: 500 },
    );
  }
}

function canManageBusiness(
  session: Awaited<ReturnType<typeof getServerSession>>,
  businessId: string,
  createdBusiness: Awaited<ReturnType<typeof getMockCreatedBusiness>>,
) {
  if (session.role === "owner") {
    return true;
  }

  if (
    createdBusiness?.business.id === businessId &&
    createdBusiness.business.ownerUserId === session.user.id
  ) {
    return true;
  }

  const currentUser = getUserById(session.user.id);
  return currentUser?.businessIds.includes(businessId) ?? false;
}

import "server-only";

import { buildBusinessCreationHref } from "@/modules/eden-ai/router-urls";
import { classifyEdenAiPrompt } from "@/modules/eden-ai/intents";
import { createEdenAiToolRegistry, type EdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import { buildProjectArtifactFromPrompt } from "@/modules/eden-ai/tools/project-draft-shared";
import type {
  EdenAiAction,
  EdenAiActionOutcome,
  EdenAiActionRequest,
  EdenAiConfidence,
  EdenAiGroundingMode,
  EdenAiIdeaResult,
  EdenAiRequest,
  EdenAiRouteLane,
  EdenAiRouteResult,
} from "@/modules/eden-ai/types";

export async function routeEdenAiRequest(
  request: EdenAiRequest,
  context: EdenAiToolContext,
): Promise<EdenAiRouteResult> {
  const toolRegistry = createEdenAiToolRegistry(context);
  const intent = classifyEdenAiPrompt(request.prompt);
  const lanes = Array.from(new Set(intent.lanes));
  const toolsUsed = new Set<string>();
  const warnings: string[] = [];

  const services =
    lanes.includes("service_search") || lanes.includes("service_run_help")
      ? await runTool("searchPublishedServices", toolRegistry.searchPublishedServices, toolsUsed, {
          prompt: request.prompt,
          limit: 3,
        })
      : { groundingMode: "simulated" as EdenAiGroundingMode, warnings: [], results: [] };
  warnings.push(...services.warnings);

  const businesses = lanes.includes("business_discovery")
    ? await runTool("searchBusinesses", toolRegistry.searchBusinesses, toolsUsed, {
        prompt: request.prompt,
        limit: 3,
      })
    : { groundingMode: "simulated" as EdenAiGroundingMode, warnings: [], results: [] };
  warnings.push(...businesses.warnings);

  const wallet =
    lanes.includes("wallet_help") || lanes.includes("service_run_help")
      ? await runTool("inspectWallet", toolRegistry.inspectWallet, toolsUsed)
      : null;

  const platformStatus = lanes.includes("platform_status")
    ? await runTool("getPlatformStatus", toolRegistry.getPlatformStatus, toolsUsed)
    : null;

  let projectArtifact =
    lanes.includes("project_build") || lanes.includes("idea_generation")
      ? buildProjectArtifactFromPrompt({
          prompt: request.prompt,
          groundingMode: context.activeBusinessId ? "proposed" : "proposed",
          businessId: context.activeBusinessId,
          created: false,
        })
      : null;

  let actionOutcome: EdenAiActionOutcome | undefined;

  if (request.requestedAction) {
    const actionResult = await handleRequestedAction(
      request.requestedAction,
      request,
      context,
      toolRegistry,
      toolsUsed,
      projectArtifact,
    );
    warnings.push(...actionResult.warnings);
    actionOutcome = actionResult.actionOutcome;
    if (actionResult.projectArtifact) {
      projectArtifact = actionResult.projectArtifact;
    }
  }

  const ideas = buildIdeaResults(projectArtifact, context);
  const nextActions = buildNextActions({
    lanes,
    request,
    context,
    services: services.results,
    businesses: businesses.results,
    walletAvailable: Boolean(wallet),
    projectArtifact,
  });
  const groundingMode = resolveOverallGroundingMode({
    services: services.results,
    serviceGroundingMode: services.groundingMode,
    businesses: businesses.results,
    businessGroundingMode: businesses.groundingMode,
    walletGroundingMode: wallet?.groundingMode ?? null,
    projectGroundingMode: projectArtifact?.groundingMode ?? null,
    platformGroundingMode: platformStatus?.groundingMode ?? null,
    actionOutcome,
  });

  return {
    lanes,
    confidence: intent.confidence,
    groundingMode,
    summary: buildSummary({
      lanes,
      confidence: intent.confidence,
      services: services.results,
      businesses: businesses.results,
      wallet,
      projectArtifact,
      platformStatus,
      actionOutcome,
    }),
    results: {
      services: services.results,
      businesses: businesses.results,
      ideas,
      wallet,
      project: projectArtifact,
      platformStatus,
    },
    nextActions,
    warnings: Array.from(new Set(warnings)).slice(0, 6),
    actionOutcome,
    trace: {
      signals: intent.signals,
      tools: Array.from(toolsUsed),
    },
  };
}

type EdenRequestedActionResult = {
  actionOutcome?: EdenAiActionOutcome;
  warnings: string[];
  projectArtifact?: ReturnType<typeof buildProjectArtifactFromPrompt> | null;
};

async function handleRequestedAction(
  action: EdenAiActionRequest,
  request: EdenAiRequest,
  context: EdenAiToolContext,
  toolRegistry: ReturnType<typeof createEdenAiToolRegistry>,
  toolsUsed: Set<string>,
  projectArtifact: ReturnType<typeof buildProjectArtifactFromPrompt> | null,
): Promise<EdenRequestedActionResult> {
  if (action.type === "inspect_wallet") {
    await runTool("inspectWallet", toolRegistry.inspectWallet, toolsUsed);
    return {
      actionOutcome: {
        type: action.type,
        status: "completed",
        message: `You currently have ${context.currentBalanceCredits.toLocaleString()} Eden Leaf’s available to spend.`,
      },
      warnings: [],
      projectArtifact,
    };
  }

  if (action.type === "create_project") {
    const createdProject = await runTool(
      "createProjectBlueprint",
      toolRegistry.createProjectBlueprint,
      toolsUsed,
      {
        prompt: request.prompt,
        businessId:
          asOptionalString(action.payload?.businessId) ?? request.selectedContext?.businessId ?? null,
      },
    );

    return {
      actionOutcome: {
        type: action.type,
        status: createdProject.created ? "completed" : "blocked",
        message: createdProject.created
          ? `${createdProject.project.title} is now staged in the Business workspace.`
          : createdProject.warnings[0] ?? "A innovator workspace is required before Eden can create this project.",
      },
      warnings: createdProject.warnings,
      projectArtifact: createdProject.project,
    };
  }

  if (action.type === "create_agent") {
    const createdAgent = await runTool(
      "createProjectAgent",
      toolRegistry.createProjectAgent,
      toolsUsed,
      {
        projectId: asRequiredString(action.payload?.projectId) ?? action.targetId ?? request.selectedContext?.projectId ?? "",
        name: asRequiredString(action.payload?.name) ?? "Project Operator",
        roleTitle: asRequiredString(action.payload?.roleTitle) ?? "General Agent",
        instructions:
          asRequiredString(action.payload?.instructions) ??
          "Break the project into one controlled next step inside Eden.",
        parentAgentId: asOptionalString(action.payload?.parentAgentId),
        branchLabel: asOptionalString(action.payload?.branchLabel),
      },
    );

    return {
      actionOutcome: {
        type: action.type,
        status: createdAgent.created ? "completed" : "blocked",
        message: createdAgent.created
          ? `${createdAgent.agent?.name ?? "Agent"} is now attached to the selected project.`
          : createdAgent.warnings[0] ?? "Eden could not create that agent.",
      },
      warnings: createdAgent.warnings,
      projectArtifact,
    };
  }

  if (action.type === "run_agent") {
    const agentRun = await runTool(
      "runProjectAgent",
      toolRegistry.runProjectAgent,
      toolsUsed,
      {
        projectId: asRequiredString(action.payload?.projectId) ?? request.selectedContext?.projectId ?? "",
        agentId: asRequiredString(action.payload?.agentId) ?? action.targetId ?? request.selectedContext?.agentId ?? "",
        prompt: asRequiredString(action.payload?.prompt) ?? request.prompt,
        executionKey: asOptionalString(action.payload?.executionKey),
      },
    );

    return {
      actionOutcome: {
        type: action.type,
        status: agentRun.ran ? "completed" : "blocked",
        message: agentRun.ran
          ? `${agentRun.agentRun?.outputTitle ?? "Agent run"} completed inside the Business workspace.`
          : agentRun.warnings[0] ?? "Eden could not run that project agent.",
      },
      warnings: agentRun.warnings,
      projectArtifact,
    };
  }

  return {
    actionOutcome: {
      type: action.type,
      status: "blocked",
      message: "That Ask Eden action is not wired to a live tool yet.",
    },
    warnings: [],
    projectArtifact,
  };
}

function buildIdeaResults(
  projectArtifact: ReturnType<typeof buildProjectArtifactFromPrompt> | null,
  context: EdenAiToolContext,
): EdenAiIdeaResult[] {
  if (!projectArtifact) {
    return [];
  }

  return [
    {
      kind: "idea",
      id: projectArtifact.id,
      title: projectArtifact.title,
      description: projectArtifact.description,
      groundingMode: projectArtifact.groundingMode,
      projectArtifact,
      actionLabel: canCreateProject(context) ? "Create Project" : "Start Building",
    },
  ];
}

function buildNextActions(input: {
  lanes: EdenAiRouteLane[];
  request: EdenAiRequest;
  context: EdenAiToolContext;
  services: EdenAiRouteResult["results"]["services"];
  businesses: EdenAiRouteResult["results"]["businesses"];
  walletAvailable: boolean;
  projectArtifact: EdenAiRouteResult["results"]["project"];
}): EdenAiAction[] {
  const actions: EdenAiAction[] = [];

  if (input.services[0]) {
    actions.push({
      type: "open_service",
      label: "Open Service",
      description: "Open the top published service match and review the visible price before you run it.",
      groundingMode: input.services[0].groundingMode,
      enabled: true,
      href: `/services/${input.services[0].id}`,
      targetId: input.services[0].id,
    });
  }

  if (input.businesses[0]) {
    actions.push({
      type: "open_business",
      label: "Open Business",
      description: "Inspect the matched business profile and what it currently publishes inside Eden.",
      groundingMode: input.businesses[0].groundingMode,
      enabled: true,
      href: `/businesses/${input.businesses[0].id}`,
      targetId: input.businesses[0].id,
    });
  }

  if (input.walletAvailable) {
    actions.push({
      type: "inspect_wallet",
      label: "Inspect Wallet",
      description: "Review your current spendable Eden Leaf’s balance and the latest wallet events.",
      groundingMode: "live",
      enabled: true,
    });
  }

  if (input.projectArtifact) {
    if (canCreateProject(input.context)) {
      actions.push({
        type: "create_project",
        label: input.projectArtifact.created ? "Project Created" : "Create Project",
        description: input.projectArtifact.created
          ? "This Ask Eden prompt has already been staged into the Business workspace."
          : "Stage this prompt into the Business workspace and create the first project agents.",
        groundingMode: input.projectArtifact.created ? "live" : "proposed",
        enabled: !input.projectArtifact.created,
        targetId: input.projectArtifact.projectId ?? undefined,
        payload: {
          businessId: input.projectArtifact.businessId ?? input.context.activeBusinessId,
        },
      });
    } else {
      actions.push({
        type: "start_build",
        label: "Start Building",
        description: "Open the innovator flow and stage this idea in a workspace that can create projects.",
        groundingMode: "proposed",
        enabled: true,
        href: buildBusinessCreationHref(input.projectArtifact),
      });
    }
  }

  return actions;
}

function buildSummary(input: {
  lanes: EdenAiRouteLane[];
  confidence: EdenAiConfidence;
  services: EdenAiRouteResult["results"]["services"];
  businesses: EdenAiRouteResult["results"]["businesses"];
  wallet: EdenAiRouteResult["results"]["wallet"];
  projectArtifact: EdenAiRouteResult["results"]["project"];
  platformStatus: EdenAiRouteResult["results"]["platformStatus"];
  actionOutcome?: EdenAiActionOutcome;
}) {
  if (input.actionOutcome?.status === "completed") {
    return input.actionOutcome.message;
  }

  if (input.wallet) {
    return `You currently have ${input.wallet.balanceLabel}. Eden can use that live wallet state to guide the next discovery step.`;
  }

  if (input.services.length > 0) {
    return `Eden found ${input.services.length} published service matches and kept the next step tied to visible pricing and the current wallet flow.`;
  }

  if (input.businesses.length > 0) {
    return `Eden matched ${input.businesses.length} businesses that currently publish into the marketplace.`;
  }

  if (input.projectArtifact) {
    return input.projectArtifact.created
      ? `${input.projectArtifact.title} is now staged in the Business workspace.`
      : `Eden mapped this prompt into a project-build path and staged the first agent structure as a proposal.`;
  }

  if (input.platformStatus) {
    return input.platformStatus.summary;
  }

  return input.confidence === "low"
    ? "Eden could not confidently classify that request, so it stayed inside the safest discovery lane."
    : "Eden routed the prompt and prepared the next platform action.";
}

function resolveOverallGroundingMode(input: {
  services: EdenAiRouteResult["results"]["services"];
  serviceGroundingMode: EdenAiGroundingMode;
  businesses: EdenAiRouteResult["results"]["businesses"];
  businessGroundingMode: EdenAiGroundingMode;
  walletGroundingMode: EdenAiGroundingMode | null;
  projectGroundingMode: EdenAiGroundingMode | null;
  platformGroundingMode: EdenAiGroundingMode | null;
  actionOutcome?: EdenAiActionOutcome;
}) {
  if (input.actionOutcome?.status === "completed") {
    return "live" satisfies EdenAiGroundingMode;
  }

  if (input.projectGroundingMode === "proposed") {
    return "proposed" satisfies EdenAiGroundingMode;
  }

  if (input.walletGroundingMode === "live" || input.platformGroundingMode === "live") {
    return "live" satisfies EdenAiGroundingMode;
  }

  if (input.services.length > 0) {
    return input.serviceGroundingMode;
  }

  if (input.businesses.length > 0) {
    return input.businessGroundingMode;
  }

  return "simulated" satisfies EdenAiGroundingMode;
}

async function runTool<TInput, TResult>(
  toolName: string,
  tool: (input: TInput) => Promise<TResult>,
  toolsUsed: Set<string>,
  input: TInput,
): Promise<TResult>;
async function runTool<TResult>(
  toolName: string,
  tool: () => Promise<TResult>,
  toolsUsed: Set<string>,
): Promise<TResult>;
async function runTool<TInput, TResult>(
  toolName: string,
  tool: ((input: TInput) => Promise<TResult>) | (() => Promise<TResult>),
  toolsUsed: Set<string>,
  input?: TInput,
) {
  toolsUsed.add(toolName);
  if (typeof input === "undefined") {
    return (tool as () => Promise<TResult>)();
  }

  return (tool as (value: TInput) => Promise<TResult>)(input);
}

function canCreateProject(context: EdenAiToolContext) {
  return context.session.role === "owner" || Boolean(context.activeBusinessId);
}

function asOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asRequiredString(value: unknown) {
  return asOptionalString(value);
}

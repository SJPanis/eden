"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  edenProjectAgentRunLeavesCost,
  edenProjectHostingFundingIncrementLeaves,
  type EdenProjectAgentRunRecord,
  type EdenProjectBlueprintRecord,
} from "@/modules/core/projects/project-blueprint-shared";
import { formatCredits } from "@/modules/core/mock-data";

type EdenProjectTestResult = {
  projectId: string;
  outputTitle: string;
  outputSummary: string;
  outputLines: string[];
};

type ProjectBlueprintPanelProps = {
  businessId: string;
  businessName: string;
  initialProjects: EdenProjectBlueprintRecord[];
  availableForInternalUseCredits: number;
};

function getProjectStatusClasses(status: EdenProjectBlueprintRecord["status"]) {
  if (status === "published") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "testing") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (status === "inactive") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getReadinessLabel(project: EdenProjectBlueprintRecord | null) {
  if (!project) {
    return "Select a project";
  }

  if (project.isActive) {
    return "Consumer-facing ready";
  }

  if (project.isPublished) {
    return "Needs hosting refill";
  }

  if (project.status === "testing") {
    return "Testing inside Eden";
  }

  return "Builder draft";
}

function upsertProject(
  projects: EdenProjectBlueprintRecord[],
  nextProject: EdenProjectBlueprintRecord,
) {
  const existingIndex = projects.findIndex((project) => project.id === nextProject.id);

  if (existingIndex === -1) {
    return [nextProject, ...projects];
  }

  return projects.map((project) => (project.id === nextProject.id ? nextProject : project));
}

export function ProjectBlueprintPanel({
  businessId,
  businessName,
  initialProjects,
  availableForInternalUseCredits,
}: ProjectBlueprintPanelProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [currentAvailableForInternalUseCredits, setCurrentAvailableForInternalUseCredits] =
    useState(availableForInternalUseCredits);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjects[0]?.id ?? null,
  );
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createGoal, setCreateGoal] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentRoleTitle, setAgentRoleTitle] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [agentParentId, setAgentParentId] = useState("");
  const [agentBranchLabel, setAgentBranchLabel] = useState("");
  const [agentRunAgentId, setAgentRunAgentId] = useState("");
  const [agentRunPrompt, setAgentRunPrompt] = useState("");
  const [agentRunResult, setAgentRunResult] = useState<EdenProjectAgentRunRecord | null>(null);
  const [testPrompt, setTestPrompt] = useState("");
  const [testResult, setTestResult] = useState<EdenProjectTestResult | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
    setCurrentAvailableForInternalUseCredits(availableForInternalUseCredits);
    setSelectedProjectId((current) =>
      current && initialProjects.some((project) => project.id === current)
        ? current
        : initialProjects[0]?.id ?? null,
    );
  }, [availableForInternalUseCredits, initialProjects]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const publishedCount = useMemo(
    () => projects.filter((project) => project.status === "published").length,
    [projects],
  );
  const testingCount = useMemo(
    () => projects.filter((project) => project.status === "testing").length,
    [projects],
  );
  const hostingBalanceTotal = useMemo(
    () => projects.reduce((sum, project) => sum + project.hostingRemainingLeaves, 0),
    [projects],
  );

  useEffect(() => {
    setAgentRunAgentId((current) => {
      if (!selectedProject?.agents.length) {
        return "";
      }

      return current && selectedProject.agents.some((agent) => agent.id === current)
        ? current
        : selectedProject.agents[0]?.id ?? "";
    });
    setAgentRunResult((current) =>
      current && selectedProject && current.projectId === selectedProject.id ? current : null,
    );
  }, [selectedProject]);

  async function postProjectAction(
    payload: Record<string, unknown>,
    actionLabel: string,
  ) {
    setPendingAction(actionLabel);
    setFeedback(null);

    try {
      const response = await fetch("/api/business/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        action?: string;
        project?: EdenProjectBlueprintRecord;
        projects?: EdenProjectBlueprintRecord[];
        testResult?: EdenProjectTestResult;
        agentRun?: EdenProjectAgentRunRecord;
        previousAvailableCredits?: number;
        nextAvailableCredits?: number;
      };

      if (!response.ok || !result.ok) {
        setFeedback({
          tone: "error",
          text: result.error ?? "Eden could not complete that project action.",
        });
        return false;
      }

      if (Array.isArray(result.projects)) {
        setProjects(result.projects);
      }

      if (result.project) {
        setProjects((current) => upsertProject(current, result.project!));
        setSelectedProjectId(result.project.id);
      }

      if (result.testResult) {
        setTestResult(result.testResult);
      }

      if (result.agentRun) {
        setAgentRunResult(result.agentRun);
      }

      if (typeof result.nextAvailableCredits === "number") {
        setCurrentAvailableForInternalUseCredits(result.nextAvailableCredits);
      }

      setFeedback({
        tone: "success",
        text:
          result.action === "fund_hosting"
            ? `Hosting funded. ${
                typeof result.nextAvailableCredits === "number"
                  ? `${formatCredits(result.nextAvailableCredits)} earned Leaf’s remain available for Eden use.`
                  : "The project hosting bank has been topped up."
              }`
            : result.action === "run_agent"
              ? `Agent run completed. ${
                  typeof result.nextAvailableCredits === "number"
                    ? `${formatCredits(result.nextAvailableCredits)} earned Leaf’s remain available for Eden use.`
                    : "The output is now attached to the project workspace."
                }`
            : result.action === "publish_project"
              ? "Project published and active inside Eden."
              : result.action === "run_test"
                ? "Project test completed."
                : result.action === "create_agent"
                  ? "Agent added to the project tree."
                  : "Project updated.",
      });
      router.refresh();
      return true;
    } catch {
      setFeedback({
        tone: "error",
        text: "Eden could not complete that project action.",
      });
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateProject() {
    if (!createTitle.trim() || !createDescription.trim() || !createGoal.trim()) {
      setFeedback({
        tone: "error",
        text: "Title, description, and goal are required before creating a project.",
      });
      return;
    }

    const created = await postProjectAction(
      {
        action: "create_project",
        businessId,
        title: createTitle.trim(),
        description: createDescription.trim(),
        goal: createGoal.trim(),
      },
      "create_project",
    );

    if (created) {
      setCreateTitle("");
      setCreateDescription("");
      setCreateGoal("");
    }
  }

  async function handleCreateAgent() {
    if (!selectedProject) {
      return;
    }

    if (!agentName.trim() || !agentRoleTitle.trim() || !agentInstructions.trim()) {
      setFeedback({
        tone: "error",
        text: "Agent name, role, and instructions are required before adding an agent.",
      });
      return;
    }

    const created = await postProjectAction(
      {
        action: "create_agent",
        projectId: selectedProject.id,
        name: agentName.trim(),
        roleTitle: agentRoleTitle.trim(),
        instructions: agentInstructions.trim(),
        parentAgentId: agentParentId || undefined,
        branchLabel: agentBranchLabel.trim() || undefined,
      },
      "create_agent",
    );

    if (created) {
      setAgentName("");
      setAgentRoleTitle("");
      setAgentInstructions("");
      setAgentParentId("");
      setAgentBranchLabel("");
    }
  }

  async function handleRunTest() {
    if (!selectedProject) {
      return;
    }

    await postProjectAction(
      {
        action: "run_test",
        projectId: selectedProject.id,
        prompt: testPrompt.trim(),
      },
      "run_test",
    );
  }

  async function handleRunAgent() {
    if (!selectedProject) {
      return;
    }

    if (!agentRunAgentId || !agentRunPrompt.trim() || agentRunPrompt.trim().length < 8) {
      setFeedback({
        tone: "error",
        text: "Select an agent and enter at least 8 characters before running it.",
      });
      return;
    }

    await postProjectAction(
      {
        action: "run_agent",
        projectId: selectedProject.id,
        agentId: agentRunAgentId,
        prompt: agentRunPrompt.trim(),
        executionKey: crypto.randomUUID(),
      },
      "run_agent",
    );
  }

  async function handlePublish() {
    if (!selectedProject) {
      return;
    }

    await postProjectAction(
      {
        action: "publish_project",
        projectId: selectedProject.id,
      },
      "publish_project",
    );
  }

  async function handleFundHosting() {
    if (!selectedProject) {
      return;
    }

    await postProjectAction(
      {
        action: "fund_hosting",
        projectId: selectedProject.id,
        amountLeaves: edenProjectHostingFundingIncrementLeaves,
      },
      "fund_hosting",
    );
  }

  const fundHostingDisabled =
    pendingAction !== null ||
    currentAvailableForInternalUseCredits < edenProjectHostingFundingIncrementLeaves;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Blueprints</p>
          <p className="mt-2 text-lg font-semibold text-white">{projects.length}</p>
          <p className="mt-1 text-xs text-white/50">Persistent project records for {businessName}.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Testing now</p>
          <p className="mt-2 text-lg font-semibold text-white">{testingCount}</p>
          <p className="mt-1 text-xs text-white/50">Projects currently inside Eden test mode.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Published active</p>
          <p className="mt-2 text-lg font-semibold text-white">{publishedCount}</p>
          <p className="mt-1 text-xs text-white/50">Projects currently visible as active launches.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Hosting bank</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatCredits(hostingBalanceTotal)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Shared remaining hosting Leaf’s across this business.
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/25 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Create project blueprint
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Define the project side first: what the business is trying to launch, who it serves, and what success looks like.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="Project title"
                className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
              />
              <textarea
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="Short project description"
                rows={3}
                className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
              />
              <textarea
                value={createGoal}
                onChange={(event) => setCreateGoal(event.target.value)}
                placeholder="Goal for this project"
                rows={3}
                className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
              />
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={handleCreateProject}
                className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pendingAction === "create_project" ? "Creating project..." : "Create project"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Existing projects
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Persistent blueprint records for this business. Select one to build agents, test, and publish.
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                {projects.length} total
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {projects.length ? (
                projects.map((project) => {
                  const isSelected = project.id === selectedProject?.id;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setTestResult(null);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[#14989a]/50 bg-white/[0.05]"
                          : "border-white/8 bg-white/[0.04]/50 hover:border-[#14989a]/50 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{project.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                            {project.creatorLabel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getProjectStatusClasses(
                            project.status,
                          )}`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/50">{project.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
                          Hosting {formatCredits(project.hostingRemainingLeaves)}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
                          {project.agents.length} agent{project.agents.length === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
                          {getReadinessLabel(project)}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
                  No business blueprints exist yet. Create the first project above to start the project side of the workspace.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Project launch state
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedProject?.title ?? "Select a project"}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {selectedProject?.goal ??
                    "Choose a project blueprint to see its launch state, hosting bank, and agent foundation."}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                  selectedProject
                    ? getProjectStatusClasses(selectedProject.status)
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }`}
              >
                {selectedProject ? getReadinessLabel(selectedProject) : "Awaiting selection"}
              </span>
            </div>
            {selectedProject ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Publish state</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {selectedProject.isPublished ? "Published and available" : "Not published"}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {selectedProject.publishedAtLabel ?? "Still inside the builder test loop."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">Hosting bank</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatCredits(selectedProject.hostingRemainingLeaves)}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {selectedProject.hostingDaysRemaining} days remaining at the current MVP hosting rate.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={pendingAction !== null || selectedProject.isActive}
                    onClick={handlePublish}
                    className="rounded-full border border-[#14989a]/50 bg-[#14989a]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14989a]/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "publish_project"
                      ? "Publishing..."
                      : selectedProject.isActive
                        ? "Published and active"
                        : "Publish project"}
                  </button>
                  <button
                    type="button"
                    disabled={fundHostingDisabled}
                    onClick={handleFundHosting}
                    className="rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "fund_hosting"
                      ? "Funding hosting..."
                      : `Fund hosting with ${formatCredits(
                          edenProjectHostingFundingIncrementLeaves,
                        )}`}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/50">
                  Hosting is funded from earned Leaf’s only. This does not use the spendable wallet and does not create an external payout.
                </p>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Agent tree foundation
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Build the first simple team tree for the selected project. This is a stored agent structure only, not a full autonomous orchestration layer.
            </p>
            {selectedProject ? (
              <>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                    placeholder="Agent name"
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  />
                  <input
                    type="text"
                    value={agentRoleTitle}
                    onChange={(event) => setAgentRoleTitle(event.target.value)}
                    placeholder="Role or title"
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  />
                  <textarea
                    value={agentInstructions}
                    onChange={(event) => setAgentInstructions(event.target.value)}
                    placeholder="Core instructions for this agent"
                    rows={3}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={agentParentId}
                      onChange={(event) => setAgentParentId(event.target.value)}
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                    >
                      <option value="">No parent agent</option>
                      {selectedProject.agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={agentBranchLabel}
                      onChange={(event) => setAgentBranchLabel(event.target.value)}
                      placeholder="Branch or team label"
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={handleCreateAgent}
                    className="rounded-full border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "create_agent" ? "Adding agent..." : "Add agent"}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedProject.agents.length ? (
                    selectedProject.agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.04] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{agent.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {agent.roleTitle}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {agent.parentAgentId ? (
                              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                Child agent
                              </span>
                            ) : null}
                            {agent.branchLabel ? (
                              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                                {agent.branchLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/50">{agent.instructions}</p>
                        <p className="mt-2 text-xs text-white/50">{agent.createdAtLabel}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
                      No agents have been defined yet. Add the first agent to establish the project team tree.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
                Select a project before defining agents.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Runnable project agent
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Run one agent inside Eden using the current project context. This is a controlled execution pass funded from earned Leaf’s available for Eden use.
            </p>
            {selectedProject ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <select
                    value={agentRunAgentId}
                    onChange={(event) => setAgentRunAgentId(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                  >
                    {selectedProject.agents.length ? null : (
                      <option value="">No project agents available</option>
                    )}
                    {selectedProject.agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} Â· {agent.roleTitle}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-white/50">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Agent run cost
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {formatCredits(edenProjectAgentRunLeavesCost)}
                    </p>
                    <p className="mt-1 text-xs">
                      {formatCredits(currentAvailableForInternalUseCredits)} earned Leaf’s remain available for Eden use.
                    </p>
                  </div>
                </div>
                <textarea
                  value={agentRunPrompt}
                  onChange={(event) => setAgentRunPrompt(event.target.value)}
                  placeholder="Describe what this agent should do for the project right now"
                  rows={4}
                  className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-white/50">
                    This does not touch the consumer wallet. It records a visible internal Leaf’s use event against builder earnings.
                  </p>
                  <button
                    type="button"
                    disabled={
                      pendingAction !== null ||
                      !selectedProject.agents.length ||
                      currentAvailableForInternalUseCredits < edenProjectAgentRunLeavesCost
                    }
                    onClick={handleRunAgent}
                    className="rounded-full border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "run_agent"
                      ? "Running agent..."
                      : `Run agent for ${formatCredits(edenProjectAgentRunLeavesCost)}`}
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  {agentRunResult && selectedProject.id === agentRunResult.projectId ? (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {agentRunResult.outputTitle}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                            {agentRunResult.agentName} Â· {agentRunResult.agentRoleTitle}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                          {formatCredits(agentRunResult.costLeaves)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/50">
                        {agentRunResult.outputSummary}
                      </p>
                      <div className="mt-3 space-y-2">
                        {agentRunResult.outputLines.map((line) => (
                          <div
                            key={line}
                            className="rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white/50"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm leading-6 text-white/50">
                      Agent output will appear here after the selected project agent completes a controlled Eden run.
                    </p>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                      Recent agent runs
                    </p>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                      {selectedProject.agentRuns.length} stored
                    </span>
                  </div>
                  {selectedProject.agentRuns.length ? (
                    selectedProject.agentRuns.map((run) => (
                      <div
                        key={run.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.06] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {run.agentName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                              {run.agentRoleTitle}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                              {formatCredits(run.costLeaves)}
                            </p>
                            <p className="mt-1 text-[11px] text-white/50">
                              {run.createdAtLabel}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/50">
                          {run.outputSummary}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
                      No agent runs have been recorded yet for this project.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-6 text-white/50">
                Select a project before running a project agent.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Controlled test window
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Run a minimal Eden-side project test before publishing. This output is explicit and controlled for the MVP.
            </p>
            {selectedProject ? (
              <>
                <textarea
                  value={testPrompt}
                  onChange={(event) => setTestPrompt(event.target.value)}
                  placeholder="Describe the scenario you want to test"
                  rows={4}
                  className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04]/40 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#14989a]/50"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-white/50">
                    Current affordability for hosting: {formatCredits(currentAvailableForInternalUseCredits)} earned Leaf’s available for Eden use.
                  </p>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={handleRunTest}
                    className="rounded-full border border-white/8 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "run_test" ? "Running test..." : "Run controlled test"}
                  </button>
                </div>
              </>
            ) : null}

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              {testResult && selectedProject && testResult.projectId === selectedProject.id ? (
                <>
                  <p className="text-sm font-semibold text-white">{testResult.outputTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">{testResult.outputSummary}</p>
                  <div className="mt-3 space-y-2">
                    {testResult.outputLines.map((line) => (
                      <div
                        key={line}
                        className="rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2 text-sm text-white/50"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm leading-6 text-white/50">
                  Test output will appear here after the selected project runs a controlled Eden test pass.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

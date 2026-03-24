/**
 * Eden Autonomy Boundary
 *
 * Defines environment scope classification (PRIVATE_DEV vs PUBLIC_PROD)
 * and what a control agent may do automatically in each scope.
 *
 * Canonical spec: eden-system/specs/EDEN_AUTONOMY_BOUNDARY.md
 */

export type EdenEnvironmentScope = "PRIVATE_DEV" | "PUBLIC_PROD";

export type EdenAutonomyStage = "A" | "B";

export type EdenDbActionRiskLevel = "low" | "medium" | "high" | "destructive";

export type EdenDbActionKey =
  | "read_any_table"
  | "write_sandbox_task"
  | "write_task_audit_log"
  | "write_agent_run"
  | "write_dispatch_session"
  | "update_runtime_lifecycle"
  | "update_launch_intent"
  | "update_secret_boundary_status"
  | "update_provider_approval"
  | "update_runtime_config"
  | "register_sandbox_runtime"
  | "generate_migration_file"
  | "apply_migration"
  | "drop_or_reset_db"
  | "modify_migration_chain"
  | "write_billing_payment"
  | "write_business_service";

export type EdenDbActionPolicy = {
  action: EdenDbActionKey;
  riskLevel: EdenDbActionRiskLevel;
  allowedInPrivateDev: boolean;
  allowedInPublicProd: boolean;
  requiresOwnerAcknowledgement: boolean;
  label: string;
  rationale: string;
};

/** The public domain for Eden production. Never treated as PRIVATE_DEV. */
export const EDEN_PUBLIC_DOMAIN = "edencloud.app";

/**
 * Resolve the active environment scope from environment variables.
 *
 * Priority order:
 * 1. EDEN_ENVIRONMENT_SCOPE env var (explicit override)
 * 2. NODE_ENV: "development" → PRIVATE_DEV, "production" → PUBLIC_PROD
 * 3. Unknown → PRIVATE_DEV (conservative default for unknown local envs)
 */
export function resolveEnvironmentScope(): EdenEnvironmentScope {
  const explicit = process.env.EDEN_ENVIRONMENT_SCOPE;
  if (explicit === "PUBLIC_PROD") return "PUBLIC_PROD";
  if (explicit === "PRIVATE_DEV") return "PRIVATE_DEV";

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") return "PUBLIC_PROD";

  return "PRIVATE_DEV";
}

/** Map an environment scope to its autonomy stage label. */
export function resolveAutonomyStage(scope: EdenEnvironmentScope): EdenAutonomyStage {
  return scope === "PRIVATE_DEV" ? "A" : "B";
}

/** The full DB action policy table. */
export const edenDbActionPolicies: EdenDbActionPolicy[] = [
  {
    action: "read_any_table",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: true,
    requiresOwnerAcknowledgement: false,
    label: "Read any table",
    rationale: "Read-only. No data mutation risk.",
  },
  {
    action: "write_sandbox_task",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Write sandbox task",
    rationale: "Owner-only internal sandbox. No public impact.",
  },
  {
    action: "write_task_audit_log",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Write task audit log",
    rationale: "Immutable append-only audit record. No destructive effect.",
  },
  {
    action: "write_agent_run",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Write agent run record",
    rationale: "Control-plane metadata. Owner-only scope.",
  },
  {
    action: "write_dispatch_session",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Write dispatch and session records",
    rationale: "Governed execution boundary metadata. Owner-only scope.",
  },
  {
    action: "update_runtime_lifecycle",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Update runtime lifecycle metadata",
    rationale: "Status/health metadata only. No container or deploy action.",
  },
  {
    action: "update_launch_intent",
    riskLevel: "low",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Update launch intent and deployment history",
    rationale: "Metadata only. No provisioning or domain activation.",
  },
  {
    action: "update_secret_boundary_status",
    riskLevel: "medium",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Update secret boundary status",
    rationale: "Status metadata only. No raw secrets stored or read.",
  },
  {
    action: "update_provider_approval",
    riskLevel: "medium",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Update provider approval gates",
    rationale: "Governs which providers can execute. Scoped to owner sandbox.",
  },
  {
    action: "update_runtime_config",
    riskLevel: "medium",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Update runtime config policy",
    rationale: "Config metadata only. No live runtime action.",
  },
  {
    action: "register_sandbox_runtime",
    riskLevel: "medium",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Register internal sandbox runtime",
    rationale: "Creates owner-only sandbox record. Idempotent.",
  },
  {
    action: "generate_migration_file",
    riskLevel: "medium",
    allowedInPrivateDev: true,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: false,
    label: "Generate additive migration file",
    rationale: "File write only. Does not apply to any database.",
  },
  {
    action: "apply_migration",
    riskLevel: "high",
    allowedInPrivateDev: false,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: true,
    label: "Apply Prisma migration (deploy/resolve)",
    rationale: "Irreversible schema change. Requires human verification.",
  },
  {
    action: "drop_or_reset_db",
    riskLevel: "destructive",
    allowedInPrivateDev: false,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: true,
    label: "Drop table or reset database",
    rationale: "Irreversible data loss. Always human-gated.",
  },
  {
    action: "modify_migration_chain",
    riskLevel: "destructive",
    allowedInPrivateDev: false,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: true,
    label: "Modify existing migration SQL",
    rationale: "Breaks migration history integrity. Always human-gated.",
  },
  {
    action: "write_billing_payment",
    riskLevel: "high",
    allowedInPrivateDev: false,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: true,
    label: "Write billing or payment records",
    rationale: "Financial data. No autonomous writes ever.",
  },
  {
    action: "write_business_service",
    riskLevel: "high",
    allowedInPrivateDev: false,
    allowedInPublicProd: false,
    requiresOwnerAcknowledgement: true,
    label: "Write business or service records",
    rationale: "Tenant data. Only the sandbox-scoped internal business is allowed automatically.",
  },
];

/**
 * Check whether a DB action is allowed for a given environment scope.
 * Returns a structured result so callers can present honest reasons.
 */
export function checkDbActionAllowed(
  action: EdenDbActionKey,
  scope: EdenEnvironmentScope,
): { allowed: boolean; requiresOwnerAcknowledgement: boolean; reason: string } {
  const policy = edenDbActionPolicies.find((p) => p.action === action);

  if (!policy) {
    return {
      allowed: false,
      requiresOwnerAcknowledgement: true,
      reason: `No policy defined for action "${action}". Blocked by default.`,
    };
  }

  if (policy.requiresOwnerAcknowledgement) {
    return {
      allowed: false,
      requiresOwnerAcknowledgement: true,
      reason: `"${policy.label}" always requires explicit owner acknowledgement regardless of environment scope.`,
    };
  }

  const allowedInScope =
    scope === "PRIVATE_DEV" ? policy.allowedInPrivateDev : policy.allowedInPublicProd;

  if (!allowedInScope) {
    return {
      allowed: false,
      requiresOwnerAcknowledgement: false,
      reason: `"${policy.label}" is not allowed in ${scope} scope. ${policy.rationale}`,
    };
  }

  return {
    allowed: true,
    requiresOwnerAcknowledgement: false,
    reason: `"${policy.label}" is allowed automatically in ${scope} scope. ${policy.rationale}`,
  };
}

export type EdenAutonomyModeState = {
  environmentScope: EdenEnvironmentScope;
  autonomyStage: EdenAutonomyStage;
  stageLabel: string;
  scopeLabel: string;
  scopeDescription: string;
  allowsAutoExecution: boolean;
  allowsProviderExecution: boolean;
  publicProdIsGated: boolean;
  currentBlockers: string[];
  autoAllowedActions: string[];
  blockedActions: string[];
  humanRequiredActions: string[];
};

/**
 * Build the full autonomy mode state for display in the owner control surface.
 * Does not read DB — uses env scope and policy table only.
 */
export function buildAutonomyModeState(input: {
  openAiKeyPresent: boolean;
  sandboxRuntimeReady: boolean;
  providerApproved: boolean;
  secretBoundaryConfigured: boolean;
  migrationsPending: boolean;
}): EdenAutonomyModeState {
  const scope = resolveEnvironmentScope();
  const stage = resolveAutonomyStage(scope);
  const isPrivateDev = scope === "PRIVATE_DEV";

  const currentBlockers: string[] = [];

  if (!isPrivateDev) {
    currentBlockers.push("Environment is PUBLIC_PROD — all writes are review-gated.");
  }

  if (isPrivateDev && input.migrationsPending) {
    currentBlockers.push(
      "Prisma migrations have not been applied to the live database. Apply migrations before verifying persistent runtime records.",
    );
  }

  if (isPrivateDev && !input.sandboxRuntimeReady) {
    currentBlockers.push(
      "Internal sandbox runtime is not registered or not in OWNER_ONLY / INTERNAL_SANDBOX state.",
    );
  }

  if (isPrivateDev && !input.openAiKeyPresent) {
    currentBlockers.push(
      "OPENAI_API_KEY is not set in the server runtime. Live OpenAI sandbox execution is blocked.",
    );
  }

  if (isPrivateDev && !input.providerApproved) {
    currentBlockers.push(
      "OpenAI provider approval is not set to APPROVED for the internal sandbox runtime.",
    );
  }

  if (isPrivateDev && !input.secretBoundaryConfigured) {
    currentBlockers.push(
      "OpenAI secret boundary is not marked CONFIGURED. Update secret boundary status in /owner/runtimes.",
    );
  }

  const autoAllowedActions = isPrivateDev
    ? edenDbActionPolicies
        .filter((p) => p.allowedInPrivateDev && !p.requiresOwnerAcknowledgement)
        .map((p) => p.label)
    : edenDbActionPolicies
        .filter((p) => p.allowedInPublicProd && !p.requiresOwnerAcknowledgement)
        .map((p) => p.label);

  const blockedActions = edenDbActionPolicies
    .filter((p) => {
      const allowed = isPrivateDev ? p.allowedInPrivateDev : p.allowedInPublicProd;
      return !allowed && !p.requiresOwnerAcknowledgement;
    })
    .map((p) => p.label);

  const humanRequiredActions = edenDbActionPolicies
    .filter((p) => p.requiresOwnerAcknowledgement)
    .map((p) => p.label);

  const allowsProviderExecution =
    isPrivateDev &&
    input.openAiKeyPresent &&
    input.sandboxRuntimeReady &&
    input.providerApproved &&
    input.secretBoundaryConfigured;

  return {
    environmentScope: scope,
    autonomyStage: stage,
    stageLabel: stage === "A" ? "Stage A — Private/Dev autonomous mode" : "Stage B — Public/Prod review-gated",
    scopeLabel: scope === "PRIVATE_DEV" ? "Private / Dev" : "Public / Prod (edencloud.app)",
    scopeDescription:
      scope === "PRIVATE_DEV"
        ? "Claude may operate with higher autonomy against the owner-only internal sandbox. All prod-scoped actions remain blocked."
        : "All write actions are review-gated. No autonomous execution against edencloud.app.",
    allowsAutoExecution: isPrivateDev && currentBlockers.length === 0,
    allowsProviderExecution,
    publicProdIsGated: !isPrivateDev,
    currentBlockers,
    autoAllowedActions,
    blockedActions,
    humanRequiredActions,
  };
}

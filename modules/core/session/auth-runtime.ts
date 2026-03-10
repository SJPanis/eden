import type { EdenRole } from "@/modules/core/config/role-nav";

export type EdenAuthSessionMode = "mock_only" | "hybrid" | "real_only";
export type EdenSessionBusinessRole = "owner" | "admin" | "editor" | "member";
export type EdenSessionAuthSource = "mock" | "persistent";
export type EdenSessionResolver =
  | "mock_cookie"
  | "prisma_identity_adapter"
  | "default_fallback"
  | "persistent_fallback";

export type EdenSessionBusinessMembership = {
  businessId: string;
  businessRole: EdenSessionBusinessRole;
  source: EdenSessionAuthSource;
};

export type EdenSessionAccessProfile = {
  platformRole: EdenRole;
  memberships: EdenSessionBusinessMembership[];
};

export type EdenSessionDebugSnapshot = {
  enabled: boolean;
  resolvedRole: EdenRole;
  memberships: EdenSessionBusinessMembership[];
  usedOwnedBusinessFallbackClaims: boolean;
  note?: string;
};

// The cookie name is kept stable for local migration continuity, but it now stores
// serialized provider-style session claims instead of a raw internal user id.
export const persistentSessionCookieName = "eden_v1_auth_user_id";

const allowedAuthSessionModes = new Set<EdenAuthSessionMode>([
  "mock_only",
  "hybrid",
  "real_only",
]);

export function resolveAuthSessionMode(
  input = process.env.EDEN_AUTH_SESSION_MODE,
): EdenAuthSessionMode {
  if (input && allowedAuthSessionModes.has(input as EdenAuthSessionMode)) {
    return input as EdenAuthSessionMode;
  }

  if (process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET) {
    return "hybrid";
  }

  return "mock_only";
}

export function shouldAttemptPersistentSessionResolution(
  mode: EdenAuthSessionMode,
) {
  return mode === "hybrid" || mode === "real_only";
}

export function logSessionResolution(
  mode: EdenAuthSessionMode,
  source: EdenSessionAuthSource,
  resolver: EdenSessionResolver,
  detail: string,
) {
  if (process.env.EDEN_LOG_AUTH_SESSION_RESOLUTION !== "true") {
    return;
  }

  console.info(
    `[eden-auth-session] ${mode} resolved ${source} session via ${resolver}: ${detail}`,
  );
}

export function shouldExposeAuthSessionDiagnostics(
  input = process.env.EDEN_SHOW_AUTH_SESSION_DIAGNOSTICS,
) {
  return input === "true";
}

export function logResolvedSessionSnapshot(input: {
  mode: EdenAuthSessionMode;
  source: EdenSessionAuthSource;
  resolver: EdenSessionResolver;
  role: EdenRole;
  memberships: EdenSessionBusinessMembership[];
  usedOwnedBusinessFallbackClaims: boolean;
  detail: string;
}) {
  if (process.env.EDEN_LOG_AUTH_SESSION_RESOLUTION !== "true") {
    return;
  }

  const memberships =
    input.memberships.length > 0
      ? input.memberships
          .map((membership) => `${membership.businessId}:${membership.businessRole}`)
          .join(", ")
      : "none";

  console.info(
    `[eden-auth-session] ${input.mode} session snapshot source=${input.source} resolver=${input.resolver} role=${input.role} memberships=[${memberships}] ownerFallbackClaims=${input.usedOwnedBusinessFallbackClaims}: ${input.detail}`,
  );
}

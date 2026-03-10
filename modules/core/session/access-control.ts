import type { EdenRole } from "@/modules/core/config/role-nav";

export const edenAuthJsPlatformRoleClaim = "edenPlatformRole";

type EdenPersistedPlatformRole = "CONSUMER" | "BUSINESS" | "OWNER";
type EdenProtectedRouteKind = "page" | "api";
type EdenProtectedRouteMatch = {
  kind: EdenProtectedRouteKind;
  role: EdenRole;
};

const protectedPageRoutePrefixes: Array<{ prefix: string; role: EdenRole }> = [
  { prefix: "/consumer", role: "consumer" },
  { prefix: "/business", role: "business" },
  { prefix: "/owner", role: "owner" },
];

const protectedApiRoutePrefixes: Array<{ prefix: string; role: EdenRole }> = [
  { prefix: "/api/credits/top-up/checkout", role: "consumer" },
  { prefix: "/api/credits/top-up/confirm", role: "consumer" },
  { prefix: "/api/mock-transactions", role: "consumer" },
  { prefix: "/api/mock-business", role: "business" },
  { prefix: "/api/mock-services", role: "business" },
  { prefix: "/api/mock-pipeline", role: "business" },
  { prefix: "/api/mock-assistant-history", role: "business" },
  { prefix: "/api/mock-internal-leaves-usage", role: "business" },
  { prefix: "/api/mock-admin", role: "owner" },
  { prefix: "/api/mock-payout-settlements", role: "owner" },
  { prefix: "/api/mock-state", role: "owner" },
];

export function shouldEnforceProtectedRouteAuth(
  input = process.env.EDEN_ENFORCE_AUTH_ROUTES,
) {
  if (input === "true") {
    return true;
  }

  if (input === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function resolveRequiredRoleForPath(
  pathname: string,
): EdenProtectedRouteMatch | null {
  const pageMatch = protectedPageRoutePrefixes.find((route) =>
    matchesRoutePrefix(pathname, route.prefix),
  );

  if (pageMatch) {
    return {
      kind: "page",
      role: pageMatch.role,
    };
  }

  const apiMatch = protectedApiRoutePrefixes.find((route) =>
    matchesRoutePrefix(pathname, route.prefix),
  );

  if (!apiMatch) {
    return null;
  }

  return {
    kind: "api",
    role: apiMatch.role,
  };
}

export function getCanonicalRouteForRole(role: EdenRole) {
  if (role === "owner") {
    return "/owner";
  }

  if (role === "business") {
    return "/business";
  }

  return "/consumer";
}

export function parseAuthenticatedRoleClaim(value: unknown): EdenRole | null {
  if (value === "owner" || value === "business" || value === "consumer") {
    return value;
  }

  return null;
}

export function resolveConfiguredOwnerUsername(
  input = process.env.EDEN_OWNER_USERNAME ?? process.env.OWNER_USERNAME,
) {
  const normalized = input?.trim();

  return normalized ? normalized : null;
}

export function isAuthorizedOwnerUsername(
  username: string | null | undefined,
  configuredOwnerUsername = resolveConfiguredOwnerUsername(),
) {
  if (!configuredOwnerUsername) {
    return process.env.NODE_ENV !== "production";
  }

  return username === configuredOwnerUsername;
}

export function resolveAuthorizedPlatformRole(input: {
  storedRole: EdenPersistedPlatformRole;
  username?: string | null;
  businessMembershipCount?: number;
  ownedBusinessCount?: number;
}): EdenRole {
  if (
    input.storedRole === "OWNER" &&
    isAuthorizedOwnerUsername(input.username)
  ) {
    return "owner";
  }

  if (
    input.storedRole === "BUSINESS" ||
    input.businessMembershipCount ||
    input.ownedBusinessCount
  ) {
    return "business";
  }

  return "consumer";
}

export function buildAuthSignInPath(targetPath: string) {
  const searchParams = new URLSearchParams({
    auth: "signin",
    callbackUrl: targetPath,
  });

  return `/?${searchParams.toString()}`;
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

import { roleMeta, type EdenRole } from "@/modules/core/config/role-nav";
import {
  defaultBusinessUserId,
  defaultConsumerUserId,
  defaultOwnerUserId,
  getUserById,
  users,
} from "@/modules/core/mock-data";
import type {
  EdenAuthSessionMode,
  EdenSessionAccessProfile,
  EdenSessionAuthSource,
  EdenSessionBusinessMembership,
  EdenSessionResolver,
} from "@/modules/core/session/auth-runtime";

export type EdenMockSession = {
  role: EdenRole;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: EdenRole;
    status: string;
    edenBalanceCredits: number;
    businessIds: string[];
    initials: string;
  };
  access: EdenSessionAccessProfile;
  auth: {
    mode: EdenAuthSessionMode;
    source: EdenSessionAuthSource;
    resolver: EdenSessionResolver;
    sessionKey: string | null;
  };
};

export type EdenMockSessionOption = {
  userId: string;
  role: EdenRole;
  label: string;
  description: string;
};

export const mockSessionCookieName = "eden_v1_mock_user_id";
export const mockRoleOptions: EdenRole[] = ["consumer", "business", "owner"];

export const defaultUserIdByRole: Record<EdenRole, string> = {
  consumer: defaultConsumerUserId,
  business: defaultBusinessUserId,
  owner: defaultOwnerUserId,
};

export const defaultRouteByRole: Record<EdenRole, string> = {
  consumer: "/consumer",
  business: "/business",
  owner: "/owner",
};

export const layerAccessRules: Record<EdenRole, EdenRole[] | null> = {
  consumer: null,
  business: ["business", "owner"],
  owner: ["owner"],
};

export const mockSessionOptions: EdenMockSessionOption[] = users
  .filter((user) => mockRoleOptions.includes(user.role))
  .sort((left, right) => {
    const roleDelta = mockRoleOptions.indexOf(left.role) - mockRoleOptions.indexOf(right.role);
    if (roleDelta !== 0) {
      return roleDelta;
    }

    return left.displayName.localeCompare(right.displayName);
  })
  .map((user) => ({
    userId: user.id,
    role: user.role,
    label: user.displayName,
    description: `${roleMeta[user.role].label} - ${toTitleCase(user.status)}`,
  }));

type ResolveMockSessionOptions = {
  auth?: Partial<EdenMockSession["auth"]>;
  businessIds?: string[];
  memberships?: EdenSessionBusinessMembership[];
};

type EdenCompatibilitySessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: EdenRole;
  status: string;
  edenBalanceCredits: number;
  businessIds: string[];
};

export function resolveMockSession(
  userId?: string | null,
  options: ResolveMockSessionOptions = {},
): EdenMockSession {
  const fallbackUser = getUserById(defaultConsumerUserId);
  const resolvedUser = getUserById(userId ?? defaultConsumerUserId) ?? fallbackUser;

  if (!resolvedUser) {
    return createCompatibilitySession(
      {
        id: defaultConsumerUserId,
        username: "consumer",
        displayName: "Consumer User",
        role: "consumer",
        status: "active",
        edenBalanceCredits: 0,
        businessIds: [],
      },
      {
        auth: {
          source: "mock",
          resolver: "default_fallback",
          sessionKey: null,
          ...options.auth,
        },
        memberships: options.memberships,
      },
    );
  }

  return createCompatibilitySession(
    {
      id: resolvedUser.id,
      username: resolvedUser.username,
      displayName: resolvedUser.displayName,
      role: resolvedUser.role,
      status: resolvedUser.status,
      edenBalanceCredits: resolvedUser.edenBalanceCredits,
      businessIds: options.businessIds ?? resolvedUser.businessIds,
    },
    {
      auth: {
        source: "mock",
        resolver: userId ? "mock_cookie" : "default_fallback",
        sessionKey: userId ?? null,
        ...options.auth,
      },
      memberships: options.memberships,
    },
  );
}

export function createCompatibilitySession(
  user: EdenCompatibilitySessionUser,
  options: {
    auth?: Partial<EdenMockSession["auth"]>;
    memberships?: EdenSessionBusinessMembership[];
  } = {},
): EdenMockSession {
  const memberships =
    options.memberships ?? buildSessionMemberships(user.businessIds, options.auth?.source ?? "mock");

  return {
    role: user.role,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      edenBalanceCredits: user.edenBalanceCredits,
      businessIds: user.businessIds,
      initials: getInitials(user.displayName),
    },
    access: {
      platformRole: user.role,
      memberships,
    },
    auth: {
      mode: "mock_only",
      source: "mock",
      resolver: "default_fallback",
      sessionKey: null,
      ...options.auth,
    },
  };
}

export function getDefaultUserIdForRole(role: EdenRole) {
  return defaultUserIdByRole[role];
}

export function getDefaultRouteForRole(role: EdenRole) {
  return defaultRouteByRole[role];
}

export function canAccessRoles(role: EdenRole, allowedRoles: EdenRole[] | null | undefined) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(role);
}

export function parseRoleList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is EdenRole => mockRoleOptions.includes(item as EdenRole));
}

export function buildForbiddenHref(targetPath: string, allowedRoles: EdenRole[]) {
  const searchParams = new URLSearchParams({
    target: targetPath,
    required: allowedRoles.join(","),
  });

  return `/forbidden?${searchParams.toString()}`;
}

function getInitials(displayName: string) {
  const words = displayName.split(/\s+/).filter(Boolean);
  const firstTwoWords = words.slice(0, 2);
  return firstTwoWords.map((word) => word.charAt(0).toUpperCase()).join("");
}

function buildSessionMemberships(
  businessIds: string[],
  source: EdenSessionAuthSource,
): EdenSessionBusinessMembership[] {
  return businessIds.map((businessId) => ({
    businessId,
    businessRole: "owner",
    source,
  }));
}

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

import { getBusinessById, getUserById } from "@/modules/core/mock-data";

export type EdenMockAdminAction =
  | "freeze_user"
  | "unfreeze_user"
  | "freeze_business"
  | "unfreeze_business"
  | "toggle_maintenance";

export type EdenMockAdminState = {
  frozenUserIds: string[];
  frozenBusinessIds: string[];
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy: string;
};

export const mockAdminStateCookieName = "eden_v1_mock_admin_state";

const defaultMockAdminState: EdenMockAdminState = {
  frozenUserIds: [],
  frozenBusinessIds: [],
  maintenanceMode: false,
  updatedAt: "",
  updatedBy: "Legacy Ops",
};

export function parseMockAdminStateCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return defaultMockAdminState;
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!isMockAdminState(parsedValue)) {
      return defaultMockAdminState;
    }

    return getEffectiveMockAdminState(parsedValue);
  } catch {
    return defaultMockAdminState;
  }
}

export function serializeMockAdminStateCookie(state: EdenMockAdminState) {
  return JSON.stringify(getEffectiveMockAdminState(state));
}

export function getEffectiveMockAdminState(
  state: Partial<EdenMockAdminState> | null | undefined,
): EdenMockAdminState {
  return {
    frozenUserIds: uniqueStringList(state?.frozenUserIds ?? defaultMockAdminState.frozenUserIds),
    frozenBusinessIds: uniqueStringList(
      state?.frozenBusinessIds ?? defaultMockAdminState.frozenBusinessIds,
    ),
    maintenanceMode: state?.maintenanceMode ?? defaultMockAdminState.maintenanceMode,
    updatedAt: state?.updatedAt ?? defaultMockAdminState.updatedAt,
    updatedBy: state?.updatedBy ?? defaultMockAdminState.updatedBy,
  };
}

export function isUserFrozen(userId: string, adminState: EdenMockAdminState) {
  return adminState.frozenUserIds.includes(userId);
}

export function isBusinessFrozen(businessId: string, adminState: EdenMockAdminState) {
  return adminState.frozenBusinessIds.includes(businessId);
}

export function applyMockAdminAction(options: {
  action: EdenMockAdminAction;
  adminState?: EdenMockAdminState;
  actor?: string;
  userId?: string;
  businessId?: string;
}) {
  const {
    action,
    adminState = defaultMockAdminState,
    actor = defaultMockAdminState.updatedBy,
    userId,
    businessId,
  } = options;
  const currentState = getEffectiveMockAdminState(adminState);
  const updatedAt = new Date().toISOString();

  if (action === "freeze_user") {
    if (!userId || !getUserById(userId)) {
      return null;
    }

    return {
      ...currentState,
      frozenUserIds: uniqueStringList([...currentState.frozenUserIds, userId]),
      updatedAt,
      updatedBy: actor,
    };
  }

  if (action === "unfreeze_user") {
    if (!userId || !getUserById(userId)) {
      return null;
    }

    return {
      ...currentState,
      frozenUserIds: currentState.frozenUserIds.filter((entry) => entry !== userId),
      updatedAt,
      updatedBy: actor,
    };
  }

  if (action === "freeze_business") {
    if (!businessId || !getBusinessById(businessId)) {
      return null;
    }

    return {
      ...currentState,
      frozenBusinessIds: uniqueStringList([...currentState.frozenBusinessIds, businessId]),
      updatedAt,
      updatedBy: actor,
    };
  }

  if (action === "unfreeze_business") {
    if (!businessId || !getBusinessById(businessId)) {
      return null;
    }

    return {
      ...currentState,
      frozenBusinessIds: currentState.frozenBusinessIds.filter((entry) => entry !== businessId),
      updatedAt,
      updatedBy: actor,
    };
  }

  return {
    ...currentState,
    maintenanceMode: !currentState.maintenanceMode,
    updatedAt,
    updatedBy: actor,
  };
}

function uniqueStringList(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim())));
}

function isMockAdminState(value: unknown): value is EdenMockAdminState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockAdminState>;

  return (
    Array.isArray(candidate.frozenUserIds) &&
    Array.isArray(candidate.frozenBusinessIds) &&
    typeof candidate.maintenanceMode === "boolean" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.updatedBy === "string"
  );
}

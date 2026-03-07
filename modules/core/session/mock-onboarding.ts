import { type EdenRole } from "@/modules/core/config/role-nav";
import { categories } from "@/modules/core/mock-data";
import {
  getDefaultUserIdForRole,
  mockSessionOptions,
} from "@/modules/core/session/mock-session";

export type EdenPublicRole = Exclude<EdenRole, "owner">;
export type EdenMockEntryMode = "create_account" | "sign_in" | "guest";
export type EdenMockSecurityChoice =
  | "standard_login"
  | "enhanced_security"
  | "hardware_key";

export type EdenMockOnboardingProfile = {
  mode: EdenMockEntryMode;
  role: EdenPublicRole;
  intendedUse: string;
  interests: string[];
  workspaceStyle: string;
  securityChoice: EdenMockSecurityChoice;
  selectedUserId: string;
  completedAt: string;
};

type EdenEntryModeOption = {
  id: EdenMockEntryMode;
  label: string;
  description: string;
};

type EdenPublicRoleOption = {
  id: EdenPublicRole;
  label: string;
  description: string;
};

type EdenOption = {
  id: string;
  label: string;
  description: string;
};

export const mockOnboardingCookieName = "eden_v1_mock_onboarding";

const publicRoles: EdenPublicRole[] = ["consumer", "business"];
const entryModes: EdenMockEntryMode[] = ["create_account", "sign_in", "guest"];
const securityChoices: EdenMockSecurityChoice[] = [
  "standard_login",
  "enhanced_security",
  "hardware_key",
];

export const publicRoleOptions: EdenPublicRoleOption[] = [
  {
    id: "consumer",
    label: "Consumer",
    description: "Discover services, save businesses, and explore Eden in consumer mode.",
  },
  {
    id: "business",
    label: "Business",
    description: "Open the builder workspace and manage mocked projects, billing, and release flow.",
  },
];

export const entryModeOptions: EdenEntryModeOption[] = [
  {
    id: "create_account",
    label: "Create Account",
    description: "Start a mocked Eden setup flow for a new consumer or business profile.",
  },
  {
    id: "sign_in",
    label: "Sign In",
    description: "Choose an existing public mock account and continue into the platform shell.",
  },
  {
    id: "guest",
    label: "Continue as Guest",
    description: "Preview Eden in consumer mode without a full mocked account setup.",
  },
];

export const intendedUseOptions: EdenOption[] = [
  {
    id: "discover_services",
    label: "Discover services",
    description: "Browse recommendations, matches, and Ask Eden discovery results.",
  },
  {
    id: "launch_business",
    label: "Launch a business",
    description: "Prepare a mocked workspace for build, test, publish, and billing flows.",
  },
  {
    id: "prototype_ai",
    label: "Prototype AI flows",
    description: "Explore how routing, assistants, and discovery may work inside Eden later.",
  },
  {
    id: "test_platform",
    label: "Test the platform",
    description: "Exercise the connected shell, controls, and mock data across all public layers.",
  },
];

export const interestPreferenceOptions: EdenOption[] = categories.map((category) => ({
  id: category.id,
  label: category.label,
  description: category.description,
}));

export const workspaceStyleOptions: EdenOption[] = [
  {
    id: "guided",
    label: "Guided flow",
    description: "Prefer structured steps, clear next actions, and tighter onboarding cues.",
  },
  {
    id: "exploratory",
    label: "Exploratory",
    description: "Prefer browsing, testing routes, and learning the platform by moving through it.",
  },
  {
    id: "operator",
    label: "Operator mode",
    description: "Prefer dense status visibility, release detail, and wallet or system context.",
  },
];

export const securityChoiceOptions: Array<
  EdenOption & { id: EdenMockSecurityChoice }
> = [
  {
    id: "standard_login",
    label: "Standard Login",
    description: "Simple credentials-first access placeholder for everyday use.",
  },
  {
    id: "enhanced_security",
    label: "Enhanced Security",
    description: "Future placeholder for stronger verification and recovery controls.",
  },
  {
    id: "hardware_key",
    label: "Hardware Key / Passkey",
    description: "Future placeholder for passkeys or hardware-backed login flows.",
  },
];

export const publicMockSessionOptions = mockSessionOptions.filter(
  (option): option is (typeof mockSessionOptions)[number] & { role: EdenPublicRole } =>
    option.role !== "owner",
);

export function getPublicMockSessionOptions(role?: EdenPublicRole) {
  if (!role) {
    return publicMockSessionOptions;
  }

  return publicMockSessionOptions.filter((option) => option.role === role);
}

export function parseMockOnboardingCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as Partial<EdenMockOnboardingProfile>;
    return getSanitizedMockOnboardingProfile(parsedValue);
  } catch {
    return null;
  }
}

export function serializeMockOnboardingCookie(profile: EdenMockOnboardingProfile) {
  return JSON.stringify(profile);
}

export function getSanitizedMockOnboardingProfile(
  profile: Partial<EdenMockOnboardingProfile> | null | undefined,
) {
  if (!profile) {
    return null;
  }

  const mode = entryModes.includes(profile.mode as EdenMockEntryMode)
    ? (profile.mode as EdenMockEntryMode)
    : null;

  if (!mode) {
    return null;
  }

  const role =
    mode === "guest"
      ? "consumer"
      : publicRoles.includes(profile.role as EdenPublicRole)
        ? (profile.role as EdenPublicRole)
        : null;

  if (!role) {
    return null;
  }

  const intendedUse = intendedUseOptions.some((option) => option.id === profile.intendedUse)
    ? profile.intendedUse ?? intendedUseOptions[0].id
    : intendedUseOptions[0].id;
  const interests = uniqueStringList(profile.interests ?? []).filter((interest) =>
    interestPreferenceOptions.some((option) => option.id === interest),
  );
  const workspaceStyle = workspaceStyleOptions.some((option) => option.id === profile.workspaceStyle)
    ? profile.workspaceStyle ?? ""
    : "";
  const securityChoice = securityChoices.includes(profile.securityChoice as EdenMockSecurityChoice)
    ? (profile.securityChoice as EdenMockSecurityChoice)
    : "standard_login";
  const availableUserIds = new Set(getPublicMockSessionOptions(role).map((option) => option.userId));
  const selectedUserId =
    profile.selectedUserId && availableUserIds.has(profile.selectedUserId)
      ? profile.selectedUserId
      : getDefaultUserIdForRole(role);

  return {
    mode,
    role,
    intendedUse,
    interests: interests.length ? interests.slice(0, 3) : [interestPreferenceOptions[0].id],
    workspaceStyle,
    securityChoice,
    selectedUserId,
    completedAt: profile.completedAt ?? new Date().toISOString(),
  } satisfies EdenMockOnboardingProfile;
}

function uniqueStringList(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim())));
}

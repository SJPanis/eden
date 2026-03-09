"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { roleMeta } from "@/modules/core/config/role-nav";
import { MockSessionSwitcher } from "@/modules/core/session/mock-session-switcher";
import {
  entryModeOptions,
  getPublicMockSessionOptions,
  intendedUseOptions,
  interestPreferenceOptions,
  publicRoleOptions,
  securityChoiceOptions,
  type EdenMockEntryMode,
  type EdenMockOnboardingProfile,
  type EdenMockSecurityChoice,
  type EdenPublicRole,
  workspaceStyleOptions,
} from "@/modules/core/session/mock-onboarding";
import {
  getDefaultRouteForRole,
  getDefaultUserIdForRole,
  type EdenMockSession,
} from "@/modules/core/session/mock-session";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";

type EdenEntryPanelProps = {
  session: EdenMockSession;
  onboardingProfile: EdenMockOnboardingProfile | null;
  maintenanceMode: boolean;
};

type EntryStepId = "mode" | "role" | "preferences" | "security" | "review";

const stepOrder: Array<{ id: EntryStepId; label: string }> = [
  { id: "mode", label: "Access" },
  { id: "role", label: "Role" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "review", label: "Review" },
];

const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const publicLaunchClarityCards = [
  {
    id: "what-eden-is",
    label: "What Eden is",
    value: "A builder-to-consumer service platform",
    detail:
      "Builders create and publish AI-powered services. Consumers discover them, see visible pricing, and run them through Eden Credits.",
  },
  {
    id: "how-pricing-works",
    label: edenLaunchLabels.visiblePricing,
    value: "Shown before every run",
    detail:
      "Service pages and marketplace cards expose the run price before usage begins, so the decision stays explicit.",
  },
  {
    id: "how-billing-works",
    label: edenLaunchLabels.creditsOnlyBilling,
    value: "Top up only when needed",
    detail:
      "Consumers add credits first, then reuse them across service runs. Hidden checkout does not appear during service use.",
  },
];

const publicHowEdenWorksSteps = [
  {
    id: "builder-publish",
    label: "1. Builders publish services",
    detail:
      "Businesses create, price, and publish services so they can appear in discovery and Ask Eden.",
  },
  {
    id: "consumer-discover",
    label: "2. Consumers explore",
    detail:
      "Marketplace cards and Ask Eden show published availability, visible pricing, and credits-only trust cues.",
  },
  {
    id: "consumer-wallet",
    label: "3. Wallet decides the next step",
    detail:
      "Consumers compare wallet balance to the visible price, top up only if needed, then run the service.",
  },
];

const publicAudienceCards = [
  {
    id: "builders",
    label: "For builders",
    detail:
      "Create, price, and publish services so they become published and available in Eden discovery.",
  },
  {
    id: "consumers",
    label: "For consumers",
    detail:
      "Explore published services, check visible pricing, add Eden Credits only if needed, and run without hidden charges during service use.",
  },
];

function getOptionLabel(options: Array<{ id: string; label: string }>, id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

export function EdenEntryPanel({
  session,
  onboardingProfile,
  maintenanceMode,
}: EdenEntryPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState<EntryStepId>("mode");
  const [entryMode, setEntryMode] = useState<EdenMockEntryMode>(
    onboardingProfile?.mode ?? "create_account",
  );
  const [selectedRole, setSelectedRole] = useState<EdenPublicRole>(
    onboardingProfile?.role ?? "consumer",
  );
  const [intendedUse, setIntendedUse] = useState(
    onboardingProfile?.intendedUse ?? intendedUseOptions[0].id,
  );
  const [interestIds, setInterestIds] = useState<string[]>(
    onboardingProfile?.interests ?? [interestPreferenceOptions[0].id],
  );
  const [workspaceStyle, setWorkspaceStyle] = useState(onboardingProfile?.workspaceStyle ?? "");
  const [securityChoice, setSecurityChoice] = useState<EdenMockSecurityChoice>(
    onboardingProfile?.securityChoice ?? "standard_login",
  );
  const [selectedSignInUserId, setSelectedSignInUserId] = useState(
    onboardingProfile?.selectedUserId ?? getDefaultUserIdForRole(selectedRole),
  );
  const [entryError, setEntryError] = useState<string | null>(null);
  const resolvedRole: EdenPublicRole = entryMode === "guest" ? "consumer" : selectedRole;
  const destinationHref = getDefaultRouteForRole(resolvedRole);
  const currentWorkspaceHref = getDefaultRouteForRole(session.role);
  const accountOptions = useMemo(
    () => getPublicMockSessionOptions(resolvedRole),
    [resolvedRole],
  );
  const selectedUserId =
    entryMode === "sign_in"
      ? accountOptions.find((option) => option.userId === selectedSignInUserId)?.userId ??
        accountOptions[0]?.userId ??
        getDefaultUserIdForRole(resolvedRole)
      : getDefaultUserIdForRole(resolvedRole);
  const reviewItems = [
    {
      label: "Entry mode",
      value: getOptionLabel(entryModeOptions, entryMode),
    },
    {
      label: "Role",
      value: roleMeta[resolvedRole].label,
    },
    {
      label: "Intended use",
      value: getOptionLabel(intendedUseOptions, intendedUse),
    },
    {
      label: "Interests",
      value: interestIds
        .map((interestId) => getOptionLabel(interestPreferenceOptions, interestId))
        .join(", "),
    },
    {
      label: "Workspace style",
      value: workspaceStyle
        ? getOptionLabel(workspaceStyleOptions, workspaceStyle)
        : "No preference",
    },
    {
      label: "Security",
      value: getOptionLabel(securityChoiceOptions, securityChoice),
    },
  ];
  const lastOnboardingSummary = onboardingProfile
    ? [
        getOptionLabel(entryModeOptions, onboardingProfile.mode),
        roleMeta[onboardingProfile.role].label,
        getOptionLabel(intendedUseOptions, onboardingProfile.intendedUse),
        getOptionLabel(securityChoiceOptions, onboardingProfile.securityChoice),
      ].join(" - ")
    : null;

  function toggleInterest(interestId: string) {
    setInterestIds((currentInterestIds) => {
      if (currentInterestIds.includes(interestId)) {
        return currentInterestIds.filter((currentId) => currentId !== interestId);
      }

      return [...currentInterestIds, interestId].slice(-3);
    });
  }

  function canAdvance(stepId: EntryStepId) {
    if (stepId === "mode") {
      return Boolean(entryMode);
    }

    if (stepId === "role") {
      return entryMode !== "sign_in" || Boolean(selectedUserId);
    }

    if (stepId === "preferences") {
      return Boolean(intendedUse) && interestIds.length > 0;
    }

    if (stepId === "security") {
      return Boolean(securityChoice);
    }

    return true;
  }

  function goToNextStep() {
    const currentIndex = stepOrder.findIndex((step) => step.id === activeStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep && canAdvance(activeStep)) {
      setActiveStep(nextStep.id);
    }
  }

  function goToPreviousStep() {
    const currentIndex = stepOrder.findIndex((step) => step.id === activeStep);
    const previousStep = stepOrder[currentIndex - 1];

    if (previousStep) {
      setActiveStep(previousStep.id);
    }
  }

  function handleComplete() {
    const payload = {
      userId: selectedUserId,
      onboarding: {
        mode: entryMode,
        role: resolvedRole,
        intendedUse,
        interests: interestIds,
        workspaceStyle,
        securityChoice,
        selectedUserId,
        completedAt: new Date().toISOString(),
      },
    };

    setEntryError(null);
    startTransition(() => {
      void fetch("/api/mock-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (!response.ok) {
            const responseBody = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(responseBody?.error ?? "Unable to start the mock Eden session.");
          }

          router.push(destinationHref);
          router.refresh();
        })
        .catch((error: unknown) => {
          setEntryError(
            error instanceof Error ? error.message : "Unable to start the mock Eden session.",
          );
        });
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,237,213,0.8),rgba(255,255,255,0.95)_42%,rgba(219,234,254,0.9))] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {maintenanceMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Mock maintenance mode is active.</span> The public
            entry experience stays available because this remains a local development-only state.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="rounded-[32px] border border-eden-edge bg-white/88 p-6"
          >
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
              Eden Entry
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eden-ink">
              Start Eden like a real product.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-eden-muted md:text-base">
              Eden is a builder-to-consumer service platform. Builders publish services with
              visible pricing, consumers discover them and top up Eden Credits only when needed,
              and service runs happen with no hidden checkout during usage.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Published and priced
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                {edenLaunchLabels.visiblePricing}
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                {edenLaunchLabels.creditsOnlyBilling}
              </span>
              <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                {edenLaunchLabels.noHiddenCheckout}
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {publicLaunchClarityCards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.28),rgba(255,255,255,0.98))] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-eden-edge bg-white/92 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Who Eden is for
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Eden connects the builder side that publishes services and the consumer side
                    that discovers and uses them.
                  </p>
                </div>
                <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                  Builders and consumers
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {publicAudienceCards.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-eden-edge bg-eden-bg/65 p-4">
                    <p className="text-sm font-semibold text-eden-ink">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,247,237,0.9),rgba(255,255,255,0.98))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                      How Eden works
                    </p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">
                      The same launch-ready loop carries from builder workspace to public discovery
                      to service usage.
                    </p>
                  </div>
                  <span className="rounded-full border border-eden-edge bg-white/92 px-3 py-1 text-xs text-eden-muted">
                    One visible loop
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {publicHowEdenWorksSteps.map((step) => (
                    <div key={step.id} className="rounded-2xl border border-eden-edge bg-white/92 p-4">
                      <p className="text-sm font-semibold text-eden-ink">{step.label}</p>
                      <p className="mt-2 text-sm leading-6 text-eden-muted">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-eden-ring bg-[linear-gradient(135deg,rgba(219,234,254,0.5),rgba(255,255,255,0.98))] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Public next step
                </p>
                <p className="mt-3 text-base font-semibold text-eden-ink">
                  Explore the consumer marketplace first
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Start in the consumer layer to see published services, visible pricing, wallet
                  guidance, and the credits-only run flow before you go deeper into onboarding.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/consumer"
                    className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
                  >
                    Explore consumer marketplace
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveStep("mode")}
                    className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                  >
                    Continue onboarding
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {entryModeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setEntryMode(option.id);
                    setActiveStep("mode");
                  }}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    entryMode === option.id
                      ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                      : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-2 text-sm leading-6">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(239,246,255,0.8),rgba(255,255,255,0.96))] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                Public roles
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {publicRoleOptions.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl border border-eden-edge bg-white/92 p-4"
                  >
                    <p className="text-sm font-semibold text-eden-ink">{role.label}</p>
                    <p className="mt-2 text-sm leading-6 text-eden-muted">{role.description}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-eden-muted">
                Owner access stays out of public onboarding and remains available only through the
                existing development session controls.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.95fr)]">
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Current mock session
                </p>
                <p className="mt-2 text-lg font-semibold text-eden-ink">
                  {session.user.displayName}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {roleMeta[session.role].label} - @{session.user.username}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={currentWorkspaceHref}
                    className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
                  >
                    Continue to current workspace
                  </Link>
                  <Link
                    href="/consumer"
                    className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                  >
                    Explore consumer layer
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-eden-edge bg-white/92 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Last onboarding
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {lastOnboardingSummary ?? "No mocked onboarding flow has been completed yet."}
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.04 }}
            className="space-y-4"
          >
            <div className="rounded-[32px] border border-eden-edge bg-white/90 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Mock onboarding
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-eden-ink">
                    Create, sign in, or enter as guest
                  </h2>
                </div>
                <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                  {stepOrder.findIndex((step) => step.id === activeStep) + 1}/{stepOrder.length}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {stepOrder.map((step, index) => {
                  const stepIndex = stepOrder.findIndex((currentStep) => currentStep.id === activeStep);
                  const isActive = activeStep === step.id;
                  const isComplete = index < stepIndex;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (index <= stepIndex) {
                          setActiveStep(step.id);
                        }
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                          : isComplete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-eden-edge bg-white text-eden-muted"
                      }`}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 min-h-[420px]">
                <AnimatePresence mode="wait" initial={false}>
                  {activeStep === "mode" ? (
                    <motion.div
                      key="mode"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={stepVariants}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <div className="grid gap-3">
                        {entryModeOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setEntryMode(option.id)}
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              entryMode === option.id
                                ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                            }`}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="mt-2 text-sm leading-6">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}

                  {activeStep === "role" ? (
                    <motion.div
                      key="role"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={stepVariants}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {publicRoleOptions.map((role) => {
                          const isDisabled = entryMode === "guest" && role.id !== "consumer";

                          return (
                            <button
                              key={role.id}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setSelectedRole(role.id)}
                              className={`rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                                resolvedRole === role.id
                                  ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                  : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                              }`}
                            >
                              <p className="text-sm font-semibold">{role.label}</p>
                              <p className="mt-2 text-sm leading-6">{role.description}</p>
                              {isDisabled ? (
                                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                                  Guest mode is consumer-only
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {entryMode === "sign_in" ? (
                        <label className="flex flex-col gap-2 text-sm text-eden-muted">
                          <span>Choose mock account</span>
                          <select
                            value={selectedUserId}
                            onChange={(event) => setSelectedSignInUserId(event.target.value)}
                            className="rounded-2xl border border-eden-edge bg-white px-4 py-3 text-sm text-eden-ink outline-none transition focus:border-eden-ring focus:ring-2 focus:ring-eden-ring/40"
                          >
                            {accountOptions.map((option) => (
                              <option key={option.userId} value={option.userId}>
                                {option.label} - {option.description}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                          {entryMode === "guest"
                            ? "Guest access will continue into the consumer layer using the shared public mock consumer profile."
                            : "Create Account stays mocked. Completing this flow will bind the selected public role to the shared default mock user for that layer."}
                        </div>
                      )}
                    </motion.div>
                  ) : null}

                  {activeStep === "preferences" ? (
                    <motion.div
                      key="preferences"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={stepVariants}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-5"
                    >
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                          Intended use
                        </p>
                        <div className="mt-3 grid gap-3">
                          {intendedUseOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setIntendedUse(option.id)}
                              className={`rounded-2xl border p-4 text-left transition-colors ${
                                intendedUse === option.id
                                  ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                  : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                              }`}
                            >
                              <p className="text-sm font-semibold">{option.label}</p>
                              <p className="mt-2 text-sm leading-6">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                          Interest preferences
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">
                          Choose up to three categories to guide the mocked discovery and workspace
                          setup.
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {interestPreferenceOptions.map((option) => {
                            const isSelected = interestIds.includes(option.id);

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleInterest(option.id)}
                                className={`rounded-2xl border p-4 text-left transition-colors ${
                                  isSelected
                                    ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                    : "border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                                }`}
                              >
                                <p className="text-sm font-semibold">{option.label}</p>
                                <p className="mt-2 text-sm leading-6">{option.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                            Workspace style
                          </p>
                          <button
                            type="button"
                            onClick={() => setWorkspaceStyle("")}
                            className="text-xs uppercase tracking-[0.12em] text-eden-muted transition-colors hover:text-eden-ink"
                          >
                            Clear preference
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {workspaceStyleOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setWorkspaceStyle(option.id)}
                              className={`rounded-2xl border p-4 text-left transition-colors ${
                                workspaceStyle === option.id
                                  ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                  : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                              }`}
                            >
                              <p className="text-sm font-semibold">{option.label}</p>
                              <p className="mt-2 text-sm leading-6">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  {activeStep === "security" ? (
                    <motion.div
                      key="security"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={stepVariants}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <p className="text-sm leading-6 text-eden-muted">
                        These choices are placeholders only for now. They prepare Eden for future
                        authentication and security layers without adding any real backend logic
                        yet.
                      </p>
                      <div className="grid gap-3">
                        {securityChoiceOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSecurityChoice(option.id)}
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              securityChoice === option.id
                                ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
                                : "border-eden-edge bg-eden-bg/70 text-eden-muted hover:border-eden-ring hover:text-eden-ink"
                            }`}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="mt-2 text-sm leading-6">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}

                  {activeStep === "review" ? (
                    <motion.div
                      key="review"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={stepVariants}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(255,237,213,0.55),rgba(255,255,255,0.96))] p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                          Destination
                        </p>
                        <p className="mt-2 text-lg font-semibold text-eden-ink">
                          {destinationHref}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">
                          Completing onboarding will update the mocked session and route into the{" "}
                          {roleMeta[resolvedRole].label.toLowerCase()} layer.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {reviewItems.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-eden-edge bg-white p-4"
                          >
                            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                              {item.label}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {entryError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {entryError}
                        </div>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-eden-muted">
                  {activeStep === "review"
                    ? "All onboarding and security choices stay mocked only."
                    : "Use Next to move through the public Eden setup flow."}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeStep !== "mode" ? (
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
                    >
                      Back
                    </button>
                  ) : null}
                  {activeStep !== "review" ? (
                    <button
                      type="button"
                      disabled={!canAdvance(activeStep)}
                      onClick={goToNextStep}
                      className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleComplete}
                      className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPending
                        ? "Starting..."
                        : entryMode === "sign_in"
                          ? "Sign In to Eden"
                          : entryMode === "guest"
                            ? "Continue as Guest"
                            : "Create Mock Account"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <MockSessionSwitcher session={session} />
          </motion.section>
        </div>
      </div>
    </div>
  );
}

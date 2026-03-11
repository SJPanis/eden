export type EdenLiveServiceExecutionDefinition = {
  serviceId: string;
  serviceTitle: string;
  badgeLabel: string;
  runnerTitle: string;
  runnerDescription: string;
  inputLabel: string;
  inputPlaceholder: string;
  minimumInputLength: number;
  metering: {
    providerCostCents: number;
    infraBufferCents: number;
    platformMarkupRate: number;
    minimumChargeLeaves: number;
  };
};

export type EdenLiveServiceExecutionResult = {
  title: string;
  summary: string;
  sections: Array<{
    label: string;
    value: string;
  }>;
  checklist: string[];
};

const eveningResetDefinition: EdenLiveServiceExecutionDefinition = {
  serviceId: "service-02",
  serviceTitle: "Evening Reset Session",
  badgeLabel: "Live service available",
  runnerTitle: "Run a real Evening Reset Session",
  runnerDescription:
    "Share how your day feels and Eden will generate a concrete evening reset plan before any Leaf’s are deducted.",
  inputLabel: "What kind of reset do you need tonight?",
  inputPlaceholder:
    "Example: I feel overstimulated after work, my mind is racing, and I need a gentle way to slow down before bed.",
  minimumInputLength: 18,
  metering: {
    providerCostCents: 0,
    infraBufferCents: 15,
    platformMarkupRate: 0.35,
    minimumChargeLeaves: 40,
  },
};

const liveServiceDefinitions = [eveningResetDefinition] as const;

export function getLiveServiceExecutionDefinition(serviceId?: string | null) {
  if (!serviceId) {
    return null;
  }

  return liveServiceDefinitions.find((service) => service.serviceId === serviceId) ?? null;
}

export function executeLiveService(
  serviceId: string,
  rawInput: string,
): EdenLiveServiceExecutionResult | null {
  const normalizedInput = rawInput.trim();

  if (!normalizedInput) {
    return null;
  }

  if (serviceId === eveningResetDefinition.serviceId) {
    return buildEveningResetSession(normalizedInput);
  }

  return null;
}

function buildEveningResetSession(input: string): EdenLiveServiceExecutionResult {
  const normalized = input.toLowerCase();
  const focus =
    normalized.match(/\b(anxious|spiral|racing|panic|overwhelm|overstimulated)\b/i)
      ? {
          label: "Nervous system downshift",
          window: "12-minute quiet reset",
          script:
            "Lower stimulation first: dim one source of light, silence one device, and take one full minute to slow your breathing before doing anything else.",
          steps: [
            "Take 6 slow breaths with a longer exhale than inhale.",
            "Reduce sensory load: dim lights, silence notifications, and sit somewhere still for 3 minutes.",
            "Write down the one thought you do not need to carry into the rest of the evening.",
          ],
        }
      : normalized.match(/\b(tired|exhausted|burned out|drained|depleted)\b/i)
        ? {
            label: "Low-energy recovery",
            window: "10-minute recovery reset",
            script:
              "Protect energy instead of forcing productivity. Make the next ten minutes about recovery, not catching up.",
            steps: [
              "Drink water and sit down before starting any evening task.",
              "Choose one simple recovery action: shower, stretch, or quiet tea.",
              "Cancel one non-essential task so the evening can end with less friction.",
            ],
          }
        : normalized.match(/\b(sleep|bed|insomnia|restless|late)\b/i)
          ? {
              label: "Sleep-ready wind-down",
              window: "15-minute sleep setup",
              script:
                "Make the room and your attention quieter than your day. The goal is a gentler landing, not a perfect night routine.",
              steps: [
                "Move the phone out of reach for the next 15 minutes.",
                "Lower the room brightness and switch to a slower activity like reading or light stretching.",
                "Write tomorrow's first task on paper so your brain stops rehearsing it tonight.",
              ],
            }
          : {
              label: "General evening reset",
              window: "10-minute reset block",
              script:
                "Use a short reset to separate the day that already happened from the evening you still get to shape.",
              steps: [
                "Pause for 2 quiet minutes before opening another app or task.",
                "Choose one space to reset physically so the room feels calmer than it did ten minutes ago.",
                "Pick one small evening intention and let the rest of the list wait until tomorrow.",
              ],
            };

  const promptSnippet = summarizePrompt(input);

  return {
    title: "Tonight's Reset Plan",
    summary: `Built for: ${promptSnippet}`,
    sections: [
      {
        label: "Primary focus",
        value: focus.label,
      },
      {
        label: "Reset window",
        value: focus.window,
      },
      {
        label: "Gentle instruction",
        value: focus.script,
      },
    ],
    checklist: focus.steps,
  };
}

function summarizePrompt(input: string) {
  const compact = input.replace(/\s+/g, " ").trim();

  if (compact.length <= 96) {
    return compact;
  }

  return `${compact.slice(0, 93).trimEnd()}...`;
}

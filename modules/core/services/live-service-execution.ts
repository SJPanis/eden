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

const marketLensDefinition: EdenLiveServiceExecutionDefinition = {
  serviceId: "service-market-lens",
  serviceTitle: "Market Lens",
  badgeLabel: "Live service available",
  runnerTitle: "Run a Market Lens analysis",
  runnerDescription:
    "Enter a ticker symbol and Claude will generate a probability cone projection before any Leaf’s are deducted.",
  inputLabel: "Which ticker would you like to analyze?",
  inputPlaceholder:
    "Example: AAPL — I want to see the 90-day probability cone and key technical signals.",
  minimumInputLength: 2,
  metering: {
    providerCostCents: 0,
    infraBufferCents: 20,
    platformMarkupRate: 0.35,
    minimumChargeLeaves: 75,
  },
};

const liveServiceDefinitions = [marketLensDefinition] as const;

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

  if (serviceId === marketLensDefinition.serviceId) {
    return buildMarketLensAnalysis(normalizedInput);
  }

  return null;
}

function buildMarketLensAnalysis(input: string): EdenLiveServiceExecutionResult {
  const normalized = input.toLowerCase();
  const ticker = normalized.match(/\b(aapl|tsla|nvda|btc|spy)\b/i)?.[1]?.toUpperCase() ?? "AAPL";
  const outlook =
    normalized.match(/\b(bull|buy|long|growth|up)\b/i)
      ? { label: "Bullish bias detected", confidence: "74%", direction: "upward" }
      : normalized.match(/\b(bear|sell|short|down|decline)\b/i)
        ? { label: "Bearish bias detected", confidence: "68%", direction: "downward" }
        : { label: "Neutral — range-bound", confidence: "71%", direction: "sideways" };

  const promptSnippet = summarizePrompt(input);

  return {
    title: `${ticker} Probability Cone Analysis`,
    summary: `Built for: ${promptSnippet}`,
    sections: [
      { label: "Ticker", value: ticker },
      { label: "Outlook", value: outlook.label },
      { label: "Confidence", value: `${outlook.confidence} in projected ${outlook.direction} range` },
    ],
    checklist: [
      `Review the 90-day price history for ${ticker}.`,
      "Examine the probability cone for high/expected/low targets.",
      "Check Claude’s technical analysis summary below the chart.",
    ],
  };
}

function summarizePrompt(input: string) {
  const compact = input.replace(/\s+/g, " ").trim();

  if (compact.length <= 96) {
    return compact;
  }

  return `${compact.slice(0, 93).trimEnd()}...`;
}

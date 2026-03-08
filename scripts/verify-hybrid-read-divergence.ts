type VerifyOptions = {
  help: boolean;
};

type VerificationStatus =
  | "persistent_divergence_observed"
  | "mock_fallback_observed"
  | "inconclusive";

type VerificationResult = {
  surface: string;
  field: string;
  expected: string;
  observed: string;
  mockBaseline: string;
  status: VerificationStatus;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Hybrid read verification is development-only. Refusing to run while NODE_ENV=production.",
    );
  }

  process.env.EDEN_BUILDER_LOOP_READ_MODE = "hybrid";
  process.env.EDEN_LOG_HYBRID_READS ??= "true";

  const [
    { hybridReadDivergenceScenario },
    { businesses, services, getUserById: getMockUserById },
    { loadDiscoverySnapshot },
    { loadBusinessWorkspaceOverview, loadOwnerDashboardData },
    { loadDiscoveryBusinessById, loadDiscoveryBusinessForService, loadDiscoveryServiceById },
    { loadBusinessesForOwner, loadUserById },
  ] = await Promise.all([
    import(new URL("./hybrid-read-divergence-shared.ts", import.meta.url).href),
    import(new URL("../modules/core/mock-data/platform-data.ts", import.meta.url).href),
    import(new URL("../modules/core/services/discovery-service.ts", import.meta.url).href),
    import(new URL("../modules/core/services/dashboard-read-service.ts", import.meta.url).href),
    import(new URL("../modules/core/services/discovery-service.ts", import.meta.url).href),
    import(new URL("../modules/core/services/index.ts", import.meta.url).href),
  ]);

  const mockBusinessBaseline = businesses.find(
    (business: { id: string }) => business.id === hybridReadDivergenceScenario.business.id,
  );
  const mockServiceBaseline = services.find(
    (service: { id: string }) => service.id === hybridReadDivergenceScenario.service.id,
  );
  const mockUserBaseline = getMockUserById(hybridReadDivergenceScenario.user.id);

  if (!mockBusinessBaseline || !mockServiceBaseline || !mockUserBaseline) {
    throw new Error(
      "The canonical mock baseline for the hybrid divergence scenario could not be resolved.",
    );
  }

  const [
    discoverySnapshot,
    serviceDetailService,
    serviceDetailBusiness,
    businessDetailBusiness,
    businessDetailOwner,
    businessWorkspaceOverview,
    ownerDashboardData,
    ownerInspectionUser,
    ownerInspectionBusinesses,
  ] = await Promise.all([
    loadDiscoverySnapshot(),
    loadDiscoveryServiceById(hybridReadDivergenceScenario.service.id),
    loadDiscoveryBusinessForService(hybridReadDivergenceScenario.service.id),
    loadDiscoveryBusinessById(hybridReadDivergenceScenario.business.id),
    loadUserById(hybridReadDivergenceScenario.user.id),
    loadBusinessWorkspaceOverview(hybridReadDivergenceScenario.business.id),
    loadOwnerDashboardData(),
    loadUserById(hybridReadDivergenceScenario.user.id),
    loadBusinessesForOwner(hybridReadDivergenceScenario.user.id),
  ]);

  const consumerDiscoveryServicePresent = discoverySnapshot.marketplaceServices.some(
    (service: { id: string }) => service.id === hybridReadDivergenceScenario.service.id,
  );
  const consumerDiscoveryBusinessPresent = discoverySnapshot.marketplaceBusinesses.some(
    (business: { id: string }) => business.id === hybridReadDivergenceScenario.business.id,
  );
  const ownerWatchedUser = ownerDashboardData.watchedUsers.find(
    (user: { id: string }) => user.id === hybridReadDivergenceScenario.user.id,
  );
  const ownerWatchedBusiness = ownerDashboardData.watchedBusinesses.find(
    (business: { id: string }) => business.id === hybridReadDivergenceScenario.business.id,
  );
  const ownerLinkedService = ownerDashboardData.serviceCatalog.find(
    (service: { id: string }) => service.id === hybridReadDivergenceScenario.service.id,
  );
  const ownerInspectionBusiness = ownerInspectionBusinesses.find(
    (business: { id: string }) => business.id === hybridReadDivergenceScenario.business.id,
  );

  const results: VerificationResult[] = [
    evaluateBooleanCheck(
      "consumer discovery snapshot",
      "published service visibility",
      "present",
      consumerDiscoveryServicePresent ? "present" : "missing",
      "missing",
    ),
    evaluateBooleanCheck(
      "consumer discovery snapshot",
      "published business visibility",
      "present",
      consumerDiscoveryBusinessPresent ? "present" : "missing",
      "missing",
    ),
    evaluateTextCheck(
      "service detail page",
      "service title",
      hybridReadDivergenceScenario.service.title,
      serviceDetailService?.title ?? "missing",
      mockServiceBaseline.title,
    ),
    evaluateTextCheck(
      "service detail page",
      "linked business",
      hybridReadDivergenceScenario.business.name,
      serviceDetailBusiness?.name ?? "missing",
      mockBusinessBaseline.name,
    ),
    evaluateTextCheck(
      "business detail page",
      "business name",
      hybridReadDivergenceScenario.business.name,
      businessDetailBusiness?.name ?? "missing",
      mockBusinessBaseline.name,
    ),
    evaluateTextCheck(
      "business detail page",
      "owner display name",
      hybridReadDivergenceScenario.user.displayName,
      businessDetailOwner?.displayName ?? "missing",
      mockUserBaseline.displayName,
    ),
    evaluateTextCheck(
      "business dashboard overview",
      "workspace name",
      hybridReadDivergenceScenario.business.name,
      businessWorkspaceOverview.businessProfile?.name ?? "missing",
      mockBusinessBaseline.name,
    ),
    evaluateTextCheck(
      "business dashboard overview",
      "workspace owner",
      hybridReadDivergenceScenario.user.displayName,
      businessWorkspaceOverview.businessOwner?.displayName ?? "missing",
      mockUserBaseline.displayName,
    ),
    evaluateTextCheck(
      "owner dashboard summaries",
      "watched user",
      hybridReadDivergenceScenario.user.displayName,
      ownerWatchedUser?.displayName ?? "missing",
      mockUserBaseline.displayName,
    ),
    evaluateTextCheck(
      "owner dashboard summaries",
      "watched business",
      hybridReadDivergenceScenario.business.name,
      ownerWatchedBusiness?.name ?? "missing",
      mockBusinessBaseline.name,
    ),
    evaluateTextCheck(
      "owner dashboard summaries",
      "linked service catalog entry",
      hybridReadDivergenceScenario.service.title,
      ownerLinkedService?.title ?? "missing",
      mockServiceBaseline.title,
    ),
    evaluateTextCheck(
      "owner inspection surface",
      "inspected user",
      hybridReadDivergenceScenario.user.displayName,
      ownerInspectionUser?.displayName ?? "missing",
      mockUserBaseline.displayName,
    ),
    evaluateTextCheck(
      "owner inspection surface",
      "owned business",
      hybridReadDivergenceScenario.business.name,
      ownerInspectionBusiness?.name ?? "missing",
      mockBusinessBaseline.name,
    ),
  ];

  console.info("[eden-hybrid-read-verify] Hybrid read verification results:");
  console.info("");

  for (const result of results) {
    const label =
      result.status === "persistent_divergence_observed"
        ? "PASS"
        : result.status === "mock_fallback_observed"
          ? "FALLBACK"
          : "CHECK";

    console.info(
      `${label} ${result.surface} - ${result.field}: observed="${result.observed}" expected="${result.expected}" mock="${result.mockBaseline}"`,
    );
  }

  const fallbackResults = results.filter(
    (result) => result.status !== "persistent_divergence_observed",
  );

  console.info("");

  if (fallbackResults.length === 0) {
    console.info(
      "[eden-hybrid-read-verify] All targeted surfaces observed the PostgreSQL divergence through the hybrid read boundary.",
    );
    return;
  }

  console.warn(
    `[eden-hybrid-read-verify] ${fallbackResults.length} checks did not observe the expected divergence.`,
  );
  console.warn(
    "[eden-hybrid-read-verify] Ensure the following before retrying:",
  );
  console.warn("1. `npm run db:sync:canonical-marketplace`");
  console.warn("2. `npm run db:diverge:hybrid-read`");
  console.warn("3. `EDEN_BUILDER_LOOP_READ_MODE=hybrid`");
  console.warn("4. No local mock pipeline overrides are masking the same business or service");
  process.exitCode = 1;
}

function parseArgs(args: string[]): VerifyOptions {
  return {
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printUsage() {
  console.info("Usage: npm run db:verify:hybrid-read");
  console.info("");
  console.info(
    "Exercises Eden's async hybrid read boundary and reports whether targeted surfaces observe diverged PostgreSQL records or mock fallback values.",
  );
}

function evaluateTextCheck(
  surface: string,
  field: string,
  expected: string,
  observed: string,
  mockBaseline: string,
): VerificationResult {
  return {
    surface,
    field,
    expected,
    observed,
    mockBaseline,
    status: resolveStatus(expected, observed, mockBaseline),
  };
}

function evaluateBooleanCheck(
  surface: string,
  field: string,
  expected: string,
  observed: string,
  mockBaseline: string,
): VerificationResult {
  return {
    surface,
    field,
    expected,
    observed,
    mockBaseline,
    status: resolveStatus(expected, observed, mockBaseline),
  };
}

function resolveStatus(
  expected: string,
  observed: string,
  mockBaseline: string,
): VerificationStatus {
  if (observed === expected && expected !== mockBaseline) {
    return "persistent_divergence_observed";
  }

  if (observed === mockBaseline) {
    return "mock_fallback_observed";
  }

  return "inconclusive";
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown hybrid read verification failure";

  console.error(`[eden-hybrid-read-verify] ${message}`);
  process.exitCode = 1;
});

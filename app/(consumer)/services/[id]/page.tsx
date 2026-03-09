import { isBusinessFrozen } from "@/modules/core/admin/mock-admin-state";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
import {
  getRecentUserTransactionHistory,
  getUserCreditsBalance,
} from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import {
  formatPipelineTimestamp,
  getBusinessPipelineSnapshot,
  getPipelineStatusLabel,
  getRecentPipelineEvents,
  getStoredPipelineServiceStatus,
} from "@/modules/core/pipeline/mock-pipeline";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";
import {
  defaultServiceId,
} from "@/modules/core/mock-data";
import {
  formatServicePricingLabel,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import {
  loadBusinessById,
  loadDiscoveryBusinessForService,
  loadDiscoveryServiceById,
  loadServiceById,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";
import { ServiceUsagePanel } from "@/ui/consumer/components/service-usage-panel";

type SearchValue = string | string[] | undefined;

type ServiceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, SearchValue>>;
};

function getFirstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTags(value: SearchValue, fallbackCategory: string) {
  const rawValue = getFirstValue(value);
  if (!rawValue) {
    return [fallbackCategory, "Service Placeholder"];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getServiceStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("publish")) {
    return "success" as const;
  }

  if (normalizedStatus.includes("ready")) {
    return "info" as const;
  }

  if (normalizedStatus.includes("testing") || normalizedStatus.includes("recommend")) {
    return "warning" as const;
  }

  if (normalizedStatus.includes("standby")) {
    return "default" as const;
  }

  return "info" as const;
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: ServiceDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const [session, simulatedTransactions, pipelineRecords, pipelineEvents, adminState, createdBusiness, workspaceServices] = await Promise.all([
    getServerSession(),
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockPipelineEvents(),
    getMockAdminState(),
    getMockCreatedBusiness(),
    getMockWorkspaceServices(),
  ]);
  const fallbackService =
    await loadDiscoveryServiceById(defaultServiceId, {
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }) ??
    await loadServiceById(defaultServiceId);
  const service =
    await loadDiscoveryServiceById(id, {
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }) ?? fallbackService;
  const business = service
    ? await loadDiscoveryBusinessForService(service, {
        pipelineRecords,
        createdBusiness,
        workspaceServices,
      }) ??
      await loadBusinessById(service.businessId, {
        createdBusiness,
      })
    : null;
  const businessFrozen = business ? isBusinessFrozen(business.id, adminState) : false;
  const pipelineSnapshot =
    service && business
      ? getBusinessPipelineSnapshot(
          {
            businessId: business.id,
            userId: business.ownerUserId,
          },
          simulatedTransactions,
          pipelineRecords,
          createdBusiness,
          workspaceServices,
        )
      : null;
  const pipelineStatusOverride =
    service && business ? getStoredPipelineServiceStatus(business.id, service.id, pipelineRecords) : null;
  const recentEvents = service
    ? getRecentPipelineEvents(
        {
          serviceId: service.id,
          limit: 4,
        },
        pipelineEvents,
      )
    : [];

  const title = getFirstValue(resolvedSearchParams.title) ?? service?.title ?? toTitleCase(id);
  const category =
    getFirstValue(resolvedSearchParams.category) ?? service?.category ?? "Service Placeholder";
  const summary =
    getFirstValue(resolvedSearchParams.summary) ??
    service?.summary ??
    "This is a mocked service detail surface used to connect Ask Eden and owner inspection routes.";
  const status =
    pipelineStatusOverride
      ? getPipelineStatusLabel(pipelineStatusOverride)
      : getFirstValue(resolvedSearchParams.status) ?? service?.status ?? "Available in Preview";
  const businessName =
    getFirstValue(resolvedSearchParams.business) ?? business?.name ?? "Connected Business";
  const businessId = getFirstValue(resolvedSearchParams.businessId) ?? business?.id ?? "business-01";
  const tags = parseTags(resolvedSearchParams.tags, service?.tags[0] ?? category);
  const displayStatus = businessFrozen ? "Business Frozen" : status;
  const displayTags =
    businessFrozen && !tags.includes("Owner Hold") ? [...tags, "Owner Hold"] : tags;
  const pricing = resolveServicePricing({
    pricePerUse: service?.pricePerUse,
    pricingType: service?.pricingType,
    pricingUnit: service?.pricingUnit,
    pricingModel: service?.pricingModel,
  });
  const pricingLabel = formatServicePricingLabel(
    {
      pricePerUse: service?.pricePerUse,
      pricingType: service?.pricingType,
      pricingUnit: service?.pricingUnit,
      pricingModel: service?.pricingModel,
    },
    {
      fallbackLabel: service?.pricingModel
        ? `${service.pricingModel} pricing placeholder`
        : "Pricing placeholder pending",
      includePricingModel: true,
    },
  );
  const pricingUnitLabel =
    pricing.pricingType === "per_session"
      ? `${pricing.pricingUnit} per session`
      : `${pricing.pricingUnit} per use`;
  const consumerAvailabilityLabel = businessFrozen
    ? "Temporarily unavailable"
    : pipelineStatusOverride === "published" || pipelineSnapshot?.status === "published"
      ? "Published and available"
      : pipelineStatusOverride === "ready" || pipelineSnapshot?.status === "ready"
        ? "Ready for launch"
        : "Preview availability";
  const consumerAvailabilityDetail = businessFrozen
    ? "This service is currently blocked by an owner freeze on the linked business."
    : pipelineStatusOverride === "published" || pipelineSnapshot?.status === "published"
      ? "This service is live in Eden discovery and can be run through the credits wallet flow right now."
      : pipelineStatusOverride === "ready" || pipelineSnapshot?.status === "ready"
        ? "This service is almost live. The current route remains a preview of the launch-ready experience."
        : "This route is still showing a pre-launch or preview state for the service.";
  const currentUserBalanceCredits = getUserCreditsBalance(
    session.user.id,
    simulatedTransactions,
  );
  const recentTransactions = getRecentUserTransactionHistory(
    {
      userId: session.user.id,
      limit: 6,
    },
    simulatedTransactions,
    createdBusiness,
    workspaceServices,
  );

  return (
    <DetailPlaceholderPanel
      eyebrow="Service Detail"
      title={title}
      description="Consumer-facing placeholder route for a service surfaced through Ask Eden or owner inspection."
      status={displayStatus}
      statusTone={businessFrozen ? "danger" : getServiceStatusTone(status)}
      tags={displayTags}
      summary={summary}
      metadata={[
        { label: "Category", value: category },
        { label: "Business", value: businessName },
        { label: "Price per use", value: pricingLabel },
        {
          label: "Pricing unit",
          value: pricing.hasStoredPrice ? pricingUnitLabel : "Mock fallback usage rate",
        },
        { label: "Admin State", value: businessFrozen ? "Business frozen" : "Active" },
        { label: "Status Source", value: service?.status ?? "Route override" },
        {
          label: "Release State",
          value: pipelineSnapshot ? getPipelineStatusLabel(pipelineSnapshot.status) : "Preview only",
        },
        { label: "Route ID", value: id },
      ]}
      actions={[
        { label: "Open Business", href: `/businesses/${businessId}` },
        { label: "Start Building", href: "/business" },
        { label: "Back to Ask Eden", href: "/consumer", tone: "secondary" },
      ]}
      backHref="/consumer"
      backLabel="Back to Ask Eden"
      note={
        businessFrozen
          ? "All content on this page is mocked. The linked business is currently under a local owner freeze overlay."
          : "All content on this page is mocked. The price shown below is the exact Eden Credits amount used for service runs, and no hidden checkout or background payment happens during usage."
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.4),rgba(255,255,255,0.96))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Launch clarity
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  This service route makes the core consumer promise explicit before the run starts: availability, price, and wallet behavior are visible up front.
                </p>
              </div>
              <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-xs text-eden-muted">
                {consumerAvailabilityLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-eden-edge bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Availability</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  {consumerAvailabilityLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {consumerAvailabilityDetail}
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Visible price</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">{pricingLabel}</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  {pricing.hasStoredPrice
                    ? `Consumers see ${pricingUnitLabel} before the service can run.`
                    : "This route is still using a mocked fallback usage rate."}
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Billing model</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">Eden Credits only</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Service runs deduct credits from the wallet. Stripe only appears if the user explicitly chooses to top up.
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Current wallet</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  {currentUserBalanceCredits.toLocaleString()} credits
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  The wallet panel below shows the resulting balance change after each service run or top-up.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              First-time user guide
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-sm font-semibold text-eden-ink">1. Check availability and price</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Eden shows whether the service is live and exactly what the credits price is before anything runs.
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-sm font-semibold text-eden-ink">2. Compare balance to price</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Match the visible service price against your current Eden Wallet balance before you decide to run.
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-sm font-semibold text-eden-ink">3. Add credits only if needed</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Add credits through the wallet flow if your balance is low. No hidden payment happens when you press run.
                </p>
              </div>
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                <p className="text-sm font-semibold text-eden-ink">4. Run the service</p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  A successful run deducts the visible credits amount, records usage, and updates the wallet history immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        <ServiceUsagePanel
          serviceId={service?.id ?? null}
          businessId={business?.id ?? businessId}
          serviceTitle={service?.title ?? title}
          summary={summary}
          currentBalanceCredits={currentUserBalanceCredits}
          recentTransactions={recentTransactions}
          pricePerUse={service?.pricePerUse ?? null}
          pricingType={service?.pricingType ?? null}
          pricingUnit={service?.pricingUnit ?? null}
          pricingModel={service?.pricingModel ?? null}
          availabilityLabel={consumerAvailabilityLabel}
          availabilityDetail={consumerAvailabilityDetail}
          disabled={businessFrozen || !service}
          disabledReason={
            businessFrozen
              ? "This service is currently under a mocked owner freeze through its linked business."
              : !service
                ? "This route is still using a placeholder service shell. A canonical service record is required before usage can be recorded."
                : undefined
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Current Release State
            </p>
            <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
              {businessFrozen ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                  The linked business is under a mocked owner freeze hold. Release state remains
                  visible for inspection.
                </div>
              ) : null}
              <p className="text-sm font-semibold text-eden-ink">{service?.title ?? title}</p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">
                {pipelineSnapshot?.lastActionLabel ??
                  "This service is currently using its shared mock-data release state."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Readiness</p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {pipelineSnapshot?.readinessPercent ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Updated</p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {pipelineSnapshot?.updatedAtLabel ?? "Shared mock data"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
              Recent Transition History
            </p>
            <div className="mt-4 space-y-3">
              {recentEvents.length ? (
                recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-eden-edge bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-eden-ink">
                          {getPipelineStatusLabel(event.previousStatus)} to{" "}
                          {getPipelineStatusLabel(event.newStatus)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">{event.detail}</p>
                      </div>
                      <span className="text-xs text-eden-muted">{event.actor}</span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                      {formatPipelineTimestamp(event.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                  No mocked service transitions have been recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DetailPlaceholderPanel>
  );
}

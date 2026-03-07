import { isBusinessFrozen } from "@/modules/core/admin/mock-admin-state";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
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
  loadDiscoveryBusinessForService,
  loadDiscoveryServiceById,
  loadServiceById,
  getBusinessForService,
} from "@/modules/core/services";

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
  const [simulatedTransactions, pipelineRecords, pipelineEvents, adminState, createdBusiness, workspaceServices] = await Promise.all([
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
      getBusinessForService(service, {
        createdBusiness,
        workspaceServices,
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
          : "All content on this page is mocked. The route exists to connect Eden's consumer, business, and owner layers before any backend detail models are introduced."
      }
    >
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
    </DetailPlaceholderPanel>
  );
}

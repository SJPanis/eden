import { isBusinessFrozen } from "@/modules/core/admin/mock-admin-state";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
import {
  getBusinessById,
  getBusinessOwner,
  getDiscoveryBusinessById,
} from "@/modules/core/mock-data";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import {
  formatPipelineTimestamp,
  getBusinessPipelineSnapshot,
  getPipelineStatusLabel,
  getRecentPipelineEvents,
} from "@/modules/core/pipeline/mock-pipeline";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";

type SearchValue = string | string[] | undefined;

type BusinessDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, SearchValue>>;
};

function getFirstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTags(value: SearchValue, fallback: string[]) {
  const rawValue = getFirstValue(value);
  if (!rawValue) {
    return fallback;
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

export default async function BusinessDetailPage({
  params,
  searchParams,
}: BusinessDetailPageProps) {
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
  const business =
    getDiscoveryBusinessById(id, {
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }) ?? getBusinessById(id);
  const ownerRecord = business ? getBusinessOwner(business, createdBusiness) : null;
  const businessFrozen = business ? isBusinessFrozen(business.id, adminState) : false;
  const pipelineSnapshot = business
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
  const recentEvents = business
    ? getRecentPipelineEvents(
        {
          businessId: business.id,
          limit: 4,
        },
        pipelineEvents,
      )
    : [];

  const name = getFirstValue(resolvedSearchParams.name) ?? business?.name ?? toTitleCase(id);
  const tags = parseTags(resolvedSearchParams.tags, business?.tags ?? ["Business Placeholder"]);
  const summary =
    getFirstValue(resolvedSearchParams.summary) ??
    business?.summary ??
    "This is a mocked business detail route connecting consumer discovery with owner-side inspection.";
  const status =
    pipelineSnapshot
      ? getPipelineStatusLabel(pipelineSnapshot.status)
      : getFirstValue(resolvedSearchParams.status) ?? business?.status ?? "Preview";
  const owner =
    getFirstValue(resolvedSearchParams.owner) ?? ownerRecord?.displayName ?? "Platform Owner";
  const featuredServiceId =
    getFirstValue(resolvedSearchParams.serviceId) ?? business?.featuredServiceId ?? "service-01";
  const displayStatus = businessFrozen ? "Frozen" : toTitleCase(status);
  const displayTags =
    businessFrozen && !tags.includes("Owner Hold") ? [...tags, "Owner Hold"] : tags;

  return (
    <DetailPlaceholderPanel
      eyebrow="Business Detail"
      title={name}
      description="Business-facing placeholder route used by Ask Eden, owner inspection, and cross-layer exploration."
      status={displayStatus}
      statusTone={
        businessFrozen
          ? "danger"
          : status.toLowerCase().includes("publish")
          ? "success"
          : status.toLowerCase().includes("ready")
            ? "info"
          : status.toLowerCase().includes("testing")
            ? "warning"
            : "default"
      }
      tags={displayTags}
      summary={summary}
      metadata={[
        { label: "Owner", value: owner },
        { label: "Primary Category", value: tags[0] ?? "Business Placeholder" },
        { label: "Admin State", value: businessFrozen ? "Frozen" : "Active" },
        { label: "Visibility", value: pipelineSnapshot?.visibilityLabel ?? business?.visibility ?? "Placeholder only" },
        {
          label: "Release State",
          value: pipelineSnapshot ? getPipelineStatusLabel(pipelineSnapshot.status) : "Preview only",
        },
        { label: "Route ID", value: id },
      ]}
      actions={[
        { label: "View Service", href: `/services/${featuredServiceId}` },
        { label: "Start Building", href: "/business" },
        { label: "Back to Ask Eden", href: "/consumer", tone: "secondary" },
      ]}
      backHref="/consumer"
      backLabel="Back to Ask Eden"
      note={
        businessFrozen
          ? "This page is intentionally mocked. The business is currently under a local owner freeze overlay while release data remains visible for inspection."
          : "This page is intentionally mocked. It gives Eden a connected business-detail surface before real business profiles and service catalogs are wired in."
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Release State
          </p>
          <div className="mt-4 rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            {businessFrozen ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                This business is under a mocked owner freeze hold. Release history remains visible,
                but the workspace is flagged as frozen in the shared admin state.
              </div>
            ) : null}
            <p className="text-sm font-semibold text-eden-ink">
              {pipelineSnapshot?.service?.title ?? business?.name ?? "Active release target"}
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              {pipelineSnapshot?.lastActionLabel ??
                "This business is still using shared mock data without a local release transition."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-eden-edge bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">Readiness</p>
                <p className="mt-2 text-sm font-semibold text-eden-ink">
                  {pipelineSnapshot?.readinessPercent ?? business?.publishReadinessPercent ?? 0}%
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
                No mocked business release transitions have been recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </DetailPlaceholderPanel>
  );
}

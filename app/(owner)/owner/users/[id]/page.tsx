import {
  isBusinessFrozen,
  isUserFrozen,
} from "@/modules/core/admin/mock-admin-state";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
import { formatCredits, getBusinessesForOwner, getUserById } from "@/modules/core/mock-data";
import { getUserCreditsBalance } from "@/modules/core/credits/mock-credits";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import {
  getBusinessPipelineSnapshot,
  formatPipelineTimestamp,
  getPipelineStatusLabel,
  getRecentPipelineEvents,
} from "@/modules/core/pipeline/mock-pipeline";
import { getMockPipelineEvents, getMockPipelineRecords } from "@/modules/core/pipeline/server";

type OwnerUserInspectionPageProps = {
  params: Promise<{ id: string }>;
};

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function OwnerUserInspectionPage({
  params,
}: OwnerUserInspectionPageProps) {
  const { id } = await params;
  const [simulatedTransactions, pipelineRecords, pipelineEvents, adminState, workspaceServices] = await Promise.all([
    getSimulatedTransactions(),
    getMockPipelineRecords(),
    getMockPipelineEvents(),
    getMockAdminState(),
    getMockWorkspaceServices(),
  ]);
  const user = getUserById(id);
  const ownedBusinesses = getBusinessesForOwner(id);
  const userFrozen = user ? isUserFrozen(user.id, adminState) : false;
  const primaryBusiness = ownedBusinesses[0] ?? null;
  const releaseCards = ownedBusinesses.map((business) => ({
    business,
    isFrozen: isBusinessFrozen(business.id, adminState),
    snapshot: getBusinessPipelineSnapshot(
      {
        businessId: business.id,
        userId: business.ownerUserId,
      },
      simulatedTransactions,
      pipelineRecords,
      undefined,
      workspaceServices,
    ),
    events: getRecentPipelineEvents(
      {
        businessId: business.id,
        limit: 3,
      },
      pipelineEvents,
    ),
  }));

  const username = user?.username ?? toTitleCase(id);
  const status = userFrozen
    ? "Frozen"
    : user
      ? toTitleCase(user.status)
      : "Inspection Placeholder";
  const role = user ? toTitleCase(user.role) : "Unknown";
  const edenBalance = user
    ? formatCredits(getUserCreditsBalance(user.id, simulatedTransactions))
    : "0 credits";
  const summary =
    user?.summary ??
    "This is a mocked owner inspection route used to connect user records to the wider Eden platform shell.";

  return (
    <DetailPlaceholderPanel
      eyebrow="User Inspection"
      title={username}
      description="Owner-only placeholder inspection route for user records, balances, and review controls."
      status={status}
      statusTone={
        userFrozen
          ? "danger"
          : status.toLowerCase().includes("active")
          ? "success"
          : status.toLowerCase().includes("review")
            ? "warning"
            : "default"
      }
      tags={[role, "Owner Inspection", userFrozen ? "Frozen Account" : "Active Account"]}
      summary={summary}
      metadata={[
        { label: "Role", value: role },
        { label: "Admin State", value: userFrozen ? "Frozen" : "Active" },
        { label: "Eden Balance", value: edenBalance },
        { label: "Linked Businesses", value: primaryBusiness ? `${ownedBusinesses.length}` : "0" },
        {
          label: "Primary Release State",
          value:
            releaseCards[0]?.snapshot
              ? getPipelineStatusLabel(releaseCards[0].snapshot.status)
              : "No business workspace",
        },
        { label: "Route ID", value: id },
      ]}
      actions={[
        { label: "Return to Control Room", href: "/owner" },
        {
          label: primaryBusiness ? "Inspect Linked Business" : "Open Business Layer",
          href: primaryBusiness ? `/businesses/${primaryBusiness.id}` : "/business",
        },
        { label: "Review Security Controls", href: "/owner#security-controls", tone: "secondary" },
      ]}
      backHref="/owner"
      backLabel="Back to Control Room"
      note={
        userFrozen
          ? "This inspection page is mocked and read-only. The current account is under a local owner freeze overlay."
          : "This inspection page is mocked and read-only. It exists so owner records can participate in the same connected navigation shell as consumer and business routes."
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Owned Workspaces
          </p>
          <div className="mt-4 space-y-3">
            {releaseCards.length ? (
              releaseCards.map((entry) => (
                <div
                  key={entry.business.id}
                  className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">{entry.business.name}</p>
                      <p className="mt-1 text-sm text-eden-muted">{entry.business.category}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        entry.isFrozen
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      {entry.isFrozen
                        ? "Frozen"
                        : entry.snapshot
                          ? getPipelineStatusLabel(entry.snapshot.status)
                          : toTitleCase(entry.business.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {entry.snapshot?.service?.title ?? "Active service"} at{" "}
                    {entry.snapshot?.readinessPercent ?? entry.business.publishReadinessPercent}% readiness.
                  </p>
                  {entry.isFrozen ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-rose-700">
                      Owner hold active
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                This user does not currently own a mocked business workspace.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Recent Release History
          </p>
          <div className="mt-4 space-y-3">
            {releaseCards.flatMap((entry) => entry.events).length ? (
              releaseCards.flatMap((entry) =>
                entry.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-eden-edge bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-eden-ink">
                          {entry.business.name}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-eden-muted">{event.detail}</p>
                      </div>
                      <span className="text-xs text-eden-muted">{event.actor}</span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-eden-muted">
                      {getPipelineStatusLabel(event.previousStatus)} to{" "}
                      {getPipelineStatusLabel(event.newStatus)} -{" "}
                      {formatPipelineTimestamp(event.timestamp)}
                    </p>
                  </div>
                )),
              )
            ) : (
              <div className="rounded-2xl border border-eden-edge bg-white p-4 text-sm leading-6 text-eden-muted">
                No mocked release transitions have been recorded for this user yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </DetailPlaceholderPanel>
  );
}


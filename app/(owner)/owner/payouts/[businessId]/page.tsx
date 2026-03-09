import { notFound } from "next/navigation";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import {
  buildBusinessPayoutAccountingSummary,
  loadBusinessServiceUsageMetrics,
  loadBusinessWorkspaceOverview,
} from "@/modules/core/services";
import { OwnerPayoutDetailPanel } from "@/ui/owner/payout-detail-panel";

type OwnerPayoutDetailPageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function OwnerPayoutDetailPage({
  params,
}: OwnerPayoutDetailPageProps) {
  const { businessId } = await params;

  await requireMockAccess(
    layerAccessRules.owner ?? [],
    `/owner/payouts/${businessId}`,
  );

  const [simulatedTransactions, pipelineRecords, createdBusiness, workspaceServices] =
    await Promise.all([
      getSimulatedTransactions(),
      getMockPipelineRecords(),
      getMockCreatedBusiness(),
      getMockWorkspaceServices(),
    ]);
  const [workspaceOverview, usageMetrics] = await Promise.all([
    loadBusinessWorkspaceOverview(businessId, {
      createdBusiness,
      workspaceServices,
    }),
    loadBusinessServiceUsageMetrics(businessId, {
      simulatedTransactions,
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    }),
  ]);

  if (!workspaceOverview.businessProfile) {
    notFound();
  }

  const payoutAccounting = await buildBusinessPayoutAccountingSummary(usageMetrics, {
    createdBusiness,
    workspaceServices,
  });

  return (
    <OwnerPayoutDetailPanel
      businessProfile={workspaceOverview.businessProfile}
      businessOwner={workspaceOverview.businessOwner}
      payoutAccounting={payoutAccounting}
    />
  );
}

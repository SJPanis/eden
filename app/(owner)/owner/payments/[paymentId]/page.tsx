import { notFound } from "next/navigation";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { loadOwnerCreditsTopUpPaymentDetail } from "@/modules/core/services";
import { OwnerPaymentDetailPanel } from "@/ui/owner/payment-detail-panel";

type OwnerPaymentDetailPageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function OwnerPaymentDetailPage({
  params,
}: OwnerPaymentDetailPageProps) {
  const { paymentId } = await params;

  await requireMockAccess(
    layerAccessRules.owner ?? [],
    `/owner/payments/${paymentId}`,
  );

  const paymentDetail = await loadOwnerCreditsTopUpPaymentDetail(paymentId);

  if (!paymentDetail) {
    notFound();
  }

  return <OwnerPaymentDetailPanel paymentDetail={paymentDetail} />;
}

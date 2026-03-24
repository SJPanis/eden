import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getBusinessesForOwner } from "@/modules/core/mock-data";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { ConsumerProjectsPanel } from "@/ui/consumer/consumer-projects-panel";

export default async function ProjectsPage() {
  const session = await requireMockAccess(layerAccessRules.consumer ?? [], "/consumer/projects");
  const [createdBusiness, sessionBusinesses] = await Promise.all([
    getMockCreatedBusiness(),
    Promise.resolve(getBusinessesForOwner(session.user.id)),
  ]);

  const businesses = sessionBusinesses.map((biz) => ({
    id: biz.id,
    name: biz.name,
    tagline: biz.tagline,
    status: biz.status,
    visibility: biz.visibility,
    publishReadinessPercent: biz.publishReadinessPercent,
    featuredServiceId: biz.featuredServiceId,
    creditBalanceCredits: biz.creditBalanceCredits,
  }));

  return (
    <ConsumerProjectsPanel
      session={session}
      businesses={businesses}
      createdBusiness={createdBusiness}
    />
  );
}

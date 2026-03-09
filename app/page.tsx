import { redirect } from "next/navigation";
import { getMockAdminState } from "@/modules/core/admin/server";
import { EdenEntryPanel } from "@/ui/entry/eden-entry-panel";
import { getCanonicalRouteForRole } from "@/modules/core/session/access-control";
import {
  getMockOnboardingProfile,
  getServerSession,
} from "@/modules/core/session/server";

export default async function Home() {
  const [session, adminState, onboardingProfile] = await Promise.all([
    getServerSession(),
    getMockAdminState(),
    getMockOnboardingProfile(),
  ]);

  if (session.auth.source === "persistent") {
    redirect(getCanonicalRouteForRole(session.role));
  }

  return (
    <EdenEntryPanel
      session={session}
      onboardingProfile={onboardingProfile}
      maintenanceMode={adminState.maintenanceMode}
    />
  );
}

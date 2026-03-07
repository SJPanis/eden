import { getMockAdminState } from "@/modules/core/admin/server";
import { EdenEntryPanel } from "@/ui/entry/eden-entry-panel";
import {
  getMockOnboardingProfile,
  getMockSession,
} from "@/modules/core/session/server";

export default async function Home() {
  const [session, adminState, onboardingProfile] = await Promise.all([
    getMockSession(),
    getMockAdminState(),
    getMockOnboardingProfile(),
  ]);

  return (
    <EdenEntryPanel
      session={session}
      onboardingProfile={onboardingProfile}
      maintenanceMode={adminState.maintenanceMode}
    />
  );
}

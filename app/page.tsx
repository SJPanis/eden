import { redirect } from "next/navigation";
import { getMockAdminState } from "@/modules/core/admin/server";
import { EdenPublicAuthPanel } from "@/ui/entry/eden-public-auth-panel";
import { getCanonicalRouteForRole } from "@/modules/core/session/access-control";
import { getServerSession } from "@/modules/core/session/server";

export default async function Home() {
  const [session, adminState] = await Promise.all([
    getServerSession(),
    getMockAdminState(),
  ]);

  if (session.auth.source === "persistent") {
    redirect("/consumer");
  }

  return (
    <EdenPublicAuthPanel
      maintenanceMode={adminState.maintenanceMode}
    />
  );
}

import { getMockAdminState } from "@/modules/core/admin/server";
import { EdenHomepage } from "@/ui/entry/eden-homepage";

export default async function Home() {
  const adminState = await getMockAdminState();
  return <EdenHomepage maintenanceMode={adminState.maintenanceMode} />;
}

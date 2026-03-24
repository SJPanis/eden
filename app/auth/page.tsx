import { redirect } from "next/navigation";
import { getMockAdminState } from "@/modules/core/admin/server";
import { getServerSession } from "@/modules/core/session/server";
import { EdenAuthPage } from "@/ui/entry/eden-auth-page";

type AuthPageProps = {
  searchParams: Promise<{ auth?: string; callbackUrl?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const [session, adminState] = await Promise.all([getServerSession(), getMockAdminState()]);

  if (session.auth.source === "persistent") {
    redirect(params.callbackUrl ?? "/consumer");
  }

  return (
    <EdenAuthPage
      maintenanceMode={adminState.maintenanceMode}
      initialMode={params.auth === "signin" ? "signin" : "signup"}
      callbackUrl={params.callbackUrl ?? "/consumer"}
      earlyAccessEnabled={process.env.EDEN_EARLY_ACCESS_ENABLED === "true"}
    />
  );
}

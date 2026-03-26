import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { SpotSplorePanel } from "@/ui/services/spot-splore-panel";

export default async function SpotSplorePage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/services/spot-splore");
  }

  return (
    <SpotSplorePanel
      username={session.user.username}
      displayName={session.user.displayName}
      balanceCredits={session.user.edenBalanceCredits}
    />
  );
}

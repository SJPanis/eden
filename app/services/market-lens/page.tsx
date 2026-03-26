import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { MarketLensPanel } from "@/ui/services/market-lens-panel";

export default async function MarketLensPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/services/market-lens");
  }

  return (
    <MarketLensPanel
      username={session.user.username}
      displayName={session.user.displayName}
      balanceCredits={session.user.edenBalanceCredits}
    />
  );
}

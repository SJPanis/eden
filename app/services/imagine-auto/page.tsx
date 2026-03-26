import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { ImagineAutoPanel } from "@/ui/services/imagine-auto-panel";

export default async function ImagineAutoPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/services/imagine-auto");
  }

  return (
    <ImagineAutoPanel
      username={session.user.username}
      displayName={session.user.displayName}
      balanceCredits={session.user.edenBalanceCredits}
    />
  );
}

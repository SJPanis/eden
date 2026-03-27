import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { ImagineAutoPanel } from "@/ui/services/imagine-auto-panel";

export default async function ImagineAutoPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/services/imagine-auto");
  }

  const user = await getPrismaClient().user.findUnique({
    where: { id: session.user.id },
    select: { edenBalanceCredits: true },
  });

  return (
    <ImagineAutoPanel
      username={session.user.username}
      displayName={session.user.displayName}
      balanceCredits={user?.edenBalanceCredits ?? 0}
    />
  );
}

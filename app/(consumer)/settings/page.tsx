import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { formatLeaves } from "@/modules/core/credits/eden-currency";
import { SettingsPanel } from "@/ui/settings/settings-panel";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/settings");
  }

  const user = await getPrismaClient().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      edenBalanceCredits: true,
    },
  });

  if (!user) {
    redirect("/auth?callbackUrl=/settings");
  }

  const balanceLabel = formatLeaves(user.edenBalanceCredits ?? 0);

  return (
    <div className="eden-grid min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#14989a]">Your Account</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Settings</h1>
        </div>
        <SettingsPanel
          displayName={user.displayName}
          username={user.username}
          role={user.role}
          balanceLabel={balanceLabel}
          authSource={session.auth.source}
        />
      </div>
    </div>
  );
}

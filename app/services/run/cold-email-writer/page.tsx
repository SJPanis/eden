import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { ColdEmailRunner } from "@/ui/services/cold-email-runner";

export default async function ColdEmailWriterPage() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") redirect("/auth");
  return <ColdEmailRunner balance={session.user.edenBalanceCredits} />;
}

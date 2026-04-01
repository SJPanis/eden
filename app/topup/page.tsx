import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { TopUpPanel } from "./topup-panel";

export default async function TopUpPage() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    redirect("/auth");
  }
  return <TopUpPanel balance={session.user.edenBalanceCredits} />;
}

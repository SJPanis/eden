import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { SimonOSPage } from "@/modules/services/simonos/simonos-page";

export default async function SimonOSRoute() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") redirect("/auth");
  return <SimonOSPage balance={session.user.edenBalanceCredits} />;
}

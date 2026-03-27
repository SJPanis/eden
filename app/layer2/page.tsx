import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { Layer2Dashboard } from "./layer2-dashboard";

export default async function Layer2Page() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    redirect("/consumer");
  }

  return <Layer2Dashboard />;
}

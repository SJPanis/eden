import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { CommandCenter } from "./command-center";

export default async function CommandPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    redirect("/consumer");
  }

  return <CommandCenter username={session.user.username} />;
}

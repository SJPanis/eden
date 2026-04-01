import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { ServiceBuilder } from "./service-builder";

export default async function NewServicePage() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") redirect("/auth");
  return <ServiceBuilder username={session.user.username} />;
}

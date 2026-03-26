import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/core/session/server";
import { EdenGarden } from "@/ui/garden/eden-garden";

export default async function GardenPage() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    redirect("/auth?callbackUrl=/garden");
  }

  return (
    <EdenGarden
      username={session.user.username}
      role={session.user.role}
    />
  );
}

import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { ReleasesPanel } from "./releases-panel";

export default async function ReleasesPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") redirect("/auth");
  const { slug } = await params;
  return <ReleasesPanel slug={slug} />;
}

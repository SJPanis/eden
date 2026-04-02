import { getServerSession } from "@/modules/core/session/server";
import { redirect } from "next/navigation";
import { ContributionsPanel } from "./contributions-panel";

export default async function ContributionsPage() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") redirect("/auth");
  return <ContributionsPanel />;
}

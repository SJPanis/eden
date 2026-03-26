import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { CreatorProfilePanel } from "@/ui/profile/creator-profile-panel";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  let user: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: Date;
    edenBalanceCredits: number;
    referralsMade: { id: string }[];
  } | null = null;

  try {
    user = await getPrismaClient().user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        edenBalanceCredits: true,
        referralsMade: { select: { id: true } },
      },
    });
  } catch {
    // DB not available — fall through to notFound
  }

  if (!user) {
    notFound();
  }

  // Count published services for this user's businesses
  let publishedServiceCount = 0;
  try {
    const businesses = await getPrismaClient().business.findMany({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (businesses.length > 0) {
      publishedServiceCount = await getPrismaClient().service.count({
        where: {
          businessId: { in: businesses.map((b) => b.id) },
          status: "PUBLISHED",
        },
      });
    }
  } catch {
    // Silently fail — show 0
  }

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#0b1622" }}>
      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/consumer"
          className="text-xs uppercase tracking-[0.14em] text-[#2dd4bf] transition-colors hover:text-white"
        >
          &#8592; Eden
        </Link>
      </div>

      <CreatorProfilePanel
        username={user.username}
        displayName={user.displayName}
        role={user.role.toLowerCase() as "consumer" | "business" | "owner"}
        joinedAt={user.createdAt.toISOString()}
        publishedServices={publishedServiceCount}
        totalLeafsEarned={user.edenBalanceCredits}
        membersReferred={user.referralsMade.length}
      />
    </div>
  );
}

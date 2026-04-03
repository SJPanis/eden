import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

const WELCOME_LEAFS = 50;

export async function POST() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { welcomeGranted: true },
    });

    if (user?.welcomeGranted) {
      return NextResponse.json({ ok: true, granted: 0, message: "Already granted" });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        edenBalanceCredits: { increment: WELCOME_LEAFS },
        welcomeGranted: true,
      },
    });

    return NextResponse.json({ ok: true, granted: WELCOME_LEAFS });
  } catch {
    // welcomeGranted column may not exist yet — skip silently
    return NextResponse.json({ ok: true, granted: 0 });
  }
}

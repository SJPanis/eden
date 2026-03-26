import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const PLACEHOLDER_URLS: Record<string, string> = {
  windows: "https://github.com/SJPanis/eden/releases/download/v0.1.0/Eden.Setup.0.1.0.exe",
  mac: "https://github.com/SJPanis/eden/releases/download/v0.1.0/Eden-0.1.0.dmg",
};

type RouteParams = { params: Promise<{ platform: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { platform } = await params;
  const normalizedPlatform = platform.toLowerCase();

  const redirectUrl = PLACEHOLDER_URLS[normalizedPlatform];
  if (!redirectUrl) {
    return NextResponse.json(
      { error: "Unsupported platform. Use /download/windows or /download/mac." },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? null;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? null;

  try {
    await getPrismaClient().download.create({
      data: {
        platform: normalizedPlatform,
        userAgent,
        ip,
      },
    });
  } catch {
    // Log failure should not block the download redirect
  }

  return NextResponse.redirect(redirectUrl, 302);
}

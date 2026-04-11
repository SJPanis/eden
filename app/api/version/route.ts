import { NextResponse } from "next/server";

import { getLatestClientVersion } from "@/modules/core/releases/client-version-service";

// GET /api/version
// Contract: docs/PHASE_01_API_CONTRACT.md §3.1
//
// Unauthenticated. Unity calls this before login on every launch to decide
// whether to trigger the forced-update flow or proceed to login. Returns the
// most recent ClientVersion row, optionally filtered to a single platform via
// ?platform=windows|macos|linux.
//
// If no row exists, returns 503 NO_RELEASE — the backend is up but no Unity
// client build has been registered yet. Operator should run
// `railway run npx tsx scripts/seed-initial-client-version.ts` or POST
// /api/admin/release.

export const runtime = "nodejs";

type PlatformFilter = "windows" | "macos" | "linux";
const PLATFORM_FILTERS: readonly PlatformFilter[] = ["windows", "macos", "linux"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform")?.toLowerCase() ?? null;
  const platformFilter: PlatformFilter | null =
    platformParam && (PLATFORM_FILTERS as readonly string[]).includes(platformParam)
      ? (platformParam as PlatformFilter)
      : null;

  if (platformParam && !platformFilter) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PLATFORM_UNSUPPORTED",
          message: `Unknown platform '${platformParam}'. Supported: windows, macos, linux.`,
        },
      },
      { status: 400 },
    );
  }

  const snapshot = await getLatestClientVersion();

  if (!snapshot) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NO_RELEASE",
          message:
            "No Eden client version has been registered yet. Seed one via scripts/seed-initial-client-version.ts or POST /api/admin/release.",
        },
      },
      { status: 503 },
    );
  }

  const filteredPlatforms = platformFilter
    ? snapshot.platforms[platformFilter]
      ? { [platformFilter]: snapshot.platforms[platformFilter] }
      : {}
    : snapshot.platforms;

  return NextResponse.json(
    {
      ok: true,
      data: {
        version: snapshot.version,
        minimumSupportedVersion: snapshot.minimumSupportedVersion,
        required: snapshot.required,
        platform: filteredPlatforms,
        changelog: snapshot.changelog,
        assetManifest: snapshot.assetManifest,
        releasedAt: snapshot.releasedAt,
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=30",
      },
    },
  );
}

import "server-only";

import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

// Client-version service. Reads / writes the ClientVersion table that backs
// GET /api/version for the Unity client auto-update flow
// (docs/PHASE_01_API_CONTRACT.md §3).

export type PlatformBuildEntry = {
  url: string;
  sha256: string;
  size: number;
};

export type PlatformBuildMap = {
  windows?: PlatformBuildEntry;
  macos?: PlatformBuildEntry;
  linux?: PlatformBuildEntry;
};

export type ClientVersionSnapshot = {
  version: string;
  minimumSupportedVersion: string;
  required: boolean;
  platforms: PlatformBuildMap;
  changelog: string | null;
  assetManifest: Record<string, number> | null;
  releasedAt: string;
};

export async function getLatestClientVersion(): Promise<ClientVersionSnapshot | null> {
  const prisma = getPrismaClient();
  const row = await prisma.clientVersion.findFirst({
    orderBy: { releasedAt: "desc" },
  });
  if (!row) return null;

  return {
    version: row.version,
    minimumSupportedVersion: row.minimumSupportedVersion,
    required: row.required,
    platforms: coercePlatformBuildMap(row.platforms),
    changelog: row.changelog,
    assetManifest: coerceAssetManifest(row.assetManifest),
    releasedAt: row.releasedAt.toISOString(),
  };
}

export async function registerClientVersion(input: {
  version: string;
  minimumSupportedVersion: string;
  required: boolean;
  platforms: PlatformBuildMap;
  changelog: string | null;
  assetManifest: Record<string, number> | null;
  releasedByUserId: string;
}): Promise<ClientVersionSnapshot> {
  const prisma = getPrismaClient();
  const platformsJson = input.platforms as Prisma.InputJsonValue;
  const assetManifestJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    input.assetManifest === null
      ? Prisma.JsonNull
      : (input.assetManifest as Prisma.InputJsonValue);

  const row = await prisma.clientVersion.upsert({
    where: { version: input.version },
    create: {
      version: input.version,
      minimumSupportedVersion: input.minimumSupportedVersion,
      required: input.required,
      platforms: platformsJson,
      changelog: input.changelog,
      assetManifest: assetManifestJson,
      releasedByUserId: input.releasedByUserId,
    },
    update: {
      minimumSupportedVersion: input.minimumSupportedVersion,
      required: input.required,
      platforms: platformsJson,
      changelog: input.changelog,
      assetManifest: assetManifestJson,
      releasedByUserId: input.releasedByUserId,
      releasedAt: new Date(),
    },
  });

  return {
    version: row.version,
    minimumSupportedVersion: row.minimumSupportedVersion,
    required: row.required,
    platforms: coercePlatformBuildMap(row.platforms),
    changelog: row.changelog,
    assetManifest: coerceAssetManifest(row.assetManifest),
    releasedAt: row.releasedAt.toISOString(),
  };
}

function coercePlatformBuildMap(raw: unknown): PlatformBuildMap {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  const out: PlatformBuildMap = {};
  for (const key of ["windows", "macos", "linux"] as const) {
    const entry = map[key];
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.url === "string" &&
      typeof e.sha256 === "string" &&
      typeof e.size === "number"
    ) {
      out[key] = { url: e.url, sha256: e.sha256, size: e.size };
    }
  }
  return out;
}

function coerceAssetManifest(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const map = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "number") out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

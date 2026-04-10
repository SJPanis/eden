import "server-only";

import type { EdenRole } from "@/modules/core/config/role-nav";
import { verifyUnityAccessToken } from "@/modules/core/session/jwt-unity";
import { edenAuthJsPlatformRoleClaim } from "@/modules/core/session/access-control";

// Resolves the authenticated identity for Unity-facing routes. Phase 01 only
// accepts Bearer JWTs minted by /api/auth/login — the web app keeps using the
// Auth.js cookie session via its own resolver. We can add a cookie fallback
// later if the Unity routes need to serve browser callers too.

export type AuthenticatedIdentity = {
  userId: string;
  username: string;
  role: EdenRole;
  source: "unity-jwt";
};

export async function resolveAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedIdentity | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const payload = await verifyUnityAccessToken(token);
    return {
      userId: payload.sub,
      username: String(payload.username),
      role: payload[edenAuthJsPlatformRoleClaim] as EdenRole,
      source: "unity-jwt",
    };
  } catch {
    return null;
  }
}

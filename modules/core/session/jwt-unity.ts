import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import type { EdenRole } from "@/modules/core/config/role-nav";
import { edenAuthJsPlatformRoleClaim } from "@/modules/core/session/access-control";

// Unity access tokens piggy-back on NEXTAUTH_SECRET so the existing
// middleware (which validates via next-auth's getToken) sees a compatible
// claim shape. Audience is scoped to "eden-unity-client" so server code can
// tell a Unity session apart from a browser session when needed.

const JWT_ISSUER = "eden";
const JWT_AUDIENCE = "eden-unity-client";
const ACCESS_TOKEN_TTL = "1h";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export type UnityAccessTokenPayload = JWTPayload & {
  sub: string;
  username: string;
  [edenAuthJsPlatformRoleClaim]: EdenRole;
  type: "access";
};

function getSigningSecret(): Uint8Array {
  const secretValue = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secretValue) {
    throw new Error(
      "NEXTAUTH_SECRET (or AUTH_SECRET) must be set to sign Unity access tokens",
    );
  }
  return new TextEncoder().encode(secretValue);
}

export type UnityTokenSubject = {
  userId: string;
  username: string;
  role: EdenRole;
};

export type SignedUnityAccessToken = {
  token: string;
  expiresAt: Date;
};

export async function signUnityAccessToken(
  subject: UnityTokenSubject,
): Promise<SignedUnityAccessToken> {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({
    username: subject.username,
    [edenAuthJsPlatformRoleClaim]: subject.role,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSigningSecret());

  return { token, expiresAt };
}

export async function verifyUnityAccessToken(
  token: string,
): Promise<UnityAccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (payload.type !== "access") {
    throw new Error("unity token is not an access token");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("unity token missing sub");
  }
  if (typeof payload.username !== "string") {
    throw new Error("unity token missing username");
  }
  if (
    payload[edenAuthJsPlatformRoleClaim] !== "owner" &&
    payload[edenAuthJsPlatformRoleClaim] !== "business" &&
    payload[edenAuthJsPlatformRoleClaim] !== "consumer"
  ) {
    throw new Error("unity token missing edenPlatformRole");
  }

  return payload as UnityAccessTokenPayload;
}

export const UNITY_TOKEN_AUDIENCE = JWT_AUDIENCE;
export const UNITY_TOKEN_ISSUER = JWT_ISSUER;
export const UNITY_ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;

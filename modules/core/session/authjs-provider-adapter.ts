import "server-only";

import { getToken, type JWT } from "next-auth/jwt";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type {
  EdenAuthProviderAdapter,
  EdenResolvedAuthProviderSession,
} from "@/modules/core/session/auth-provider-adapter";
import {
  edenAuthJsCredentialsProviderId,
  edenAuthJsProviderClaim,
  edenAuthJsProviderSubjectClaim,
  edenAuthJsUsernameClaim,
  resolveAuthJsRequestUrl,
  resolveAuthJsSecret,
  shouldAttemptAuthJsProviderResolution,
} from "@/modules/core/session/authjs-runtime";

const providerUserSelect = {
  id: true,
  username: true,
} as const;

type EdenAuthJsToken = JWT & {
  [edenAuthJsProviderClaim]?: string;
  [edenAuthJsProviderSubjectClaim]?: string;
  [edenAuthJsUsernameClaim]?: string;
  preferred_username?: string;
};

export function createAuthJsProviderAdapter(
  prisma: EdenPrismaClient,
): EdenAuthProviderAdapter {
  return {
    async resolveProviderSession(input) {
      if (!shouldAttemptAuthJsProviderResolution()) {
        return null;
      }

      const secret = resolveAuthJsSecret();

      if (!secret || !input.cookieHeader) {
        return null;
      }

      const token = await getToken({
        req: {
          headers: {
            cookie: input.cookieHeader,
            host: new URL(input.requestUrl ?? resolveAuthJsRequestUrl()).host,
          },
        } as never,
        secret,
        secureCookie: resolveAuthJsRequestUrl().startsWith("https://"),
      });

      const claims = extractProviderClaims(token);

      if (!claims) {
        return null;
      }

      const providerAccount = await prisma.authProviderAccount.findFirst({
        where: {
          provider: claims.provider,
          providerSubject: claims.subject,
        },
        select: {
          user: {
            select: providerUserSelect,
          },
        },
      });

      if (providerAccount?.user) {
        return {
          provider: claims.provider,
          subject: claims.subject,
          sessionKey: providerAccount.user.id,
          diagnostics: {
            usedLegacySessionKeyFallback: false,
            note: `Auth.js provider ${claims.provider} resolved subject ${claims.subject} through persisted provider-account mapping for @${providerAccount.user.username}.`,
          },
        } satisfies EdenResolvedAuthProviderSession;
      }

      const fallbackUser = await resolveProviderFallbackUser(prisma, claims);

      if (!fallbackUser) {
        return null;
      }

      return {
        provider: claims.provider,
        subject: claims.subject,
        sessionKey: fallbackUser.id,
        diagnostics: {
          usedLegacySessionKeyFallback: false,
          note: `Auth.js provider ${claims.provider} resolved subject ${claims.subject} through compatibility fallback for @${fallbackUser.username}.`,
        },
      } satisfies EdenResolvedAuthProviderSession;
    },
  };
}

function extractProviderClaims(token: JWT | null) {
  if (!token) {
    return null;
  }

  const authToken = token as EdenAuthJsToken;
  const provider =
    typeof authToken[edenAuthJsProviderClaim] === "string"
      ? authToken[edenAuthJsProviderClaim]
      : null;
  const subject =
    typeof authToken[edenAuthJsProviderSubjectClaim] === "string"
      ? authToken[edenAuthJsProviderSubjectClaim]
      : null;
  const username =
    typeof authToken[edenAuthJsUsernameClaim] === "string"
      ? authToken[edenAuthJsUsernameClaim]
      : typeof authToken.preferred_username === "string"
        ? authToken.preferred_username
        : null;

  if (!provider || !subject) {
    return null;
  }

  return {
    provider,
    subject,
    username: username ?? undefined,
  };
}

async function resolveProviderFallbackUser(
  prisma: EdenPrismaClient,
  claims: {
    provider: string;
    subject: string;
    username?: string;
  },
) {
  if (claims.provider !== edenAuthJsCredentialsProviderId || !claims.username) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      username: claims.username,
    },
    select: providerUserSelect,
  });
}

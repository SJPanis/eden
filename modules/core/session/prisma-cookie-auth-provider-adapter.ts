import "server-only";

import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  parseAuthProviderSessionCookie,
  type EdenAuthProviderAdapter,
  type EdenResolvedAuthProviderSession,
} from "@/modules/core/session/auth-provider-adapter";

const providerUserSelect = {
  id: true,
  username: true,
} as const;

export function createPrismaCookieAuthProviderAdapter(
  prisma: EdenPrismaClient,
): EdenAuthProviderAdapter {
  return {
    async resolveProviderSession(input) {
      const parsed = parseAuthProviderSessionCookie(input.providerCookieValue);

      if (!parsed) {
        return null;
      }

      if (parsed.kind === "legacy_internal_user_id") {
        return {
          provider: "legacy_internal_user_id",
          subject: parsed.userId,
          sessionKey: parsed.userId,
          diagnostics: {
            usedLegacySessionKeyFallback: true,
            note: "Used the legacy internal user id compatibility cookie.",
          },
        } satisfies EdenResolvedAuthProviderSession;
      }

      const providerAccount = await prisma.authProviderAccount.findFirst({
        where: {
          provider: parsed.provider,
          providerSubject: parsed.subject,
        },
        select: {
          user: {
            select: providerUserSelect,
          },
        },
      });

      if (providerAccount?.user) {
        return {
          provider: parsed.provider,
          subject: parsed.subject,
          sessionKey: providerAccount.user.id,
          diagnostics: {
            usedLegacySessionKeyFallback: false,
            note: `Provider ${parsed.provider} resolved subject ${parsed.subject} through persisted provider-account mapping for @${providerAccount.user.username}.`,
          },
        } satisfies EdenResolvedAuthProviderSession;
      }

      const fallbackUser = await resolveProviderFallbackUser(prisma, parsed);

      if (!fallbackUser) {
        return null;
      }

      return {
        provider: parsed.provider,
        subject: parsed.subject,
        sessionKey: fallbackUser.id,
        diagnostics: {
          usedLegacySessionKeyFallback: false,
          note: `Provider ${parsed.provider} resolved subject ${parsed.subject} through compatibility fallback for @${fallbackUser.username}.`,
        },
      } satisfies EdenResolvedAuthProviderSession;
    },
  };
}

async function resolveProviderFallbackUser(
  prisma: EdenPrismaClient,
  parsed: {
    provider: string;
    subject: string;
    username?: string;
  },
) {
  return (
    (parsed.username
      ? await prisma.user.findUnique({
          where: {
            username: parsed.username,
          },
          select: providerUserSelect,
        })
      : null) ??
    (parsed.subject.startsWith("eden-dev:")
      ? await prisma.user.findUnique({
          where: {
            username: parsed.subject.replace(/^eden-dev:/, ""),
          },
          select: providerUserSelect,
        })
      : null)
  );
}

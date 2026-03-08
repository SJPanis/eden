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
    async resolveProviderSession(cookieValue) {
      const parsed = parseAuthProviderSessionCookie(cookieValue);

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

      const user =
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
          : null);

      if (!user) {
        return null;
      }

      return {
        provider: parsed.provider,
        subject: parsed.subject,
        sessionKey: user.id,
        diagnostics: {
          usedLegacySessionKeyFallback: false,
          note: `Provider ${parsed.provider} mapped subject ${parsed.subject} to @${user.username}.`,
        },
      } satisfies EdenResolvedAuthProviderSession;
    },
  };
}

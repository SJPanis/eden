import "server-only";

import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import {
  edenAuthJsProviderClaim,
  edenAuthJsProviderSubjectClaim,
  edenAuthJsUsernameClaim,
  resolveAuthJsSecret,
} from "@/modules/core/session/authjs-runtime";

type EdenAuthJsJwt = JWT & {
  [edenAuthJsProviderClaim]?: string;
  [edenAuthJsProviderSubjectClaim]?: string;
  [edenAuthJsUsernameClaim]?: string;
};

export function buildEdenAuthJsOptions(): NextAuthOptions {
  return {
    secret: resolveAuthJsSecret() ?? undefined,
    session: {
      strategy: "jwt",
    },
    // The real provider list will be introduced in a later auth cutover slice.
    providers: [],
    callbacks: {
      async jwt({ token, account, profile }) {
        const nextToken = token as EdenAuthJsJwt;

        if (account?.provider) {
          nextToken[edenAuthJsProviderClaim] = account.provider;
        }

        if (account?.providerAccountId) {
          nextToken[edenAuthJsProviderSubjectClaim] = account.providerAccountId;
        }

        const username =
          typeof profile === "object" &&
          profile &&
          "login" in profile &&
          typeof profile.login === "string"
            ? profile.login
            : typeof profile === "object" &&
                profile &&
                "preferred_username" in profile &&
                typeof profile.preferred_username === "string"
              ? profile.preferred_username
              : null;

        if (username) {
          nextToken[edenAuthJsUsernameClaim] = username;
        }

        return nextToken;
      },
    },
  };
}

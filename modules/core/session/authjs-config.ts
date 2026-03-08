import "server-only";

import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  edenAuthJsCredentialsProviderId,
  edenAuthJsProviderClaim,
  edenAuthJsProviderSubjectClaim,
  edenAuthJsUsernameClaim,
  resolveAuthJsSecret,
  shouldEnableAuthJsCredentialsProvider,
} from "@/modules/core/session/authjs-runtime";

type EdenAuthJsJwt = JWT & {
  [edenAuthJsProviderClaim]?: string;
  [edenAuthJsProviderSubjectClaim]?: string;
  [edenAuthJsUsernameClaim]?: string;
};

type EdenAuthJsSignInUser = User & {
  id?: string;
  username?: string;
};

export function buildEdenAuthJsOptions(): NextAuthOptions {
  return {
    secret: resolveAuthJsSecret() ?? undefined,
    session: {
      strategy: "jwt",
    },
    providers: buildAuthJsProviders(),
    callbacks: {
      async signIn({ user, account, credentials }) {
        const provider = account?.provider;
        const userId = typeof user.id === "string" ? user.id : null;
        const providerSubject = resolveProviderSubject({
          provider,
          user: user as EdenAuthJsSignInUser,
          credentials,
        });

        if (!provider || !userId || !providerSubject) {
          return true;
        }

        await getPrismaClient().authProviderAccount.upsert({
          where: {
            provider_providerSubject: {
              provider,
              providerSubject,
            },
          },
          update: {
            userId,
          },
          create: {
            provider,
            providerSubject,
            userId,
          },
        });

        return true;
      },
      async jwt({ token, account, profile, user }) {
        const nextToken = token as EdenAuthJsJwt;
        const signInUser = user as EdenAuthJsSignInUser | undefined;

        if (account?.provider) {
          nextToken[edenAuthJsProviderClaim] = account.provider;
        }

        const providerSubject = resolveProviderSubject({
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          user: signInUser,
        });

        if (providerSubject) {
          nextToken[edenAuthJsProviderSubjectClaim] = providerSubject;
        }

        const username =
          normalizeUsername(signInUser?.username) ??
          normalizeUsername(signInUser?.email ?? null) ??
          extractProfileUsername(profile);

        if (username) {
          nextToken[edenAuthJsUsernameClaim] = username;
        }

        return nextToken;
      },
    },
  };
}

function buildAuthJsProviders() {
  const providers = [];

  if (shouldEnableAuthJsCredentialsProvider()) {
    providers.push(
      CredentialsProvider({
        name: "Eden Dev Credentials",
        credentials: {
          username: {
            label: "Username",
            type: "text",
            placeholder: "paige.brooks",
          },
        },
        async authorize(credentials) {
          const username = normalizeUsername(credentials?.username);

          if (!username) {
            return null;
          }

          const user = await getPrismaClient().user.findUnique({
            where: {
              username,
            },
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          });

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            name: user.displayName,
            username: user.username,
          } satisfies EdenAuthJsSignInUser;
        },
      }),
    );
  }

  return providers;
}

function resolveProviderSubject(input: {
  provider?: string | null;
  providerAccountId?: string | null;
  user?: EdenAuthJsSignInUser;
  credentials?: Record<string, unknown> | null;
}) {
  if (!input.provider) {
    return null;
  }

  if (typeof input.providerAccountId === "string" && input.providerAccountId.length > 0) {
    return input.providerAccountId;
  }

  if (input.provider === edenAuthJsCredentialsProviderId) {
    return (
      normalizeUsername(input.user?.username) ??
      normalizeUsername(asCredentialValue(input.credentials?.username)) ??
      null
    );
  }

  return null;
}

function normalizeUsername(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function asCredentialValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function extractProfileUsername(profile: unknown) {
  if (
    typeof profile === "object" &&
    profile &&
    "login" in profile &&
    typeof profile.login === "string"
  ) {
    return profile.login;
  }

  if (
    typeof profile === "object" &&
    profile &&
    "preferred_username" in profile &&
    typeof profile.preferred_username === "string"
  ) {
    return profile.preferred_username;
  }

  return null;
}

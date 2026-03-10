import "server-only";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  isValidCredentialPassword,
  normalizeCredentialUsername,
  verifyCredentialPassword,
} from "@/modules/core/session/password-auth";
import {
  edenAuthJsPlatformRoleClaim,
  resolveAuthorizedPlatformRole,
} from "@/modules/core/session/access-control";
import {
  edenAuthJsCredentialsProviderId,
  edenAuthJsGoogleProviderId,
  edenAuthJsProviderClaim,
  edenAuthJsProviderSubjectClaim,
  edenAuthJsUsernameClaim,
  resolveGoogleClientId,
  resolveGoogleClientSecret,
  resolveAuthJsSecret,
  shouldEnableAuthJsCredentialsProvider,
  shouldEnableAuthJsGoogleProvider,
} from "@/modules/core/session/authjs-runtime";

type EdenAuthJsJwt = JWT & {
  [edenAuthJsProviderClaim]?: string;
  [edenAuthJsProviderSubjectClaim]?: string;
  [edenAuthJsUsernameClaim]?: string;
  [edenAuthJsPlatformRoleClaim]?: "consumer" | "business" | "owner";
};

type EdenAuthJsSignInUser = User & {
  id?: string;
  username?: string;
};

export function buildEdenAuthJsOptions(): NextAuthOptions {
  return {
    secret: resolveAuthJsSecret() ?? undefined,
    pages: {
      signIn: "/",
    },
    session: {
      strategy: "jwt",
    },
    providers: buildAuthJsProviders(),
    callbacks: {
      async signIn({ user, account, credentials, profile }) {
        const provider = account?.provider;
        const providerSubject = resolveProviderSubject({
          provider,
          providerAccountId: account?.providerAccountId,
          user: user as EdenAuthJsSignInUser,
          credentials,
        });

        if (!provider || !providerSubject) {
          return false;
        }

        const persistedUser = await resolveOrProvisionPersistedUser({
          provider,
          providerSubject,
          user: user as EdenAuthJsSignInUser,
          profile,
        });

        if (!persistedUser) {
          return false;
        }

        user.id = persistedUser.id;
        user.name = persistedUser.displayName;
        (user as EdenAuthJsSignInUser).username = persistedUser.username;

        await getPrismaClient().authProviderAccount.upsert({
          where: {
            provider_providerSubject: {
              provider,
              providerSubject,
            },
          },
          update: {
            userId: persistedUser.id,
          },
          create: {
            provider,
            providerSubject,
            userId: persistedUser.id,
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

        const persistedAuthUser =
          typeof nextToken[edenAuthJsProviderClaim] === "string" &&
          typeof nextToken[edenAuthJsProviderSubjectClaim] === "string"
            ? await resolvePersistedUserByProviderAccount({
                provider: nextToken[edenAuthJsProviderClaim],
                providerSubject: nextToken[edenAuthJsProviderSubjectClaim],
              })
            : null;

        if (persistedAuthUser) {
          nextToken.sub = persistedAuthUser.id;
        }

        const username =
          normalizeUsername(signInUser?.username) ??
          normalizeUsername(persistedAuthUser?.username) ??
          normalizeUsername(signInUser?.email ?? null) ??
          extractProfileUsername(profile);

        if (username) {
          nextToken[edenAuthJsUsernameClaim] = username;
        }

        const platformRole = await resolvePersistedPlatformRole({
          userId:
            typeof signInUser?.id === "string"
              ? signInUser.id
              : typeof persistedAuthUser?.id === "string"
                ? persistedAuthUser.id
              : typeof nextToken.sub === "string"
                ? nextToken.sub
                : null,
          username,
        });

        if (platformRole) {
          nextToken[edenAuthJsPlatformRoleClaim] = platformRole;
        }

        return nextToken;
      },
    },
  };
}

function buildAuthJsProviders() {
  const providers = [];

  if (shouldEnableAuthJsGoogleProvider()) {
    providers.push(
      GoogleProvider({
        clientId: resolveGoogleClientId() ?? "",
        clientSecret: resolveGoogleClientSecret() ?? "",
      }),
    );
  }

  if (shouldEnableAuthJsCredentialsProvider()) {
    providers.push(
      CredentialsProvider({
        name: "Eden Credentials",
        credentials: {
          username: {
            label: "Username",
            type: "text",
            placeholder: "your.username",
          },
          password: {
            label: "Password",
            type: "password",
          },
        },
        async authorize(credentials) {
          const username = normalizeCredentialUsername(asCredentialValue(credentials?.username));
          const password = asCredentialValue(credentials?.password);

          if (!username || !password || !isValidCredentialPassword(password)) {
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
              passwordHash: true,
            },
          });

          if (
            !user?.passwordHash ||
            !(await verifyCredentialPassword(user.passwordHash, password))
          ) {
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

async function resolveOrProvisionPersistedUser(input: {
  provider: string;
  providerSubject: string;
  user: EdenAuthJsSignInUser;
  profile?: unknown;
}) {
  const prisma = getPrismaClient();
  const mappedAccount = await prisma.authProviderAccount.findUnique({
    where: {
      provider_providerSubject: {
        provider: input.provider,
        providerSubject: input.providerSubject,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (mappedAccount?.user) {
    return mappedAccount.user;
  }

  if (input.provider === edenAuthJsCredentialsProviderId) {
    return typeof input.user.id === "string" && normalizeUsername(input.user.username)
      ? {
          id: input.user.id,
          username: normalizeUsername(input.user.username) ?? input.user.id,
          displayName: input.user.name?.trim() || input.user.username || "Eden User",
        }
      : null;
  }

  if (input.provider !== edenAuthJsGoogleProviderId) {
    return null;
  }

  const googleProfile = extractGoogleProfile(input.profile, input.user);

  if (!googleProfile.email || googleProfile.emailVerified === false) {
    return null;
  }

  const nextUsername = await allocateUniqueUsername(
    deriveUsernameSeed(googleProfile.email, googleProfile.displayName),
  );
  const createdUser = await prisma.user.create({
    data: {
      username: nextUsername,
      displayName: googleProfile.displayName,
      role: "CONSUMER",
    },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });

  return createdUser;
}

async function resolvePersistedUserByProviderAccount(input: {
  provider: string;
  providerSubject: string;
}) {
  const mappedAccount = await getPrismaClient().authProviderAccount.findUnique({
    where: {
      provider_providerSubject: {
        provider: input.provider,
        providerSubject: input.providerSubject,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  return mappedAccount?.user ?? null;
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

function extractGoogleProfile(profile: unknown, user: EdenAuthJsSignInUser) {
  const profileEmail =
    typeof profile === "object" &&
    profile &&
    "email" in profile &&
    typeof profile.email === "string"
      ? profile.email
      : user.email ?? null;
  const profileName =
    typeof profile === "object" &&
    profile &&
    "name" in profile &&
    typeof profile.name === "string"
      ? profile.name
      : user.name ?? profileEmail ?? "Eden User";
  const normalizedDisplayName = profileName.trim() || "Eden User";
  const emailVerified =
    typeof profile === "object" &&
    profile &&
    "email_verified" in profile &&
    typeof profile.email_verified === "boolean"
      ? profile.email_verified
      : true;

  return {
    email: profileEmail?.trim().toLowerCase() ?? null,
    displayName: normalizedDisplayName,
    emailVerified,
  };
}

function normalizeUsername(value: string | null | undefined) {
  return normalizeCredentialUsername(value);
}

function normalizeUsernameSeed(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "eden-user";
}

function deriveUsernameSeed(email: string, displayName: string) {
  const localPart = email.split("@")[0];
  return normalizeUsernameSeed(localPart || displayName);
}

async function allocateUniqueUsername(baseSeed: string) {
  const prisma = getPrismaClient();
  const normalizedBaseSeed = normalizeUsernameSeed(baseSeed);
  let nextCandidate = normalizedBaseSeed;
  let suffix = 2;

  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: {
        username: nextCandidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return nextCandidate;
    }

    nextCandidate = `${normalizedBaseSeed}-${suffix}`;
    suffix += 1;
  }
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

async function resolvePersistedPlatformRole(input: {
  userId: string | null;
  username: string | null;
}) {
  if (!input.userId && !input.username) {
    return null;
  }

  const userSelect = {
    username: true,
    role: true,
    businessMemberships: {
      select: {
        businessId: true,
      },
    },
    ownedBusinesses: {
      select: {
        id: true,
      },
    },
  } as const;
  const user = input.userId
    ? await getPrismaClient().user.findUnique({
        where: {
          id: input.userId,
        },
        select: userSelect,
      })
    : input.username
      ? await getPrismaClient().user.findUnique({
          where: {
            username: input.username,
          },
          select: userSelect,
        })
      : null;

  if (!user) {
    return null;
  }

  return resolveAuthorizedPlatformRole({
    storedRole: user.role,
    username: user.username,
    businessMembershipCount: user.businessMemberships.length,
    ownedBusinessCount: user.ownedBusinesses.length,
  });
}

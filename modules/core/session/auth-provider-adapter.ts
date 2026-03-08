import "server-only";

export type EdenAuthProviderSessionClaims = {
  provider: string;
  subject: string;
  username?: string;
};

export type EdenParsedAuthProviderSession =
  | ({
      kind: "provider_claims";
    } & EdenAuthProviderSessionClaims)
  | {
      kind: "legacy_internal_user_id";
      userId: string;
    };

export type EdenResolvedAuthProviderSession = {
  provider: string;
  subject: string;
  sessionKey: string;
  diagnostics: {
    usedLegacySessionKeyFallback: boolean;
    note: string;
  };
};

export type EdenAuthProviderResolutionInput = {
  providerCookieValue?: string | null;
  cookieHeader?: string | null;
  requestUrl?: string | null;
};

export interface EdenAuthProviderAdapter {
  resolveProviderSession(
    input: EdenAuthProviderResolutionInput,
  ): Promise<EdenResolvedAuthProviderSession | null>;
}

export function serializeAuthProviderSessionCookie(
  claims: EdenAuthProviderSessionClaims,
) {
  return encodeURIComponent(JSON.stringify(claims));
}

export function parseAuthProviderSessionCookie(
  cookieValue: string | null | undefined,
): EdenParsedAuthProviderSession | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as Partial<EdenAuthProviderSessionClaims>;

    if (
      typeof parsed.provider === "string" &&
      parsed.provider.length > 0 &&
      typeof parsed.subject === "string" &&
      parsed.subject.length > 0
    ) {
      return {
        kind: "provider_claims",
        provider: parsed.provider,
        subject: parsed.subject,
        username:
          typeof parsed.username === "string" && parsed.username.length > 0
            ? parsed.username
            : undefined,
      };
    }
  } catch {
    // Legacy compatibility: older development cookies stored the internal user id directly.
  }

  return {
    kind: "legacy_internal_user_id",
    userId: cookieValue,
  };
}

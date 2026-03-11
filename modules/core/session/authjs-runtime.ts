import "server-only";

export const edenAuthJsProviderClaim = "provider";
export const edenAuthJsProviderSubjectClaim = "providerSubject";
export const edenAuthJsUsernameClaim = "username";
export const edenAuthJsCredentialsProviderId = "credentials";
export const edenAuthJsGoogleProviderId = "google";

export function shouldAttemptAuthJsProviderResolution(
  input = process.env.EDEN_ENABLE_AUTHJS_PROVIDER_ADAPTER,
) {
  if (input === "true") {
    return true;
  }

  if (input === "false") {
    return false;
  }

  return Boolean(resolveAuthJsSecret());
}

export function shouldEnableAuthJsCredentialsProvider() {
  return true;
}

export function shouldEnableAuthJsGoogleProvider(
  input = process.env.EDEN_ENABLE_AUTHJS_GOOGLE_PROVIDER,
) {
  if (input === "true") {
    return true;
  }

  if (input === "false") {
    return false;
  }

  return false;
}

export function resolveAuthJsSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

export function resolveAuthJsRequestUrl() {
  return process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

export function resolveGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? null;
}

export function resolveGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? null;
}

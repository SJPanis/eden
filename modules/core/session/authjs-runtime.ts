import "server-only";

export const edenAuthJsProviderClaim = "provider";
export const edenAuthJsProviderSubjectClaim = "providerSubject";
export const edenAuthJsUsernameClaim = "username";

export function shouldAttemptAuthJsProviderResolution(
  input = process.env.EDEN_ENABLE_AUTHJS_PROVIDER_ADAPTER,
) {
  return input === "true";
}

export function resolveAuthJsSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

export function resolveAuthJsRequestUrl() {
  return process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

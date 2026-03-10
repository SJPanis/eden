import "server-only";

import { hash, verify } from "@node-rs/argon2";

const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

export function normalizeCredentialUsername(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isValidCredentialUsername(username: string) {
  return usernamePattern.test(username);
}

export function isValidCredentialPassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}

export async function hashCredentialPassword(password: string) {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyCredentialPassword(
  passwordHash: string,
  password: string,
) {
  return verify(passwordHash, password);
}

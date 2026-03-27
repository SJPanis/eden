import { randomBytes } from "crypto";

const tokens = new Map<string, { token: string; expiresAt: number }>();

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function generateCommandToken(userId: string): string {
  // Clean up expired tokens
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expiresAt < now) tokens.delete(key);
  }

  const token = randomBytes(32).toString("hex");
  tokens.set(userId, { token, expiresAt: now + TOKEN_TTL_MS });
  return token;
}

export function validateCommandToken(userId: string, token: string): boolean {
  const entry = tokens.get(userId);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    tokens.delete(userId);
    return false;
  }
  return entry.token === token;
}

export function revokeCommandToken(userId: string): void {
  tokens.delete(userId);
}

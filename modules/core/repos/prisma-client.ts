import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export type EdenPrismaClient = PrismaClient;

const rootEnvPath = resolve(process.cwd(), ".env");
const globalForPrisma = globalThis as typeof globalThis & {
  edenPrismaClient?: EdenPrismaClient;
};

// Runtime Prisma access can happen from scripts before Next.js loads env files.
if (typeof process.loadEnvFile === "function" && existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

export function getPrismaClient(): EdenPrismaClient {
  const connectionString = getPrismaConnectionString();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Set a PostgreSQL connection string before enabling Prisma-backed Eden writes.",
    );
  }

  if (!globalForPrisma.edenPrismaClient) {
    const adapter = new PrismaPg({
      connectionString,
    });

    globalForPrisma.edenPrismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.edenPrismaClient;
}

function getPrismaConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  const connectionUrl = new URL(connectionString);
  const sslMode = connectionUrl.searchParams.get("sslmode");
  const useLibpqCompat = connectionUrl.searchParams.get("uselibpqcompat");

  if (
    sslMode === "require" &&
    useLibpqCompat !== "true"
  ) {
    // Match Prisma CLI/libpq semantics for sslmode=require when using the pg runtime adapter.
    connectionUrl.searchParams.set("uselibpqcompat", "true");
    return connectionUrl.toString();
  }

  return connectionString;
}

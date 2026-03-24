import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

const rootEnvPath = resolve(process.cwd(), ".env");

// Prisma config is evaluated before Next.js env loading, so load the project .env here.
if (typeof process.loadEnvFile === "function" && existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // DIRECT_DATABASE_URL is used for migrations (schema engine requires direct connection,
    // not a pooler). Falls back to DATABASE_URL if not set.
    url: env("DATABASE_URL"),
  },
});

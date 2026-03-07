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
    url: env("DATABASE_URL"),
  },
});

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "./databaseConnectionUrls";
import { encodeConnectionUrl } from "./encodeConnectionUrl";

// Reuse a single Prisma client instance across hot-reloads in development.
// See: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = encodeConnectionUrl(getDatabaseUrl(process.env));

  if (!connectionString) {
    throw new Error(
      "Missing database connection configuration. Set DATABASE_URL or SUPABASE_PROJECT_REF plus SUPABASE_DB_PASSWORD.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local — load it explicitly for the Prisma CLI
dotenv.config({ path: ".env.local" });

/**
 * The Supabase-generated connection string may contain special characters in
 * the password (e.g. `%`, `&`, `{`) that aren't URL-encoded.
 * This function parses the raw URL and returns it with the password properly
 * percent-encoded so Prisma's URL parser accepts it.
 */
function encodeConnectionUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    // Extract the userinfo section (everything between :// and the last @ before the host)
    const schemeEnd = raw.indexOf("://") + 3;
    const atIndex = raw.lastIndexOf("@");
    if (atIndex === -1) return raw;

    const userinfo = raw.slice(schemeEnd, atIndex);
    const rest = raw.slice(atIndex); // @host:port/path?query

    const colonIndex = userinfo.indexOf(":");
    if (colonIndex === -1) return raw;

    const user = userinfo.slice(0, colonIndex);
    const password = userinfo.slice(colonIndex + 1);

    const encodedPassword = encodeURIComponent(password);
    return raw.slice(0, schemeEnd) + user + ":" + encodedPassword + rest;
  } catch {
    return raw;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Use the direct (non-pooled) URL for schema operations (db push, migrate)
    url: encodeConnectionUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
  },
});


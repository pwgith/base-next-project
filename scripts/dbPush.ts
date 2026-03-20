/**
 * Wrapper script that encodes the Supabase connection URL before calling
 * `prisma db push --force-reset`. Used because the password contains special
 * characters that Prisma's URL parser cannot handle without percent-encoding.
 */
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: ".env.local" });

function encodeConnectionUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const schemeEnd = raw.indexOf("://") + 3;
    const atIndex = raw.lastIndexOf("@");
    if (atIndex === -1) return raw;
    const userinfo = raw.slice(schemeEnd, atIndex);
    const rest = raw.slice(atIndex);
    const colonIndex = userinfo.indexOf(":");
    if (colonIndex === -1) return raw;
    const user = userinfo.slice(0, colonIndex);
    const password = userinfo.slice(colonIndex + 1);
    return raw.slice(0, schemeEnd) + user + ":" + encodeURIComponent(password) + rest;
  } catch {
    return raw;
  }
}

const encodedDirectUrl = encodeConnectionUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
const encodedDatabaseUrl = encodeConnectionUrl(process.env.DATABASE_URL);

const env = {
  ...process.env,
  DIRECT_URL: encodedDirectUrl,
  DATABASE_URL: encodedDatabaseUrl,
};

execSync("npx prisma db push --force-reset --skip-generate", { env, stdio: "inherit" });
console.log("\nRunning seed...");
execSync("npx tsx prisma/seed.ts", { env: process.env as NodeJS.ProcessEnv, stdio: "inherit" });

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

const connectionString = encodeConnectionUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('Nothing to seed.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

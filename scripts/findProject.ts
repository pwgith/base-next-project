import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import pg from "pg";

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

const connStr = encodeConnectionUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: connStr });

async function main() {
  await client.connect();
  const res = await client.query(
    "SELECT p.id, p.name, pr.email, p.created_at FROM ifc_project p JOIN profile pr ON p.profile_id = pr.id ORDER BY p.created_at DESC LIMIT 3",
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch((e) => { console.error(e); client.end(); });

/**
 * Prisma 7 requires connection URLs with properly URL-encoded passwords.
 * Supabase-generated connection strings may contain special characters in the
 * password (e.g. `%`, `&`, `{`) that are not encoded.
 *
 * This utility parses the raw connection URL and returns a version with the
 * password percent-encoded so Prisma's URL parser accepts it.
 */
export function encodeConnectionUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const schemeEnd = raw.indexOf("://") + 3;
    const atIndex = raw.lastIndexOf("@");
    if (atIndex === -1) return raw;

    const userinfo = raw.slice(schemeEnd, atIndex);
    const rest = raw.slice(atIndex); // @host:port/path?query

    const colonIndex = userinfo.indexOf(":");
    if (colonIndex === -1) return raw;

    const user = userinfo.slice(0, colonIndex);
    const password = userinfo.slice(colonIndex + 1);

    // encodeURIComponent encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
    const encodedPassword = encodeURIComponent(password);
    return raw.slice(0, schemeEnd) + user + ":" + encodedPassword + rest;
  } catch {
    return raw;
  }
}

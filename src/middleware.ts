/**
 * Next.js middleware — protects server-rendered routes.
 *
 * Protected paths: /plans, /account
 * Unauthenticated requests are redirected to /login?redirectTo=<original-path>
 *
 * Authentication is checked by reading the `sb_session` HTTP-only cookie that
 * is written by POST /api/auth/session after a successful Supabase sign-in.
 */

import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/plans", "/account", "/subscription", "/projects"];
const SESSION_COOKIE = "sb_session";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `redirectTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match /plans and everything under it.
    "/plans",
    "/plans/(.*)",
    // Match /account and everything under it.
    "/account",
    "/account/(.*)",
    // Match /subscription and everything under it.
    "/subscription",
    "/subscription/(.*)",
    // Match /projects and everything under it.
    "/projects",
    "/projects/(.*)",
  ],
};

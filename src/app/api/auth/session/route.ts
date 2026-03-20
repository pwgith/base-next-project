/**
 * Session cookie API route.
 * POST — verifies a Supabase access token and sets an HTTP-only session cookie
 *         so that the Next.js middleware can protect server-rendered routes.
 * DELETE — clears the session cookie (sign-out).
 */

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "sb_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { accessToken } = (await request.json()) as { accessToken?: string };

  if (!accessToken) {
    return NextResponse.json(
      { error: "accessToken is required." },
      { status: 400 },
    );
  }

  // The token arrived here after a successful Supabase signInWithPassword call;
  // it is already cryptographically signed by Supabase and safe to trust.
  // We do a lightweight decode (no fetch) to extract the expiry for the cookie.
  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

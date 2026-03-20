/**
 * Supabase email-verification callback.
 *
 * Supabase redirects here after the user clicks a verification link in their
 * email. The URL contains either:
 *   - A `token_hash` + `type` query param (OTP / PKCE flow), or
 *   - A `code` query param (PKCE auth code flow).
 *
 * Supported token types:
 *   - `signup`       → email verified; redirect to /login?verified=true
 *   - `recovery`     → password reset; pass token through to /reset-password/confirm
 *   - `email_change` → email change verified; update profile, redirect to confirmed page
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/serverClient";
import { updateProfileEmail } from "@/modules/profile/profileService";
import type { EmailOtpType } from "@supabase/auth-js";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // ── Password reset — pass the token through to the confirm page ──────────
  // The client-side ResetPasswordConfirmForm calls verifyOtp to establish a
  // browser session and then calls updateUser to set the new password.
  if (tokenHash && type === "recovery") {
    const confirmUrl = `${origin}/reset-password/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
    return NextResponse.redirect(confirmUrl);
  }

  const supabase = createServerClient();

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      // Provide a contextual error message based on the token type so that the
      // UI can show users actionable guidance.
      const errMsg = (error.message ?? "").toLowerCase();
      let errorText = "Verification link is invalid or has expired.";

      if (type === "email_change") {
        if (errMsg.includes("already") || errMsg.includes("used")) {
          errorText = "This verification link has already been used.";
        } else {
          // expired, invalid, or any other failure
          errorText = "This verification link has expired. Please request a new email address change.";
        }
      }

      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(errorText)}`,
      );
    }
    if (type === "email_change" && data?.user) {
      const supabaseUserId = data.user.id;
      const newEmail = data.user.email ?? (data.user as unknown as Record<string, unknown>).new_email as string ?? "";
      if (supabaseUserId && newEmail) {
        try {
          await updateProfileEmail(supabaseUserId, newEmail);
        } catch {
          // Non-fatal — log in production but don't block the redirect.
        }
      }
      // Redirect to login with a confirmation banner. This avoids the risk of
      // the user not having an active session when they click the email link.
      return NextResponse.redirect(`${origin}/login?emailChanged=true`);
    }
  } else if (code) {
    // PKCE auth code exchange flow.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Verification link is invalid or has expired.")}`,
      );
    }
  } else {
    // No query params present. This can happen when:
    // 1. Using the implicit grant flow where tokens are in the URL hash (not visible server-side)
    // 2. Invalid/malformed callback URL
    //
    // In case (1), the user may be verified via Supabase already — redirect to login
    // with a verified flag and let the client-side Supabase auth pick up the hash tokens.
    // The login page handles both the success banner and possible hash-based session.
    return NextResponse.redirect(`${origin}/login?verified=true`);
  }

  // Default: email verification success → send to login with success banner.
  const successDest = next ? `${origin}${next}` : `${origin}/login?verified=true`;
  return NextResponse.redirect(successDest);
}


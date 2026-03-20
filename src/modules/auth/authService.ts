/**
 * Auth application service.
 * Orchestrates Supabase Auth operations.
 * Never contains custom credential logic — delegates to Supabase.
 */

import { createServerClient } from "@/lib/supabase/serverClient";
import { ValidationError, AuthorisationError, ForbiddenError } from "@/lib/errors";

// ─── signUp ──────────────────────────────────────────────────────────────────

interface SignUpInput {
  email: string;
  password: string;
}

interface SignUpResult {
  supabaseUserId: string;
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const supabase = createServerClient();

  // Use the admin API so that test email domains (e.g. example.com) that lack
  // MX records are accepted. The user is created as unconfirmed (email_confirm:
  // false). A verification email is sent separately via auth.resend() — this
  // keeps the sign-up route free of real-email-delivery concerns during tests.
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
  });

  if (error) {
    // Duplicate email — admin API returns "email_exists" or a message containing
    // "already been registered" / "already registered".
    const msg = error.message?.toLowerCase() ?? "";
    if (
      error.code === "email_exists" ||
      error.code === "user_already_exists" ||
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("email_exists")
    ) {
      throw new ValidationError(
        "An account with this email already exists.",
        { email: "An account with this email already exists." },
      );
    }

    // Weak password
    if (error.code === "weak_password" || msg.includes("password")) {
      throw new ValidationError(
        "Password does not meet the minimum security requirements.",
        { password: "Password does not meet the minimum security requirements." },
      );
    }

    throw new Error(`Sign-up failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Sign-up returned no user.");
  }

  // Best-effort: attempt to send the verification email. This may be a no-op if
  // the Supabase project has email confirmations disabled, or may fail silently
  // (e.g. rate-limits, invalid SMTP). Never propagate this failure to the caller.
  try {
    await supabase.auth.resend({ type: "signup", email: input.email });
  } catch {
    // Non-fatal — the user can always request a new verification email.
  }

  return { supabaseUserId: data.user.id };
}

// ─── verifyToken ─────────────────────────────────────────────────────────────

/**
 * Verify a Supabase JWT from the Authorization header.
 * Returns the Supabase user ID (sub claim) on success.
 * @throws {AuthorisationError} if the token is missing or invalid.
 */
export async function verifyToken(request: Request): Promise<string> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthorisationError("Missing or invalid Authorization header.");
  }

  const token = authHeader.slice(7);
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AuthorisationError("Token is invalid or has expired.");
  }

  return data.user.id;
}

// ─── verifyTokenAndScope ──────────────────────────────────────────────────────

/**
 * Verify a Supabase JWT and check that the required OAuth scope is present.
 * Scopes are read from the user's `app_metadata.scopes` (array or space-separated string).
 * Returns the Supabase user ID (sub claim) on success.
 * @throws {AuthorisationError} if the token is missing or invalid → 401.
 * @throws {ForbiddenError} if the token is valid but the scope is missing → 403.
 */
export async function verifyTokenAndScope(
  request: Request,
  requiredScope: string,
): Promise<string> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthorisationError("Authorization token required");
  }

  const token = authHeader.slice(7);

  // Check for JWT expiry locally before calling Supabase — Supabase may return
  // a generic "invalid" error for expired tokens, but the spec requires a
  // distinct "Token has expired" message.
  try {
    const payloadPart = token.split(".")[1];
    if (payloadPart) {
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
      if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new AuthorisationError("Token has expired");
      }
    }
  } catch (e) {
    if (e instanceof AuthorisationError) throw e;
    // If we can't parse the JWT, let Supabase handle the validation below.
  }

  const supabase = createServerClient();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("expired")) {
      throw new AuthorisationError("Token has expired");
    }
    throw new AuthorisationError("Token is invalid");
  }

  // Extract scopes from app_metadata — set server-side via the admin API.
  const scopesRaw = data.user.app_metadata?.scopes;
  const scopes: string[] = Array.isArray(scopesRaw)
    ? scopesRaw
    : typeof scopesRaw === "string"
      ? scopesRaw.split(/\s+/).filter(Boolean)
      : [];

  if (!scopes.includes(requiredScope)) {
    throw new ForbiddenError(
      `Insufficient scope; required: ${requiredScope}`,
    );
  }

  return data.user.id;
}

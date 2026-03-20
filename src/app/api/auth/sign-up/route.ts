import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/modules/auth/authService";
import { createProfile } from "@/modules/profile/profileService";
import { createDefaultSubscription } from "@/modules/subscription/subscriptionService";
import { ValidationError } from "@/lib/errors";

// ─── POST /api/auth/sign-up ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request body." } },
      { status: 400 },
    );
  }

  const { email, displayName, password } = body as Record<string, unknown>;

  // ── Validate presence ────────────────────────────────────────────────────
  if (
    typeof email !== "string" ||
    typeof displayName !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: { message: "email, displayName, and password are required." } },
      { status: 400 },
    );
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = displayName.trim();

  if (!trimmedEmail || !trimmedName || !password) {
    return NextResponse.json(
      { error: { message: "email, displayName, and password must not be empty." } },
      { status: 400 },
    );
  }

  // ── Password strength check ───────────────────────────────────────────────
  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        error: {
          message:
            "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
          code: "WEAK_PASSWORD",
        },
      },
      { status: 400 },
    );
  }

  try {
    // ── 1. Create Supabase user ───────────────────────────────────────────
    const { supabaseUserId } = await signUp({
      email: trimmedEmail,
      password,
    });

    // ── 2. Create application profile ────────────────────────────────────
    const profile = await createProfile({
      supabaseUserId,
      displayName: trimmedName,
      email: trimmedEmail,
    });

    // ── 3. Create default Free subscription ──────────────────────────────
    await createDefaultSubscription(profile.id);

    return NextResponse.json(
      {
        data: {
          message:
            "Account created. Please check your email to verify your address before signing in.",
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      // Check for email-taken specifically
      if (err.fields.email?.includes("already exists")) {
        return NextResponse.json(
          {
            error: {
              message: err.message,
              code: "EMAIL_TAKEN",
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: { message: err.message, fields: err.fields } },
        { status: 400 },
      );
    }

    console.error("[POST /api/auth/sign-up] Unexpected error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error." } },
      { status: 500 },
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Password must be ≥ 8 chars and contain uppercase, lowercase, digit, and special char. */
function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

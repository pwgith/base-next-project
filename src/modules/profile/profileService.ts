/**
 * Profile application service.
 * Orchestrates validation → domain → repository for profile operations.
 */

import { ValidationError, NotFoundError } from "@/lib/errors";
import { validateDisplayName, validateEmail } from "./profileDomain";
import { profileRepository } from "./profileRepository";
import type { CreateProfileInput, Profile } from "./profileTypes";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

// ─── createProfile ────────────────────────────────────────────────────────────

interface CreateProfileRequest {
  supabaseUserId: string;
  displayName: string;
  email: string;
}

export async function createProfile(
  input: CreateProfileRequest,
): Promise<Profile> {
  // ── Validate & sanitise ──────────────────────────────────────────────────
  const displayName = stripHtml(input.displayName?.trim() ?? "");
  const email = (input.email?.trim() ?? "").toLowerCase();

  if (!displayName) {
    throw new ValidationError("Display name is required.", {
      displayName: "Display name is required.",
    });
  }
  if (!email) {
    throw new ValidationError("Email is required.", {
      email: "Email is required.",
    });
  }

  try {
    validateDisplayName(displayName);
  } catch (err) {
    throw new ValidationError((err as Error).message, {
      displayName: (err as Error).message,
    });
  }

  try {
    validateEmail(email);
  } catch (err) {
    throw new ValidationError((err as Error).message, {
      email: (err as Error).message,
    });
  }

  if (!input.supabaseUserId) {
    throw new ValidationError("Supabase user ID is required.");
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  return profileRepository.create({
    supabaseUserId: input.supabaseUserId,
    displayName,
    email,
  });
}

// ─── getProfileBySupabaseUserId ───────────────────────────────────────────────

export async function getProfileBySupabaseUserId(
  supabaseUserId: string,
): Promise<Profile | null> {
  return profileRepository.findBySupabaseUserId(supabaseUserId);
}

// ─── updateProfileEmail ───────────────────────────────────────────────────────

/**
 * Synchronises the profile.email column after a successful Supabase email
 * change verification. Called from the auth callback route.
 * Silently no-ops if the profile does not exist (e.g. during local dev or tests).
 */
export async function updateProfileEmail(
  supabaseUserId: string,
  newEmail: string,
): Promise<void> {
  const email = (newEmail ?? "").trim().toLowerCase();

  try {
    validateEmail(email);
  } catch {
    throw new ValidationError("Invalid email address.");
  }

  const profile = await profileRepository.findBySupabaseUserId(supabaseUserId);
  if (!profile) return; // No profile to update — safe to ignore.

  await profileRepository.update(
    profile.id,
    { email },
    profile.version,
  );
}

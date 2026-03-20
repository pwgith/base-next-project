/**
 * Profile domain functions.
 * Pure functions only — no I/O, no side effects, no mutation of inputs.
 */

import { DomainError } from "@/lib/errors";
import type { Profile, UpdateProfileInput } from "./profileTypes";

const DISPLAY_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

/**
 * Validate a display name against business rules.
 * @throws {DomainError} if the name is invalid.
 */
export function validateDisplayName(displayName: string): void {
  if (!displayName || displayName.trim().length === 0) {
    throw new DomainError("Display name must not be empty.");
  }
  if (displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    throw new DomainError(
      `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }
}

/**
 * Validate an email address against business rules.
 * @throws {DomainError} if the email is invalid.
 */
export function validateEmail(email: string): void {
  if (!email || email.trim().length === 0) {
    throw new DomainError("Email must not be empty.");
  }
  if (email.trim().length > EMAIL_MAX_LENGTH) {
    throw new DomainError(
      `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`,
    );
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new DomainError("Email address is not valid.");
  }
}

/**
 * Apply display name update to a profile, returning a new profile object.
 * The version is passed through unchanged — the repository increments it.
 */
export function updateDisplayName(
  profile: Profile,
  newDisplayName: string,
): Profile {
  validateDisplayName(newDisplayName);
  return { ...profile, displayName: newDisplayName.trim() };
}

/**
 * Apply email update to a profile, returning a new profile object.
 * The version is passed through unchanged — the repository increments it.
 */
export function updateEmail(profile: Profile, newEmail: string): Profile {
  validateEmail(newEmail);
  return { ...profile, email: newEmail.trim().toLowerCase() };
}

/**
 * Apply an UpdateProfileInput to a profile, returning a new profile object.
 */
export function applyProfileUpdate(
  profile: Profile,
  input: UpdateProfileInput,
): Profile {
  let updated = { ...profile };
  if (input.displayName !== undefined) {
    updated = updateDisplayName(updated, input.displayName);
  }
  if (input.email !== undefined) {
    updated = updateEmail(updated, input.email);
  }
  return updated;
}

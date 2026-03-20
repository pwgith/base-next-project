/**
 * Shared helpers for API spec integration tests.
 *
 * Provides: authentication (test user setup/teardown via Supabase),
 * HTTP request builder, OpenAPI YAML spec loader, and common assertions.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { load as loadYaml } from "js-yaml";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const BASE_URL = "http://localhost:3000";
export const API_BASE_URL = `${BASE_URL}/api/v1`;
const SETUP_URL = `${BASE_URL}/api/test/setup`;
const TEARDOWN_URL = `${BASE_URL}/api/test/teardown`;

const DEFAULT_PASSWORD = "Secure!99";
const DEFAULT_SCOPES = ["ifc:read", "ifc:write", "ifc:delete"];

// ───────────────────────────────────────────────
// Supabase helpers
// ───────────────────────────────────────────────

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  return url;
}

function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  return key;
}

// ───────────────────────────────────────────────
// Auth — setup & teardown
// ───────────────────────────────────────────────

/** Create a test user and return a Supabase Bearer token. */
export async function setupUserAndGetToken(
  email: string,
  scopes: string[] = DEFAULT_SCOPES,
): Promise<string> {
  const setupRes = await fetch(SETUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [{ email, password: DEFAULT_PASSWORD, verified: true, scopes }],
    }),
  });
  if (!setupRes.ok) {
    throw new Error(`Setup failed for ${email}: ${setupRes.status} ${await setupRes.text()}`);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl(), supabaseAnonKey());
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEFAULT_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

/** Delete test users by email. */
export async function teardownUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
}

// ───────────────────────────────────────────────
// HTTP request builder
// ───────────────────────────────────────────────

/** Make an authenticated API request. Path is relative to /api/v1. */
export async function apiRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
  const options: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  return fetch(url, options);
}

/** Make an unauthenticated API request. */
export async function apiRequestNoAuth(
  method: string,
  path: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, { method });
}

// ───────────────────────────────────────────────
// Spec loader
// ───────────────────────────────────────────────

/** Load and parse an OpenAPI YAML spec file. */
export function loadSpec(relativePath: string): Record<string, unknown> {
  const fullPath = `specification/openApiSpecs/${relativePath}`;
  const content = readFileSync(fullPath, "utf8");
  return loadYaml(content) as Record<string, unknown>;
}

// ───────────────────────────────────────────────
// Common assertions
// ───────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function expectUuid(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(value).toMatch(UUID_RE);
}

export function expectIsoDateTime(value: unknown): void {
  expect(typeof value).toBe("string");
  const d = new Date(value as string);
  expect(d.toISOString()).toBeTruthy();
}

export function expectSuccessEnvelope(body: Record<string, unknown>): Record<string, unknown> {
  expect(body).toHaveProperty("data");
  expect(body).not.toHaveProperty("error");
  return body.data as Record<string, unknown>;
}

export function expectErrorEnvelope(body: Record<string, unknown>): void {
  expect(body).toHaveProperty("error");
  const err = body.error as Record<string, unknown>;
  expect(err).toHaveProperty("message");
  expect(typeof err.message).toBe("string");
}

/**
 * Shared IFC test helpers used by all IFC feature step definitions.
 * Extracts common test setup, teardown, and API request utilities.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const BASE_URL = "http://localhost:3000";
export const API_V1 = `${BASE_URL}/api/v1`;
export const IFC_FILES_URL = `${API_V1}/ifc/files`;
export const PROJECTS_URL = `${API_V1}/projects`;
export const SETUP_URL = `${BASE_URL}/api/test/setup`;
export const TEARDOWN_URL = `${BASE_URL}/api/test/teardown`;
export const IFC_VERSIONS_URL = `${BASE_URL}/api/test/ifc-versions`;
export const IFC_MODEL_DATA_URL = `${BASE_URL}/api/test/ifc-model-data`;
export const IFC_PROJECTS_SETUP_URL = `${BASE_URL}/api/test/ifc-projects`;

export const TEST_PASSWORD = "Secure!99";
export const DEFAULT_SCOPES = ["ifc:read", "ifc:write", "ifc:delete"];

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

/** Create a test user via the setup API and return a Supabase access token. */
export async function setupUserAndGetToken(
  email: string,
  scopes: string[] = DEFAULT_SCOPES,
): Promise<string> {
  const setupRes = await fetch(SETUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [{ email, password: TEST_PASSWORD, verified: true, scopes }],
    }),
  });
  if (!setupRes.ok) {
    throw new Error(`Setup failed for ${email}: ${setupRes.status} ${await setupRes.text()}`);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl(), supabaseAnonKey());
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }

  return data.session.access_token;
}

/** Tear down test users by email. */
export async function teardownUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
}

/** Make an authenticated API request. */
export async function apiRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return fetch(url, options);
}

/** Make an unauthenticated API request (no Authorization header). */
export async function unauthenticatedRequest(
  method: string,
  url: string,
): Promise<Response> {
  return fetch(url, { method });
}

/** Create an IFC project via the projects API. Returns projectId. */
export async function createTestProject(
  token: string,
  name: string,
): Promise<string> {
  const res = await apiRequest("POST", PROJECTS_URL, token, { name });
  if (!res.ok) {
    throw new Error(`Failed to create project: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.projectId;
}

/** Delete all IFC projects for a user (cleanup helper). */
export async function deleteAllProjects(token: string): Promise<void> {
  const res = await apiRequest("GET", PROJECTS_URL, token);
  if (!res.ok) return;
  const body = await res.json();
  const projects = body?.data?.projects ?? [];
  for (const p of projects) {
    await apiRequest("DELETE", `${PROJECTS_URL}/${p.projectId}?confirm=true`, token);
  }
}

/** Seed IFC model data into a project via the test endpoint. */
export async function seedModelData(
  projectId: string,
  data: Record<string, unknown>,
  replace = false,
): Promise<void> {
  const res = await fetch(IFC_MODEL_DATA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, data, replace }),
  });
  if (!res.ok) {
    throw new Error(`Failed to seed model data: ${res.status} ${await res.text()}`);
  }
}

/** Set the IFC version for a project to `targetVersion` via the test API. */
export async function setIfcVersion(projectId: string, targetVersion: number): Promise<void> {
  const res = await fetch(IFC_VERSIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, targetVersion }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set IFC version: ${res.status} ${await res.text()}`);
  }
}

/** World state interface shared across IFC step definitions. */
export interface IfcWorld {
  app: unknown;
  accessToken: string;
  lastResponse: Response;
  lastBody: Record<string, unknown>;
  createdEmails: string[];
  tokensByEmail: Map<string, string>;
  /** Map of fixture IDs (e.g. "file-001") to real server-assigned project IDs. */
  fileIdMap: Map<string, string>;
  /** Last created project ID (as fileId). */
  lastFileId: string;
  /** Additional state for specific features. */
  [key: string]: unknown;
}

/** Resolve fixture IDs to real server IDs. */
export function resolveFileId(fixtureId: string, fileIdMap: Map<string, string>): string {
  return fileIdMap.get(fixtureId) ?? fixtureId;
}

/** Resolve entire URL path with fixture IDs replaced. */
export function resolveUrl(path: string, fileIdMap: Map<string, string>): string {
  let resolved = path;
  for (const [fixture, real] of fileIdMap) {
    resolved = resolved.replaceAll(fixture, real);
  }
  return `${BASE_URL}${resolved}`;
}

/**
 * Create an IFC project for a user directly via the test endpoint (bypassing OAuth).
 * Returns the real server-assigned project ID.
 */
export async function createTestProjectForUser(
  email: string,
  name: string,
): Promise<string> {
  const res = await fetch(IFC_PROJECTS_SETUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create project for ${email}: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.projectId;
}

/**
 * API Spec Tests — Projects
 *
 * Validates the running API conforms to specification/openApiSpecs/projects/projects.yaml
 *
 * Operations covered:
 * - GET    /projects           (listProjects)
 * - POST   /projects           (createProject)
 * - GET    /projects/{id}      (getProject)
 * - PATCH  /projects/{id}      (updateProject)
 * - DELETE /projects/{id}      (deleteProject)
 */

import {
  setupUserAndGetToken,
  teardownUsers,
  apiRequest,
  apiRequestNoAuth,
  expectUuid,
  expectIsoDateTime,
  expectSuccessEnvelope,
  expectErrorEnvelope,
} from "../support/apiSpecHelper";

jest.setTimeout(30_000);

describe("Projects API", () => {
  const testEmail = "apispec.projects@example.com";
  const readOnlyEmail = "apispec.projects.readonly@example.com";
  let token: string;
  let readOnlyToken: string;
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);
    readOnlyToken = await setupUserAndGetToken(readOnlyEmail, ["ifc:read"]);
  });

  afterAll(async () => {
    // Clean up created projects
    for (const id of createdProjectIds) {
      await apiRequest("DELETE", `/projects/${id}?confirm=true`, token);
    }
    await teardownUsers([testEmail, readOnlyEmail]);
  });

  // ─── GET /projects ──────────────────────────

  describe("GET /projects", () => {
    it("returns 200 with data.projects array", async () => {
      const res = await apiRequest("GET", "/projects", token);
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("projects");
      expect(Array.isArray(data.projects)).toBe(true);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", "/projects");
      expect(res.status).toBe(401);

      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 403 with no ifc:read scope", async () => {
      const noScopeToken = await setupUserAndGetToken(
        "apispec.projects.noscope@example.com",
        [],
      );
      try {
        const res = await apiRequest("GET", "/projects", noScopeToken);
        expect(res.status).toBe(403);
        const body = await res.json();
        expectErrorEnvelope(body);
      } finally {
        await teardownUsers(["apispec.projects.noscope@example.com"]);
      }
    });
  });

  // ─── POST /projects ─────────────────────────

  describe("POST /projects", () => {
    it("returns 201 with created project", async () => {
      const res = await apiRequest("POST", "/projects", token, {
        name: "Spec Test Project",
        description: "Created by API spec test",
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expectUuid(data.projectId);
      expect(typeof data.name).toBe("string");
      expect(typeof data.currentIfcVersion).toBe("number");
      expectIsoDateTime(data.createdAt);
      expectIsoDateTime(data.lastUpdatedAt);

      createdProjectIds.push(data.projectId as string);
    });

    it("returns 422 when body has no name", async () => {
      const res = await apiRequest("POST", "/projects", token, {});
      expect(res.status).toBe(422);

      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 403 with read-only scope", async () => {
      const res = await apiRequest("POST", "/projects", readOnlyToken, {
        name: "Should Fail",
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expectErrorEnvelope(body);
    });
  });

  // ─── GET /projects/{projectId} ──────────────

  describe("GET /projects/{projectId}", () => {
    let projectId: string;

    beforeAll(async () => {
      const res = await apiRequest("POST", "/projects", token, { name: "Get Test" });
      const body = await res.json();
      projectId = body.data.projectId;
      createdProjectIds.push(projectId);
    });

    it("returns 200 with project data", async () => {
      const res = await apiRequest("GET", `/projects/${projectId}`, token);
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data.projectId).toBe(projectId);
      expect(typeof data.name).toBe("string");
      expect(typeof data.currentIfcVersion).toBe("number");
      expectIsoDateTime(data.createdAt);
      expectIsoDateTime(data.lastUpdatedAt);
    });

    it("returns 404 for non-existent project", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("GET", `/projects/${fakeId}`, token);
      expect(res.status).toBe(404);
      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", `/projects/${projectId}`);
      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /projects/{projectId} ─────────────

  describe("PATCH /projects/{projectId}", () => {
    let projectId: string;

    beforeAll(async () => {
      const res = await apiRequest("POST", "/projects", token, { name: "Patch Test" });
      const body = await res.json();
      projectId = body.data.projectId;
      createdProjectIds.push(projectId);
    });

    it("returns 200 with updated project", async () => {
      const res = await apiRequest("PATCH", `/projects/${projectId}`, token, {
        name: "Updated Name",
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data.projectId).toBe(projectId);
      expect(data.name).toBe("Updated Name");
    });

    it("returns 404 for non-existent project", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("PATCH", `/projects/${fakeId}`, token, {
        name: "Nope",
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 404 for different user (hides existence)", async () => {
      const res = await apiRequest("PATCH", `/projects/${projectId}`, readOnlyToken, {
        name: "Should Fail",
      });
      // API returns 404 instead of 403 to avoid leaking resource existence
      expect(res.status).toBe(404);
      const body = await res.json();
      expectErrorEnvelope(body);
    });
  });

  // ─── DELETE /projects/{projectId} ────────────

  describe("DELETE /projects/{projectId}", () => {
    it("returns 204 with confirm=true", async () => {
      // Create a project to delete
      const createRes = await apiRequest("POST", "/projects", token, { name: "Delete Me" });
      const createBody = await createRes.json();
      const projectId = createBody.data.projectId;

      const res = await apiRequest("DELETE", `/projects/${projectId}?confirm=true`, token);
      expect(res.status).toBe(204);
    });

    it("returns 204 without confirm query param", async () => {
      const createRes = await apiRequest("POST", "/projects", token, { name: "No Confirm" });
      const createBody = await createRes.json();
      const projectId = createBody.data.projectId;

      const res = await apiRequest("DELETE", `/projects/${projectId}`, token);
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent project", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("DELETE", `/projects/${fakeId}?confirm=true`, token);
      expect(res.status).toBe(404);
    });

    it("returns 404 for different user (hides existence)", async () => {
      const createRes = await apiRequest("POST", "/projects", token, { name: "Scope Fail" });
      const createBody = await createRes.json();
      const projectId = createBody.data.projectId;
      createdProjectIds.push(projectId);

      // API returns 404 instead of 403 to avoid leaking resource existence
      const res = await apiRequest("DELETE", `/projects/${projectId}?confirm=true`, readOnlyToken);
      expect(res.status).toBe(404);
    });
  });
});

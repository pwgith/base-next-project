/**
 * API Spec Tests — IFC Versioning
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-versioning/ifc-versioning.yaml
 *
 * Operations covered:
 * - GET  /ifc/files/{fileId}/versions                       (listVersions)
 * - GET  /ifc/files/{fileId}/versions/{version}             (getVersionMetadata)
 * - GET  /ifc/files/{fileId}/versions/{version}/download    (downloadVersion)
 * - POST /ifc/files/{fileId}/versions/{version}/restore     (restoreVersion)
 */

import {
  setupUserAndGetToken,
  teardownUsers,
  apiRequest,
  apiRequestNoAuth,
  expectSuccessEnvelope,
  expectErrorEnvelope,
} from "../support/apiSpecHelper";

jest.setTimeout(30_000);

describe("IFC Versioning API", () => {
  const testEmail = "apispec.versioning@example.com";
  let token: string;
  let fileId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    // Create a file — it starts at version 1
    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "versioning-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;

    // Create an element to bump to version 2
    await apiRequest("POST", `/ifc/files/${fileId}/elements`, token, {
      ifcType: "IfcWall",
      name: "V2 Wall",
    });
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── GET /ifc/files/{fileId}/versions ───────

  describe("GET /ifc/files/{fileId}/versions", () => {
    it("returns 200 with versions array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/versions`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("versions");
      expect(Array.isArray(data.versions)).toBe(true);
      expect((data.versions as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/versions`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/versions`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/versions/{version} ───

  describe("GET /ifc/files/{fileId}/versions/{version}", () => {
    it("returns 200 with version metadata", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/versions/1`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      // Version metadata is returned as a direct object
      expect(data).toBeDefined();
    });

    it("returns 404 for non-existent version", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/versions/9999`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/versions/{version}/download ───

  describe("GET /ifc/files/{fileId}/versions/{version}/download", () => {
    it("returns 200 with binary content and content-disposition", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/versions/1/download`,
        token,
      );
      expect(res.status).toBe(200);

      const contentType = res.headers.get("content-type");
      expect(contentType).toBeTruthy();

      const disposition = res.headers.get("content-disposition");
      expect(disposition).toBeTruthy();
      expect(disposition).toContain("attachment");
    });

    it("returns 404 for non-existent version", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/versions/9999/download`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /ifc/files/{fileId}/versions/{version}/restore ───

  describe("POST /ifc/files/{fileId}/versions/{version}/restore", () => {
    it("returns 201 after restoring version 1", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/versions/1/restore`,
        token,
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.version).toBe("number");
    });

    it("returns 404 for non-existent version", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/versions/9999/restore`,
        token,
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 with read-only scope", async () => {
      const roEmail = "apispec.versioning.ro@example.com";
      const roToken = await setupUserAndGetToken(roEmail, ["ifc:read"]);
      try {
        const res = await apiRequest(
          "POST",
          `/ifc/files/${fileId}/versions/1/restore`,
          roToken,
        );
        expect(res.status).toBe(403);
      } finally {
        await teardownUsers([roEmail]);
      }
    });
  });
});

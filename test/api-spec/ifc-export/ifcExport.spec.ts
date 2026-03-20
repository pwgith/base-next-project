/**
 * API Spec Tests — IFC Export / Download
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-export/ifc-export.yaml
 *
 * Operations covered:
 * - GET  /ifc/files/{fileId}/download            (downloadCurrentVersion)
 * - GET  /ifc/files/{fileId}/export               (exportFullModel)
 * - POST /ifc/files/{fileId}/export               (exportSubset)
 */

import {
  setupUserAndGetToken,
  teardownUsers,
  apiRequest,
  apiRequestNoAuth,
} from "../support/apiSpecHelper";

jest.setTimeout(30_000);

describe("IFC Export / Download API", () => {
  const testEmail = "apispec.export@example.com";
  let token: string;
  let fileId: string;
  let elementGlobalId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    // Create a file
    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "export-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;

    // Create an element so subset export has something to reference
    const elemRes = await apiRequest(
      "POST",
      `/ifc/files/${fileId}/elements`,
      token,
      { ifcType: "IfcWall", name: "ExportWall" },
    );
    const elemBody = await elemRes.json();
    elementGlobalId = elemBody.data.globalId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── GET /ifc/files/{fileId}/download ───────

  describe("GET /ifc/files/{fileId}/download", () => {
    it("returns 200 with binary content and Content-Disposition", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/download`,
        token,
      );
      expect(res.status).toBe(200);

      const contentDisposition = res.headers.get("content-disposition");
      expect(contentDisposition).toBeDefined();
      expect(contentDisposition).toContain("attachment");
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/download`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/download`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/export ─────────

  describe("GET /ifc/files/{fileId}/export", () => {
    it("returns 200 with binary content", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/export`,
        token,
      );
      expect(res.status).toBe(200);

      const contentDisposition = res.headers.get("content-disposition");
      expect(contentDisposition).toBeDefined();
      expect(contentDisposition).toContain("attachment");
    });

    it("supports format query parameter", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/export?format=ifc`,
        token,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/export`,
        token,
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/export`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /ifc/files/{fileId}/export ────────

  describe("POST /ifc/files/{fileId}/export", () => {
    it("returns 200 with binary content for subset export", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/export`,
        token,
        { globalIds: [elementGlobalId] },
      );
      expect(res.status).toBe(200);

      const contentDisposition = res.headers.get("content-disposition");
      expect(contentDisposition).toBeDefined();
      expect(contentDisposition).toContain("attachment");
    });

    it("returns 200 for full export when no globalIds", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/export`,
        token,
        {},
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/export`,
        token,
        { globalIds: [] },
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "POST",
        `/ifc/files/${fileId}/export`,
      );
      expect(res.status).toBe(401);
    });
  });
});

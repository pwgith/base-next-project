/**
 * API Spec Tests — IFC Files
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-files/ifc-files.yaml
 *
 * Operations covered:
 * - GET    /ifc/files           (listFiles)
 * - POST   /ifc/files           (uploadFile — JSON fallback)
 * - GET    /ifc/files/{fileId}  (getFile)
 * - DELETE /ifc/files/{fileId}  (deleteFile)
 */

import {
  setupUserAndGetToken,
  teardownUsers,
  apiRequest,
  apiRequestNoAuth,
  expectUuid,
  expectSuccessEnvelope,
  expectErrorEnvelope,
} from "../support/apiSpecHelper";

jest.setTimeout(30_000);

describe("IFC Files API", () => {
  const testEmail = "apispec.ifcfiles@example.com";
  let token: string;
  const createdFileIds: string[] = [];

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);
  });

  afterAll(async () => {
    for (const id of createdFileIds) {
      await apiRequest("DELETE", `/ifc/files/${id}`, token);
    }
    await teardownUsers([testEmail]);
  });

  /** Helper to create an IFC file and track it for cleanup. */
  async function createFile(name = "test.ifc"): Promise<string> {
    const res = await apiRequest("POST", "/ifc/files", token, { fileName: name });
    const body = await res.json();
    const fileId = body.data.fileId as string;
    createdFileIds.push(fileId);
    return fileId;
  }

  // ─── GET /ifc/files ─────────────────────────

  describe("GET /ifc/files", () => {
    it("returns 200 with data.files array", async () => {
      const res = await apiRequest("GET", "/ifc/files", token);
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("files");
      expect(Array.isArray(data.files)).toBe(true);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", "/ifc/files");
      expect(res.status).toBe(401);
      const body = await res.json();
      expectErrorEnvelope(body);
    });
  });

  // ─── POST /ifc/files ────────────────────────

  describe("POST /ifc/files", () => {
    it("returns 201 with created file metadata", async () => {
      const res = await apiRequest("POST", "/ifc/files", token, {
        fileName: "model.ifc",
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expectUuid(data.fileId);
      expect(typeof data.name).toBe("string");
      expect(typeof data.schema).toBe("string");
      expect(typeof data.version).toBe("number");

      createdFileIds.push(data.fileId as string);
    });

    it("returns 422 for non-IFC file extension", async () => {
      const res = await apiRequest("POST", "/ifc/files", token, {
        fileName: "model.dwg",
      });
      expect(res.status).toBe(422);
      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 403 with read-only scope", async () => {
      const readOnlyEmail = "apispec.ifcfiles.ro@example.com";
      const readOnlyToken = await setupUserAndGetToken(readOnlyEmail, ["ifc:read"]);
      try {
        const res = await apiRequest("POST", "/ifc/files", readOnlyToken, {
          fileName: "blocked.ifc",
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expectErrorEnvelope(body);
      } finally {
        await teardownUsers([readOnlyEmail]);
      }
    });
  });

  // ─── GET /ifc/files/{fileId} ────────────────

  describe("GET /ifc/files/{fileId}", () => {
    let fileId: string;

    beforeAll(async () => {
      fileId = await createFile("gettest.ifc");
    });

    it("returns 200 with file metadata", async () => {
      const res = await apiRequest("GET", `/ifc/files/${fileId}`, token);
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data.fileId).toBe(fileId);
      expect(typeof data.name).toBe("string");
      expect(typeof data.schema).toBe("string");
      expect(typeof data.elementCount).toBe("number");
      expect(typeof data.currentVersion).toBe("number");
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("GET", `/ifc/files/${fakeId}`, token);
      expect(res.status).toBe(404);
      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", `/ifc/files/${fileId}`);
      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /ifc/files/{fileId} ─────────────

  describe("DELETE /ifc/files/{fileId}", () => {
    it("returns 204 on successful deletion", async () => {
      const fileId = await createFile("deleteme.ifc");
      // Remove from tracked list since we're deleting it explicitly
      createdFileIds.pop();

      const res = await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("DELETE", `/ifc/files/${fakeId}`, token);
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const fileId = await createFile("noauth.ifc");
      const res = await apiRequestNoAuth("DELETE", `/ifc/files/${fileId}`);
      expect(res.status).toBe(401);
    });
  });
});

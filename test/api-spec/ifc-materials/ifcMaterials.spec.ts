/**
 * API Spec Tests — IFC Materials
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-materials/ifc-materials.yaml
 *
 * Operations covered:
 * - GET  /ifc/files/{fileId}/materials                       (listMaterials)
 * - POST /ifc/files/{fileId}/materials                       (createMaterial)
 * - POST /ifc/files/{fileId}/materials/{materialId}/assignments (bulkAssignMaterial)
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

describe("IFC Materials API", () => {
  const testEmail = "apispec.materials@example.com";
  let token: string;
  let fileId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "materials-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── GET /ifc/files/{fileId}/materials ──────

  describe("GET /ifc/files/{fileId}/materials", () => {
    it("returns 200 with materials array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/materials`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("materials");
      expect(Array.isArray(data.materials)).toBe(true);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/materials`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/materials`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /ifc/files/{fileId}/materials ─────

  describe("POST /ifc/files/{fileId}/materials", () => {
    it("returns 201 with created material", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/materials`,
        token,
        { name: "Concrete" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.materialId).toBe("string");
      expect(data.name).toBe("Concrete");
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/materials`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 with read-only scope", async () => {
      const roEmail = "apispec.materials.ro@example.com";
      const roToken = await setupUserAndGetToken(roEmail, ["ifc:read"]);
      try {
        const res = await apiRequest(
          "POST",
          `/ifc/files/${fileId}/materials`,
          roToken,
          { name: "Blocked" },
        );
        expect(res.status).toBe(403);
      } finally {
        await teardownUsers([roEmail]);
      }
    });
  });

  // ─── POST /ifc/files/{fileId}/materials/{materialId}/assignments ─

  describe("POST /ifc/files/{fileId}/materials/{materialId}/assignments", () => {
    let materialId: string;
    let elementGlobalId: string;

    beforeAll(async () => {
      // Create a material to assign
      const matRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/materials`,
        token,
        { name: "Assignment Test Material" },
      );
      const matBody = await matRes.json();
      materialId = matBody.data.materialId;

      // Create an element to assign the material to
      const elemRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcWall", name: "Assignment Wall" },
      );
      const elemBody = await elemRes.json();
      elementGlobalId = elemBody.data.globalId;
    });

    it("returns 200 with assignment summary", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/materials/${materialId}/assignments`,
        token,
        { elementGlobalIds: [elementGlobalId] },
      );
      expect([200, 207]).toContain(res.status);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent material", async () => {
      const fakeMaterialId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/materials/${fakeMaterialId}/assignments`,
        token,
        { elementGlobalIds: [elementGlobalId] },
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeFileId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeFileId}/materials/${materialId}/assignments`,
        token,
        { elementGlobalIds: [elementGlobalId] },
      );
      expect(res.status).toBe(404);
    });
  });
});

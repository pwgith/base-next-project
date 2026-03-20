/**
 * API Spec Tests — IFC Metadata
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-metadata/ifc-metadata.yaml
 *
 * Operations covered:
 * - GET    /ifc/files/{fileId}/project                       (getProjectEntity)
 * - PATCH  /ifc/files/{fileId}/project                       (updateProjectEntity)
 * - GET    /ifc/files/{fileId}/project/units                 (getProjectUnits)
 * - PATCH  /ifc/files/{fileId}/project/units                 (updateProjectUnits)
 * - GET    /ifc/files/{fileId}/element-types                 (listElementTypes)
 * - GET    /ifc/files/{fileId}/coordinate-reference-system   (getCRS)
 * - GET    /ifc/files/{fileId}/classifications               (listClassifications)
 * - POST   /ifc/files/{fileId}/classifications               (createFileClassification)
 * - GET    /ifc/files/{fileId}/classifications/{systemId}    (getFileClassification)
 * - PATCH  /ifc/files/{fileId}/classifications/{systemId}    (updateFileClassification)
 * - DELETE /ifc/files/{fileId}/classifications/{systemId}    (deleteFileClassification)
 * - POST   /ifc/files/{fileId}/systems                       (createSystem)
 * - GET    /ifc/property-set-schemas                         (listPropertySetSchemas)
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

describe("IFC Metadata API", () => {
  const testEmail = "apispec.metadata@example.com";
  let token: string;
  let fileId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "metadata-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── GET /ifc/files/{fileId}/project ────────

  describe("GET /ifc/files/{fileId}/project", () => {
    it("returns 200 with project entity", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/project`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("globalId");
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/project`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/project`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/element-types ──

  describe("GET /ifc/files/{fileId}/element-types", () => {
    it("returns 200 with types array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/element-types`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("types");
      expect(Array.isArray(data.types)).toBe(true);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/element-types`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/coordinate-reference-system ──

  describe("GET /ifc/files/{fileId}/coordinate-reference-system", () => {
    it("returns 200 with CRS data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/coordinate-reference-system`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/coordinate-reference-system`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/classifications ──

  describe("GET /ifc/files/{fileId}/classifications", () => {
    it("returns 200 with classifications array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/classifications`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("classifications");
      expect(Array.isArray(data.classifications)).toBe(true);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/classifications`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /ifc/files/{fileId}/systems ───────

  describe("POST /ifc/files/{fileId}/systems", () => {
    it("returns 201 with created system", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/systems`,
        token,
        { name: "HVAC System", ifcType: "IfcSystem" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("globalId");
      expect(data).toHaveProperty("name");
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/systems`,
        token,
        { name: "Ghost", ifcType: "IfcSystem" },
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "POST",
        `/ifc/files/${fileId}/systems`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /ifc/files/{fileId}/project ──────

  describe("PATCH /ifc/files/{fileId}/project", () => {
    it("returns 200 with updated project entity", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/project`,
        token,
        { name: "Updated Project Name" },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("globalId");
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fakeId}/project`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/project/units ──

  describe("GET /ifc/files/{fileId}/project/units", () => {
    it("returns 200 with units array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/project/units`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("units");
      expect(Array.isArray(data.units)).toBe(true);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/project/units`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /ifc/files/{fileId}/project/units ─

  describe("PATCH /ifc/files/{fileId}/project/units", () => {
    it("returns 200 with updated units", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/project/units`,
        token,
        {
          units: [
            { unitType: "LENGTHUNIT", prefix: null, name: "METRE" },
          ],
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("units");
      expect(Array.isArray(data.units)).toBe(true);
    });

    it("returns 422 when units is not an array", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/project/units`,
        token,
        { units: "invalid" },
      );
      expect(res.status).toBe(422);

      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fakeId}/project/units`,
        token,
        { units: [] },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /ifc/files/{fileId}/classifications ─

  describe("POST /ifc/files/{fileId}/classifications", () => {
    it("returns 201 with created classification system", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/classifications`,
        token,
        { name: "Uniclass 2015" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("name");
      expect(typeof data.name).toBe("string");
    });

    it("returns 422 when name is missing", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/classifications`,
        token,
        {},
      );
      expect(res.status).toBe(422);

      const body = await res.json();
      expectErrorEnvelope(body);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/classifications`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/classifications/{systemId} ─

  describe("GET /ifc/files/{fileId}/classifications/{systemId}", () => {
    let classificationId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/classifications`,
        token,
        { name: "OmniClass" },
      );
      const body = await res.json();
      classificationId = body.data.globalId ?? body.data.systemId ?? body.data.id;
    });

    it("returns 200 with classification system", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/classifications/${classificationId}`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent system", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/classifications/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /ifc/files/{fileId}/classifications/{systemId} ─

  describe("PATCH /ifc/files/{fileId}/classifications/{systemId}", () => {
    let classificationId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/classifications`,
        token,
        { name: "MasterFormat" },
      );
      const body = await res.json();
      classificationId = body.data.globalId ?? body.data.systemId ?? body.data.id;
    });

    it("returns 200 with updated classification system", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/classifications/${classificationId}`,
        token,
        { name: "MasterFormat 2018" },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent system", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/classifications/0000000000000000000000`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /ifc/files/{fileId}/classifications/{systemId} ─

  describe("DELETE /ifc/files/{fileId}/classifications/{systemId}", () => {
    let classificationId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/classifications`,
        token,
        { name: "Disposable System" },
      );
      const body = await res.json();
      classificationId = body.data.globalId ?? body.data.systemId ?? body.data.id;
    });

    it("returns 204 on successful deletion", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/classifications/${classificationId}`,
        token,
      );
      expect(res.status).toBe(204);

      const text = await res.text();
      expect(text).toBe("");
    });

    it("returns 404 for non-existent system", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/classifications/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/property-set-schemas ──────────

  describe("GET /ifc/property-set-schemas", () => {
    it("returns 200 with schemas array", async () => {
      const res = await apiRequest(
        "GET",
        "/ifc/property-set-schemas",
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("schemas");
      expect(Array.isArray(data.schemas)).toBe(true);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", "/ifc/property-set-schemas");
      expect(res.status).toBe(401);
    });
  });
});

/**
 * API Spec Tests — IFC Spatial
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-spatial/ifc-spatial.yaml
 *
 * Operations covered:
 * - POST   /ifc/files/{fileId}/storeys                        (createStorey)
 * - PATCH  /ifc/files/{fileId}/storeys/{storeyId}             (updateStorey)
 * - DELETE /ifc/files/{fileId}/storeys/{storeyId}             (deleteStorey)
 * - POST   /ifc/files/{fileId}/storeys/{storeyId}/spaces      (createSpace)
 * - GET    /ifc/files/{fileId}/spatial-structure               (getSpatialStructure)
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

describe("IFC Spatial API", () => {
  const testEmail = "apispec.spatial@example.com";
  let token: string;
  let fileId: string;
  let storeyGlobalId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "spatial-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── POST /ifc/files/{fileId}/storeys ───────

  describe("POST /ifc/files/{fileId}/storeys", () => {
    it("returns 201 with created storey", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/storeys`,
        token,
        { name: "Ground Floor", elevation: 0 },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.globalId).toBe("string");
      expect(typeof data.version).toBe("number");

      storeyGlobalId = data.globalId as string;
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/storeys`,
        token,
        { name: "Nope" },
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "POST",
        `/ifc/files/${fileId}/storeys`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /ifc/files/{fileId}/storeys/{storeyId} ───

  describe("PATCH /ifc/files/{fileId}/storeys/{storeyId}", () => {
    it("returns 200 with updated storey", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/storeys/${storeyGlobalId}`,
        token,
        { name: "First Floor", elevation: 3.5 },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.version).toBe("number");
    });

    it("returns 404 for non-existent storey", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/storeys/0000000000000000000000`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /ifc/files/{fileId}/storeys/{storeyId}/spaces ───

  describe("POST /ifc/files/{fileId}/storeys/{storeyId}/spaces", () => {
    it("returns 201 with created space", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/storeys/${storeyGlobalId}/spaces`,
        token,
        { name: "Room 101", longName: "Main Office" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.globalId).toBe("string");
      expect(typeof data.version).toBe("number");
    });

    it("returns 404 for non-existent storey", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/storeys/0000000000000000000000/spaces`,
        token,
        { name: "Orphan" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/spatial-structure ───

  describe("GET /ifc/files/{fileId}/spatial-structure", () => {
    it("returns 200 with spatial structure", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/spatial-structure`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "GET",
        `/ifc/files/${fileId}/spatial-structure`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fakeId}/spatial-structure`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /ifc/files/{fileId}/storeys/{storeyId} ───

  describe("DELETE /ifc/files/{fileId}/storeys/{storeyId}", () => {
    it("returns 204 for storey with no elements", async () => {
      // Create a fresh storey with no elements attached
      const createRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/storeys`,
        token,
        { name: "Empty Storey" },
      );
      const createBody = await createRes.json();
      const emptyStoreyId = createBody.data.globalId;

      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/storeys/${emptyStoreyId}`,
        token,
      );
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent storey", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/storeys/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });
});

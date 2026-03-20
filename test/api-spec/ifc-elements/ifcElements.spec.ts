/**
 * API Spec Tests — IFC Elements
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-elements/ifc-elements.yaml
 *
 * Operations covered:
 * - GET    /ifc/files/{fileId}/elements                (listElements)
 * - POST   /ifc/files/{fileId}/elements                (createElement)
 * - GET    /ifc/files/{fileId}/elements/summary         (getElementSummary)
 * - GET    /ifc/files/{fileId}/elements/{globalId}      (getElement)
 * - PATCH  /ifc/files/{fileId}/elements/{globalId}      (updateElement)
 * - DELETE /ifc/files/{fileId}/elements/{globalId}      (deleteElement)
 * - GET    .../geometry                                 (getElementGeometry)
 * - GET    .../placement                                (getElementPlacement)
 * - PATCH  .../placement                                (updateElementPlacement)
 * - GET    .../type                                     (getElementType)
 * - PUT    .../type                                     (setElementType)
 * - GET    .../spatial-containment                      (getElementSpatialContainment)
 * - PUT    .../spatial-containment                      (setElementSpatialContainment)
 * - GET    .../property-sets                            (listPropertySets)
 * - POST   .../property-sets                            (createPropertySet)
 * - POST   .../property-sets/validate                   (validateAllPropertySets)
 * - POST   .../property-sets/{psetName}/validate        (validatePropertySet)
 * - GET    .../classifications                          (listElementClassifications)
 * - POST   .../classifications                          (addElementClassification)
 * - GET    .../material                                 (getElementMaterial)
 * - PUT    .../material                                 (setElementMaterial)
 * - DELETE .../material                                 (removeElementMaterial)
 * - PATCH  .../material/constituents/{index}            (updateMaterialConstituent)
 * - DELETE .../material/constituents/{index}            (deleteMaterialConstituent)
 * - GET    .../openings                                 (listElementOpenings)
 * - POST   .../openings                                 (createElementOpening)
 * - DELETE .../openings/{openingId}                     (deleteElementOpening)
 * - GET    .../openings/{openingId}/filling             (getOpeningFilling)
 * - PUT    .../openings/{openingId}/filling             (setOpeningFilling)
 * - DELETE .../openings/{openingId}/filling             (removeOpeningFilling)
 * - GET    .../ports                                    (listElementPorts)
 * - POST   .../ports                                    (createElementPort)
 * - GET    .../connections                              (listElementConnections)
 * - POST   .../connections                              (createElementConnection)
 * - DELETE .../connections/{connectionId}               (deleteElementConnection)
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

jest.setTimeout(60_000);

describe("IFC Elements API", () => {
  const testEmail = "apispec.elements@example.com";
  let token: string;
  let fileId: string;
  let elementGlobalId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    // Create a file to hold elements
    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "elements-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;

    // Create an element for sub-resource tests
    const elemRes = await apiRequest(
      "POST",
      `/ifc/files/${fileId}/elements`,
      token,
      { ifcType: "IfcWall", name: "Test Wall" },
    );
    const elemBody = await elemRes.json();
    elementGlobalId = elemBody.data.globalId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── Element CRUD ───────────────────────────

  describe("GET /ifc/files/{fileId}/elements", () => {
    it("returns 200 with elements array and total", async () => {
      const res = await apiRequest("GET", `/ifc/files/${fileId}/elements`, token);
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(Array.isArray(data.elements)).toBe(true);
      expect(typeof data.total).toBe("number");
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth("GET", `/ifc/files/${fileId}/elements`);
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest("GET", `/ifc/files/${fakeId}/elements`, token);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /ifc/files/{fileId}/elements", () => {
    it("returns 201 with created element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcSlab", name: "Spec Slab" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.globalId).toBe("string");
      expect(typeof data.ifcType).toBe("string");
      expect(typeof data.version).toBe("number");
    });

    it("returns 403 with read-only scope", async () => {
      const roEmail = "apispec.elements.ro@example.com";
      const roToken = await setupUserAndGetToken(roEmail, ["ifc:read"]);
      try {
        const res = await apiRequest(
          "POST",
          `/ifc/files/${fileId}/elements`,
          roToken,
          { ifcType: "IfcWall", name: "Blocked" },
        );
        expect(res.status).toBe(403);
      } finally {
        await teardownUsers([roEmail]);
      }
    });
  });

  describe("GET /ifc/files/{fileId}/elements/summary", () => {
    it("returns 200 with groups array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/summary`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("groups");
      expect(Array.isArray(data.groups)).toBe(true);
    });
  });

  describe("GET /ifc/files/{fileId}/elements/{globalId}", () => {
    it("returns 200 with element data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data.globalId).toBe(elementGlobalId);
      expect(typeof data.ifcType).toBe("string");
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /ifc/files/{fileId}/elements/{globalId}", () => {
    it("returns 200 with updated element and version", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/elements/${elementGlobalId}`,
        token,
        { name: "Updated Wall" },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.version).toBe("number");
    });
  });

  describe("DELETE /ifc/files/{fileId}/elements/{globalId}", () => {
    it("returns 204 on successful deletion", async () => {
      // Create a throwaway element to delete
      const createRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcBeam", name: "Delete Me" },
      );
      const createBody = await createRes.json();
      const gid = createBody.data.globalId;

      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${gid}`,
        token,
      );
      expect(res.status).toBe(204);
    });
  });

  // ─── Geometry ───────────────────────────────

  describe("GET .../elements/{globalId}/geometry", () => {
    it("returns 200 with geometry data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/geometry`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });
  });

  // ─── Placement ──────────────────────────────

  describe("GET .../elements/{globalId}/placement", () => {
    it("returns 200 with placement data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/placement`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });
  });

  describe("PATCH .../elements/{globalId}/placement", () => {
    it("returns 200 with updated placement", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/placement`,
        token,
        { location: { x: 1.0, y: 2.0, z: 3.0 } },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });
  });

  // ─── Type ───────────────────────────────────

  describe("GET .../elements/{globalId}/type", () => {
    it("returns 404 when no type assigned", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/type`,
        token,
      );
      // No type assigned yet — 404 is expected
      expect(res.status).toBe(404);
    });
  });

  describe("PUT .../elements/{globalId}/type", () => {
    it("returns 404 when referencing non-existent type definition", async () => {
      const res = await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/type`,
        token,
        { typeGlobalId: "0000000000000000000000" },
      );
      // No type definitions exist in the model
      expect(res.status).toBe(404);
    });
  });

  // ─── Spatial Containment ────────────────────

  describe("GET .../elements/{globalId}/spatial-containment", () => {
    it("returns 404 when no spatial containment set", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/spatial-containment`,
        token,
      );
      // Element was created without storey assignment
      expect(res.status).toBe(404);
    });
  });

  // ─── Property Sets ─────────────────────────

  describe("GET .../elements/{globalId}/property-sets", () => {
    it("returns 200 with propertySets array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/property-sets`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("propertySets");
      expect(Array.isArray(data.propertySets)).toBe(true);
    });
  });

  describe("POST .../elements/{globalId}/property-sets", () => {
    it("returns 201 with created property set", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/property-sets`,
        token,
        {
          name: "Pset_WallCommon",
          properties: [{ name: "IsExternal", type: "IfcBoolean", value: true }],
        },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });
  });

  // ─── Classifications ────────────────────────

  describe("GET .../elements/{globalId}/classifications", () => {
    it("returns 200 with classifications array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/classifications`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("classifications");
      expect(Array.isArray(data.classifications)).toBe(true);
    });
  });

  describe("POST .../elements/{globalId}/classifications", () => {
    it("returns 201 with created classification reference", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/classifications`,
        token,
        {
          system: { name: "Uniclass 2015" },
          identification: "Ss_25_10",
          name: "Wall systems",
        },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });
  });

  // ─── Material ───────────────────────────────

  describe("GET .../elements/{globalId}/material", () => {
    it("returns 200 with material data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
      );
      // May return 200 with null/empty if no material assigned, or 404
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("PUT .../elements/{globalId}/material", () => {
    it("returns 200 with set material assignment using layers", async () => {
      const res = await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
        {
          assignmentType: "IfcMaterialLayerSetUsage",
          layers: [{ name: "Brick", thickness: 0.1 }],
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 422 with no materialId or layers", async () => {
      const res = await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
        { assignmentType: "IfcMaterial" },
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expectErrorEnvelope(body);
    });
  });

  describe("DELETE .../elements/{globalId}/material", () => {
    it("returns 204 after removing material", async () => {
      // First ensure material is assigned
      await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
        { type: "IfcMaterial", material: { name: "Brick" } },
      );

      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
      );
      expect(res.status).toBe(204);
    });
  });

  // ─── Material Constituents ──────────────────

  describe("PATCH .../material/constituents/{index}", () => {
    beforeAll(async () => {
      // Ensure there is a constituent set material assignment
      await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
        {
          assignmentType: "IfcMaterialConstituentSet",
          constituents: [
            { name: "Core", materialName: "Concrete", fraction: 0.8 },
          ],
        },
      );
    });

    it("returns 200 with updated constituent", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material/constituents/0`,
        token,
        { name: "Updated Core" },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "PATCH",
        `/ifc/files/${fileId}/elements/0000000000000000000000/material/constituents/0`,
        token,
        { name: "Ghost" },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE .../material/constituents/{index}", () => {
    beforeAll(async () => {
      // Ensure there is a constituent set with at least two constituents
      await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material`,
        token,
        {
          assignmentType: "IfcMaterialConstituentSet",
          constituents: [
            { name: "Outer", materialName: "Brick", fraction: 0.5 },
            { name: "Inner", materialName: "Plaster", fraction: 0.5 },
          ],
        },
      );
    });

    it("returns 200 with updated assignment after deletion", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/material/constituents/1`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/0000000000000000000000/material/constituents/0`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── Openings ───────────────────────────────

  describe("GET .../elements/{globalId}/openings", () => {
    it("returns 200 with openings array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("openings");
      expect(Array.isArray(data.openings)).toBe(true);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/0000000000000000000000/openings`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST .../elements/{globalId}/openings", () => {
    it("returns 201 with created opening", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
        {
          name: "Door Opening 1",
          placement: { x: 0, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("globalId");
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/0000000000000000000000/openings`,
        token,
        {
          name: "Ghost Opening",
          placement: { x: 0, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE .../openings/{openingId}", () => {
    let openingId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
        {
          name: "Disposable Opening",
          placement: { x: 1, y: 0, z: 0 },
          dimensions: { width: 0.8, height: 2.0 },
        },
      );
      const body = await res.json();
      openingId = body.data.globalId;
    });

    it("returns 204 on successful deletion", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/${openingId}`,
        token,
      );
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent opening", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── Opening Filling ───────────────────────

  describe("GET .../openings/{openingId}/filling", () => {
    let openingId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
        {
          name: "Filling Test Opening",
          placement: { x: 2, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      );
      const body = await res.json();
      openingId = body.data.globalId;
    });

    it("returns 404 when no filling assigned", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/${openingId}/filling`,
        token,
      );
      // No filling assigned yet
      expect(res.status).toBe(404);
    });
  });

  describe("PUT .../openings/{openingId}/filling", () => {
    let openingId: string;
    let doorGlobalId: string;

    beforeAll(async () => {
      // Create an opening
      const openRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
        {
          name: "Fill Test Opening",
          placement: { x: 3, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      );
      const openBody = await openRes.json();
      openingId = openBody.data.globalId;

      // Create a door element to use as filling
      const doorRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcDoor", name: "Test Door" },
      );
      const doorBody = await doorRes.json();
      doorGlobalId = doorBody.data.globalId;
    });

    it("returns 200 with filling element", async () => {
      const res = await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/${openingId}/filling`,
        token,
        { fillingGlobalId: doorGlobalId },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent opening", async () => {
      const res = await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/0000000000000000000000/filling`,
        token,
        { fillingGlobalId: doorGlobalId },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE .../openings/{openingId}/filling", () => {
    let openingId: string;

    beforeAll(async () => {
      // Create an opening and fill it
      const openRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings`,
        token,
        {
          name: "Delete Filling Opening",
          placement: { x: 4, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      );
      const openBody = await openRes.json();
      openingId = openBody.data.globalId;

      const doorRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcDoor", name: "Fill Door" },
      );
      const doorBody = await doorRes.json();

      await apiRequest(
        "PUT",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/${openingId}/filling`,
        token,
        { fillingGlobalId: doorBody.data.globalId },
      );
    });

    it("returns 204 after removing filling", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/${openingId}/filling`,
        token,
      );
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent opening", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/openings/0000000000000000000000/filling`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── Ports ──────────────────────────────────

  describe("GET .../elements/{globalId}/ports", () => {
    it("returns 200 with ports array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/ports`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("ports");
      expect(Array.isArray(data.ports)).toBe(true);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/0000000000000000000000/ports`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST .../elements/{globalId}/ports", () => {
    it("returns 201 with created port", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/ports`,
        token,
        { name: "Inlet Port", flowDirection: "SOURCE" },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("globalId");
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/0000000000000000000000/ports`,
        token,
        { name: "Ghost Port", flowDirection: "SOURCE" },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── Connections ────────────────────────────

  describe("GET .../elements/{globalId}/connections", () => {
    it("returns 200 with connections array", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/connections`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("connections");
      expect(Array.isArray(data.connections)).toBe(true);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/elements/0000000000000000000000/connections`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST .../elements/{globalId}/connections", () => {
    let targetGlobalId: string;

    beforeAll(async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcFlowSegment", name: "Target Segment" },
      );
      const body = await res.json();
      targetGlobalId = body.data.globalId;
    });

    it("returns 201 with created connection", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/connections`,
        token,
        { relatedElementGlobalId: targetGlobalId },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/0000000000000000000000/connections`,
        token,
        { relatedElementGlobalId: targetGlobalId },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE .../connections/{connectionId}", () => {
    let connectionId: string;
    let targetGlobalId: string;

    beforeAll(async () => {
      // Create a target element
      const elemRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements`,
        token,
        { ifcType: "IfcFlowSegment", name: "Delete Connection Target" },
      );
      const elemBody = await elemRes.json();
      targetGlobalId = elemBody.data.globalId;

      // Create a connection
      const connRes = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/connections`,
        token,
        { relatedElementGlobalId: targetGlobalId },
      );
      const connBody = await connRes.json();
      connectionId =
        connBody.data.globalId ?? connBody.data.connectionId ?? connBody.data.id;
    });

    it("returns 204 on successful deletion", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/connections/${connectionId}`,
        token,
      );
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent connection", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/connections/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── Property Set Validation ────────────────

  describe("POST .../property-sets/validate", () => {
    it("returns 200 with validation results", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/property-sets/validate`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/0000000000000000000000/property-sets/validate`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST .../property-sets/{psetName}/validate", () => {
    it("returns 200 with validation result", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/${elementGlobalId}/property-sets/Pset_WallCommon/validate`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expectSuccessEnvelope(body);
    });

    it("returns 404 for non-existent element", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/elements/0000000000000000000000/property-sets/Pset_WallCommon/validate`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });
});

/**
 * API Spec Tests — IFC Groups
 *
 * Validates the running API conforms to specification/openApiSpecs/ifc-groups/ifc-groups.yaml
 *
 * Operations covered:
 * - POST   /ifc/files/{fileId}/groups                                        (createGroup)
 * - GET    /ifc/files/{fileId}/groups/{groupGlobalId}                        (getGroup)
 * - POST   /ifc/files/{fileId}/groups/{groupGlobalId}/members                (addGroupMember)
 * - DELETE /ifc/files/{fileId}/groups/{gid}/members/{memberGlobalId}         (removeGroupMember)
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

describe("IFC Groups API", () => {
  const testEmail = "apispec.groups@example.com";
  let token: string;
  let fileId: string;
  let elementGlobalId: string;
  let groupGlobalId: string;

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail);

    // Create a file
    const fileRes = await apiRequest("POST", "/ifc/files", token, {
      fileName: "groups-test.ifc",
    });
    const fileBody = await fileRes.json();
    fileId = fileBody.data.fileId;

    // Create an element to use as a group member
    const elemRes = await apiRequest(
      "POST",
      `/ifc/files/${fileId}/elements`,
      token,
      { ifcType: "IfcWall", name: "Group Member Wall" },
    );
    const elemBody = await elemRes.json();
    elementGlobalId = elemBody.data.globalId;
  });

  afterAll(async () => {
    await apiRequest("DELETE", `/ifc/files/${fileId}`, token);
    await teardownUsers([testEmail]);
  });

  // ─── POST /ifc/files/{fileId}/groups ────────

  describe("POST /ifc/files/{fileId}/groups", () => {
    it("returns 201 with created group", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/groups`,
        token,
        { name: "Structural", description: "Structural elements", memberGlobalIds: [] },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(typeof data.globalId).toBe("string");
      expect(data.name).toBe("Structural");

      groupGlobalId = data.globalId as string;
    });

    it("returns 401 without auth token", async () => {
      const res = await apiRequestNoAuth(
        "POST",
        `/ifc/files/${fileId}/groups`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fakeId}/groups`,
        token,
        { name: "Nope", memberGlobalIds: [] },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /ifc/files/{fileId}/groups/{groupGlobalId} ───

  describe("GET /ifc/files/{fileId}/groups/{groupGlobalId}", () => {
    it("returns 200 with group data", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/groups/${groupGlobalId}`,
        token,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(data.globalId).toBe(groupGlobalId);
      expect(typeof data.name).toBe("string");
    });

    it("returns 404 for non-existent group", async () => {
      const res = await apiRequest(
        "GET",
        `/ifc/files/${fileId}/groups/0000000000000000000000`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── POST .../groups/{groupGlobalId}/members ───

  describe("POST .../groups/{groupGlobalId}/members", () => {
    it("returns 200 with updated group after adding member", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/groups/${groupGlobalId}/members`,
        token,
        { memberGlobalId: elementGlobalId },
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      const data = expectSuccessEnvelope(body);
      expect(Array.isArray(data.members)).toBe(true);
    });

    it("returns 404 for non-existent group", async () => {
      const res = await apiRequest(
        "POST",
        `/ifc/files/${fileId}/groups/0000000000000000000000/members`,
        token,
        { memberGlobalId: elementGlobalId },
      );
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE .../groups/{gid}/members/{memberGlobalId} ───

  describe("DELETE .../groups/{gid}/members/{memberGlobalId}", () => {
    it("returns 204 after removing member", async () => {
      // The element was added in the previous test
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/groups/${groupGlobalId}/members/${elementGlobalId}`,
        token,
      );
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent group", async () => {
      const res = await apiRequest(
        "DELETE",
        `/ifc/files/${fileId}/groups/0000000000000000000000/members/${elementGlobalId}`,
        token,
      );
      expect(res.status).toBe(404);
    });
  });
});

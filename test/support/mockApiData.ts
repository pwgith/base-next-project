import type { AnalysisResult, Room, Wall } from "../../src/types/floorPlan";

// ─── Helpers ───────────────────────────────────────────────

function buildWalls(
  width: number,
  length: number,
  height: number,
): Wall[] {
  return [
    {
      label: "Wall A",
      length: width,
      height,
      area: Math.round(width * height * 100) / 100,
    },
    {
      label: "Wall B",
      length,
      height,
      area: Math.round(length * height * 100) / 100,
    },
    {
      label: "Wall C",
      length: width,
      height,
      area: Math.round(width * height * 100) / 100,
    },
    {
      label: "Wall D",
      length,
      height,
      area: Math.round(length * height * 100) / 100,
    },
  ];
}

export function buildRoom(
  name: string,
  width: number,
  length: number,
  height: number,
): Room {
  const walls = buildWalls(width, length, height);
  const floorArea = Math.round(width * length * 100) / 100;
  return {
    name,
    width,
    length,
    height,
    floorArea,
    ceilingArea: floorArea,
    walls,
    totalWallArea:
      Math.round(walls.reduce((sum, w) => sum + w.area, 0) * 100) / 100,
  };
}

// ─── Mock response builders ─────────────────────────────────

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

export interface MockApiResponse {
  status: number;
  body: { data: AnalysisResult } | { error: { message: string; code: string } };
}

export function mockSuccessResponse(
  rooms: Room[],
  sourceFileName: string,
): MockApiResponse {
  return {
    status: 200,
    body: {
      data: {
        rooms,
        totalFloorArea:
          Math.round(
            rooms.reduce((sum, r) => sum + r.floorArea, 0) * 100,
          ) / 100,
        annotatedImageUrl: TINY_PNG,
        sourceFileName,
      },
    },
  };
}

export function mockErrorResponse(
  message: string,
  code: string,
  status: number = 422,
): MockApiResponse {
  return { status, body: { error: { message, code } } };
}

// ─── Canned responses per test image ────────────────────────

export function threeBedHouseResponse(
  height: number = 2.4,
): MockApiResponse {
  return mockSuccessResponse(
    [
      buildRoom("Living Room", 5.0, 4.0, height),
      buildRoom("Kitchen", 3.5, 3.0, height),
      buildRoom("Bedroom 1", 4.0, 3.5, height),
    ],
    "3bed-house.png",
  );
}

export function unlabelledPlanResponse(
  height: number = 2.4,
): MockApiResponse {
  return mockSuccessResponse(
    [
      buildRoom("Room A", 4.5, 3.5, height),
      buildRoom("Room B", 3.0, 3.0, height),
      buildRoom("Room C", 5.0, 4.0, height),
    ],
    "unlabelled-plan.png",
  );
}

export function warehouseResponse(
  height: number = 3.0,
): MockApiResponse {
  return mockSuccessResponse(
    [
      buildRoom("Bay 1", 10.0, 8.0, height),
      buildRoom("Bay 2", 12.0, 6.0, height),
    ],
    "warehouse.png",
  );
}

export const blurryPhotoResponse: MockApiResponse = mockErrorResponse(
  "Unable to process this floor plan. Please try uploading a clearer image.",
  "ANALYSIS_FAILED",
  422,
);

export const emptyPageResponse: MockApiResponse = mockErrorResponse(
  "No rooms were found in this image. Please upload a different floor plan.",
  "NO_ROOMS_DETECTED",
  422,
);

/** Map a filename to its default mock response. */
export function getMockResponseForFile(
  fileName: string,
  roofHeight: number = 2.4,
): MockApiResponse {
  switch (fileName) {
    case "3bed-house.png":
      return threeBedHouseResponse(roofHeight);
    case "unlabelled-plan.png":
      return unlabelledPlanResponse(roofHeight);
    case "warehouse.png":
      return warehouseResponse(roofHeight);
    case "blurry-photo.jpg":
      return blurryPhotoResponse;
    case "empty-page.png":
      return emptyPageResponse;
    default:
      return threeBedHouseResponse(roofHeight);
  }
}

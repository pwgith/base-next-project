import type { AnalysisResult } from "@/types/floorPlan";

/**
 * Generate a JSON blob of the analysis result structured for future re-import.
 */
export function generateAnalysisJson(result: AnalysisResult): Blob {
  const payload = {
    rooms: result.rooms.map((room) => ({
      name: room.name,
      width: room.width,
      length: room.length,
      height: room.height,
      floorArea: room.floorArea,
      ceilingArea: room.ceilingArea,
      walls: room.walls.map((w) => ({
        label: w.label,
        length: w.length,
        height: w.height,
        area: w.area,
      })),
      totalWallArea: room.totalWallArea,
    })),
    totalFloorArea: result.totalFloorArea,
    sourceFileName: result.sourceFileName,
  };

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

/**
 * Generate a CSV spreadsheet blob of the analysis result.
 * Uses CSV format to avoid the xlsx dependency for v1.
 */
export function generateAnalysisSpreadsheet(result: AnalysisResult): Blob {
  const headers = [
    "Room",
    "Width (m)",
    "Length (m)",
    "Height (m)",
    "Floor Area (m²)",
    "Ceiling Area (m²)",
    "Wall A Area (m²)",
    "Wall B Area (m²)",
    "Wall C Area (m²)",
    "Wall D Area (m²)",
    "Total Wall Area (m²)",
  ];

  const rows = result.rooms.map((room) => [
    room.name,
    room.width,
    room.length,
    room.height,
    room.floorArea,
    room.ceilingArea,
    room.walls[0]?.area ?? "",
    room.walls[1]?.area ?? "",
    room.walls[2]?.area ?? "",
    room.walls[3]?.area ?? "",
    room.totalWallArea,
  ]);

  // Add totals row
  rows.push([
    "TOTAL",
    "",
    "",
    "",
    result.totalFloorArea,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  return new Blob([csv], { type: "text/csv" });
}

/**
 * Trigger a browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

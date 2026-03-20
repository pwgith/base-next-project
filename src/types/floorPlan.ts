/** A single wall of a rectangular room. */
export interface Wall {
  label: string;    // "Wall A", "Wall B", "Wall C", "Wall D"
  length: number;   // metres
  height: number;   // metres
  area: number;     // sq m (length × height)
}

/** A room extracted from the floor plan. */
export interface Room {
  name: string;          // Original label or system-assigned ("Room A", "Room B", …)
  width: number;         // metres
  length: number;        // metres
  height: number;        // metres (from default roof height)
  floorArea: number;     // sq m (width × length)
  ceilingArea: number;   // sq m (equals floorArea)
  walls: Wall[];         // exactly 4 walls for rectangular rooms
  totalWallArea: number; // sq m (sum of all wall areas)
}

/** Complete result of a floor plan analysis. */
export interface AnalysisResult {
  rooms: Room[];
  totalFloorArea: number;       // sq m (sum of all room floor areas)
  annotatedImageUrl: string;    // URL or data URI of the annotated plan image
  sourceFileName: string;       // original uploaded filename
}

/** Shape of the POST /api/analyse request (sent as FormData). */
export interface AnalysisRequest {
  image: File;           // floor plan image file
  roofHeight: number;    // metres, must be > 0
}

/** Raw room data returned by the AI vision API before calculations. */
export interface RawRoom {
  name: string | null;   // null if the AI could not determine a label
  width: number;         // metres
  length: number;        // metres
}

/** Raw response from the AI vision API. */
export interface AiVisionResponse {
  rooms: RawRoom[];
  annotatedImageBase64: string;  // base64-encoded annotated image
}

/** Standardised API error response. */
export interface ApiError {
  error: {
    message: string;
    code?: string;       // "INVALID_FORMAT" | "INVALID_ROOF_HEIGHT" | "ANALYSIS_FAILED" | "NO_ROOMS_DETECTED"
  };
}

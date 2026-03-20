import type { RawRoom, AiVisionResponse, Room, AnalysisResult } from "@/types/floorPlan";
import { assignRoomLabels } from "@/lib/roomLabelling";
import {
  buildRoomWalls,
  calculateFloorArea,
  calculateCeilingArea,
  calculateTotalWallArea,
  calculateTotalFloorArea,
} from "@/lib/areaCalculations";
import { env } from "@/lib/env";

/** Custom error for floor plan analysis failures. */
export class AnalysisError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Call the external AI vision API to extract rooms from a floor plan image.
 */
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

async function callAiVisionApi(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<AiVisionResponse> {
  const apiKey = env.floorPlanAiApiKey;
  const apiUrl = env.floorPlanAiApiUrl;

  const base64Image = imageBuffer.toString("base64");

  const requestBody = JSON.stringify({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyse this floor plan image. Extract each room with its name (if visible on the plan), width in metres, and length in metres. Return a JSON object with this exact schema:
{
  "rooms": [
    { "name": "Room Name or null if not visible", "width": 5.0, "length": 4.0 }
  ]
}
Only return the JSON object, no other text. If a room name is not clearly visible on the floor plan, set name to null.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: requestBody,
    });

    if (response.status === 429) {
      lastError = new AnalysisError(
        "The service is temporarily busy. Please try again in a moment.",
        "RATE_LIMITED",
        503,
      );
      continue; // retry
    }

    if (response.status >= 500) {
      lastError = new AnalysisError(
        "Unable to process this floor plan. Please try uploading a clearer image.",
        "ANALYSIS_FAILED",
        500,
      );
      continue; // retry
    }

    if (!response.ok) {
      throw new AnalysisError(
        "Unable to process this floor plan. Please try uploading a clearer image.",
        "ANALYSIS_FAILED",
        500,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new AnalysisError(
        "Unable to process this floor plan. Please try uploading a clearer image.",
        "ANALYSIS_FAILED",
        500,
      );
    }

    // Parse the JSON response from the AI
    let parsed: { rooms: RawRoom[] };
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AnalysisError(
        "Unable to process this floor plan. Please try uploading a clearer image.",
        "ANALYSIS_FAILED",
        500,
      );
    }

    return {
      rooms: parsed.rooms,
      annotatedImageBase64: base64Image, // Use original image as base for annotation
    };
  }

  // All retries exhausted
  throw lastError ?? new AnalysisError(
    "The service is temporarily busy. Please try again in a moment.",
    "RATE_LIMITED",
    503,
  );
}

/**
 * Analyse a floor plan image: extract rooms, assign labels, calculate all areas.
 */
export async function analyseFloorPlan(
  imageBuffer: Buffer,
  mimeType: string,
  roofHeight: number,
  sourceFileName: string,
): Promise<AnalysisResult> {
  const aiResponse = await callAiVisionApi(imageBuffer, mimeType);

  if (aiResponse.rooms.length === 0) {
    throw new AnalysisError(
      "No rooms were found in this image. Please upload a different floor plan.",
      "NO_ROOMS_DETECTED",
      422,
    );
  }

  // Assign labels to rooms
  const labelledRooms = assignRoomLabels(aiResponse.rooms);

  // Calculate areas for each room
  const rooms: Room[] = labelledRooms.map((room) => {
    const walls = buildRoomWalls(room.width, room.length, roofHeight);
    const floorArea = calculateFloorArea(room.width, room.length);
    const ceilingArea = calculateCeilingArea(room.width, room.length);
    const totalWallArea = calculateTotalWallArea(walls);

    return {
      name: room.name,
      width: room.width,
      length: room.length,
      height: roofHeight,
      floorArea,
      ceilingArea,
      walls,
      totalWallArea,
    };
  });

  const totalFloorArea = calculateTotalFloorArea(rooms);

  return {
    rooms,
    totalFloorArea,
    annotatedImageUrl: `data:${mimeType};base64,${aiResponse.annotatedImageBase64}`,
    sourceFileName,
  };
}

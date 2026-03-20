import { NextRequest, NextResponse } from "next/server";

import { analyseFloorPlan, AnalysisError } from "@/services/floorPlanService";
import { validateRoofHeight } from "@/lib/validation";
import { SUPPORTED_FILE_EXTENSIONS } from "@/constants/floorPlan";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const roofHeightStr = formData.get("roofHeight") as string | null;

    // Validate image presence
    if (!imageFile) {
      return NextResponse.json(
        { error: { message: "No image file provided.", code: "INVALID_FORMAT" } },
        { status: 400 },
      );
    }

    // Validate file format
    const ext = "." + imageFile.name.split(".").pop()?.toLowerCase();
    if (
      !SUPPORTED_FILE_EXTENSIONS.includes(
        ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: {
            message:
              "Unsupported file format. Please upload a PNG, JPG, or PDF file.",
            code: "INVALID_FORMAT",
          },
        },
        { status: 400 },
      );
    }

    // Validate roof height
    const roofHeightValidation = validateRoofHeight(roofHeightStr ?? "");
    if (!roofHeightValidation.valid) {
      return NextResponse.json(
        {
          error: {
            message:
              roofHeightValidation.message ??
              "Please enter a valid roof height greater than zero.",
            code: "INVALID_ROOF_HEIGHT",
          },
        },
        { status: 400 },
      );
    }

    const roofHeight = parseFloat(roofHeightStr as string);

    // Convert file to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analyse the floor plan
    const result = await analyseFloorPlan(
      buffer,
      imageFile.type || "image/png",
      roofHeight,
      imageFile.name,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AnalysisError) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code } },
        { status: error.statusCode },
      );
    }

    console.error("Unexpected error in /api/analyse:", error);
    return NextResponse.json(
      {
        error: {
          message:
            "Unable to process this floor plan. Please try uploading a clearer image.",
          code: "ANALYSIS_FAILED",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Test-only endpoint for seeding IFC model data into a project.
 * Used by Cucumber scenarios that require pre-existing IFC elements, storeys, etc.
 *
 * POST /api/test/ifc-model-data
 * Body: { projectId: string, data: Partial<IfcModelEntities> }
 *
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { seedModelData } from "@/modules/ifc/ifcModelService";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json();
  const { projectId, data, replace } = body;

  if (!projectId || !data) {
    return NextResponse.json(
      { error: "Provide projectId and data." },
      { status: 400 },
    );
  }

  const newVersion = await seedModelData(projectId, data, replace === true);
  return NextResponse.json({ currentVersion: newVersion });
}

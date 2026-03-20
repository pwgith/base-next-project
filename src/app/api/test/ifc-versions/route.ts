/**
 * Test-only endpoint for creating additional IFC version records.
 * Used by Cucumber scenarios that require projects at specific version numbers.
 *
 * POST /api/test/ifc-versions
 * Body: { projectId: string, targetVersion: number }
 *
 * Creates ifc_version rows from (current max + 1) up to targetVersion.
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SetIfcVersionRequest {
  projectId: string;
  targetVersion: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json()) as SetIfcVersionRequest;
  const { projectId, targetVersion } = body;

  if (!projectId || !targetVersion || targetVersion < 1) {
    return NextResponse.json(
      { error: "Provide projectId and targetVersion (>= 1)." },
      { status: 400 },
    );
  }

  // Find current max version.
  const result = await prisma.ifcVersion.aggregate({
    where: { projectId },
    _max: { versionNumber: true },
  });
  const currentMax = result._max.versionNumber ?? 0;

  if (targetVersion <= currentMax) {
    // Truncate: delete versions above the target so we can "reset" the version.
    await prisma.ifcVersion.deleteMany({
      where: { projectId, versionNumber: { gt: targetVersion } },
    });
    return NextResponse.json({ currentVersion: targetVersion });
  }

  // Read the latest version's data so new versions inherit the model state.
  const latest = await prisma.ifcVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  const latestData = (latest?.data as Record<string, unknown>) ?? {
    type: "ifcJSON",
    version: "0.0.1",
    data: [],
  };

  // Create version records from (currentMax + 1) up to targetVersion,
  // copying model data from the latest version and adding metadata.
  for (let v = currentMax + 1; v <= targetVersion; v++) {
    await prisma.ifcVersion.create({
      data: {
        projectId,
        versionNumber: v,
        data: {
          ...latestData,
          changeDescription: `Test version ${v}`,
          createdBy: "test-system",
        } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ currentVersion: targetVersion });
}

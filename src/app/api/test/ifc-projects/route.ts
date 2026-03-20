/**
 * Test-only endpoint for creating IFC projects bypassing OAuth scope checks.
 * Used by Cucumber scenarios where users have restricted scopes but need a
 * pre-existing IFC file/project for the scenario to work.
 *
 * POST /api/test/ifc-projects
 * Body: { email: string, name: string }
 * Returns: { projectId: string }
 *
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ifcVersionRepository } from "@/modules/ifc/ifcVersionRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json();
  const { email, name } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "Provide email and name." },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) {
    return NextResponse.json(
      { error: `No profile found for ${email}.` },
      { status: 404 },
    );
  }

  const project = await prisma.ifcProject.create({
    data: {
      profileId: profile.id,
      name,
    },
  });

  await ifcVersionRepository.createInitialVersion(project.id);

  return NextResponse.json({ projectId: project.id });
}

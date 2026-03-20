/**
 * Project repository.
 * Owns all read/write access to the `ifc_project` table.
 * Maps between Prisma types and domain types.
 */

import type { IfcProject as PrismaIfcProject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConcurrencyError } from "@/lib/errors";
import type { IfcProject } from "./ifcTypes";

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapToDomain(record: PrismaIfcProject): IfcProject {
  return {
    id: record.id,
    profileId: record.profileId,
    name: record.name,
    description: record.description,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

interface CreateProjectData {
  profileId: string;
  name: string;
  description: string | null;
}

interface UpdateProjectData {
  name?: string;
  description?: string | null;
}

export const projectRepository = {
  async findById(id: string): Promise<IfcProject | null> {
    const record = await prisma.ifcProject.findUnique({ where: { id } });
    return record ? mapToDomain(record) : null;
  },

  async findAllByProfileId(profileId: string): Promise<IfcProject[]> {
    const records = await prisma.ifcProject.findMany({
      where: { profileId },
      orderBy: { updatedAt: "desc" },
    });
    return records.map(mapToDomain);
  },

  async findByProfileIdAndName(
    profileId: string,
    name: string,
  ): Promise<IfcProject | null> {
    const record = await prisma.ifcProject.findUnique({
      where: { profileId_name: { profileId, name } },
    });
    return record ? mapToDomain(record) : null;
  },

  async create(data: CreateProjectData): Promise<IfcProject> {
    const record = await prisma.ifcProject.create({
      data: {
        profileId: data.profileId,
        name: data.name,
        description: data.description,
      },
    });
    return mapToDomain(record);
  },

  async update(
    id: string,
    data: UpdateProjectData,
    expectedVersion: number,
  ): Promise<IfcProject> {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ifcProject.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          version: expectedVersion + 1,
        },
      });

      if (updated.count === 0) {
        throw new ConcurrencyError(
          `Project ${id} has been modified by another process. Please retry.`,
        );
      }

      return tx.ifcProject.findUniqueOrThrow({ where: { id } });
    });

    return mapToDomain(result);
  },

  async delete(id: string, expectedVersion: number): Promise<void> {
    const result = await prisma.ifcProject.deleteMany({
      where: { id, version: expectedVersion },
    });

    if (result.count === 0) {
      throw new ConcurrencyError(
        `Project ${id} could not be deleted — version mismatch or record not found.`,
      );
    }
  },
};

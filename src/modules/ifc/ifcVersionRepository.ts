/**
 * IFC version repository.
 * Owns all read/write access to the `ifc_version` table.
 * Maps between Prisma types and domain types.
 */

import type { IfcVersion as PrismaIfcVersion, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { IfcVersion, IfcModelData } from "./ifcTypes";

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapToDomain(record: PrismaIfcVersion): IfcVersion {
  return {
    id: record.id,
    projectId: record.projectId,
    versionNumber: record.versionNumber,
    data: record.data as unknown as IfcModelData,
    createdAt: record.createdAt,
  };
}

// ─── Empty IFC-JSON document ─────────────────────────────────────────────────

const EMPTY_IFC_MODEL: IfcModelData = {
  type: "ifcJSON",
  version: "0.0.1",
  data: [],
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const ifcVersionRepository = {
  async createInitialVersion(projectId: string): Promise<IfcVersion> {
    const record = await prisma.ifcVersion.create({
      data: {
        projectId,
        versionNumber: 1,
        data: EMPTY_IFC_MODEL as unknown as Prisma.InputJsonValue,
      },
    });
    return mapToDomain(record);
  },

  async getMaxVersionNumber(projectId: string): Promise<number> {
    const result = await prisma.ifcVersion.aggregate({
      where: { projectId },
      _max: { versionNumber: true },
    });
    return result._max.versionNumber ?? 0;
  },

  async getCurrentVersionNumbers(
    projectIds: string[],
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map();

    const results = await prisma.ifcVersion.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds } },
      _max: { versionNumber: true },
    });

    const map = new Map<string, number>();
    for (const row of results) {
      map.set(row.projectId, row._max.versionNumber ?? 0);
    }
    return map;
  },
};

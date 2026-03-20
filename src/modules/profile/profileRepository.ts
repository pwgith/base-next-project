/**
 * Profile repository.
 * Owns all read/write access to the `profile` table.
 * Maps between Prisma types and domain types.
 */

import type { Profile as PrismaProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConcurrencyError, NotFoundError } from "@/lib/errors";
import type {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
} from "./profileTypes";

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapToDomain(record: PrismaProfile): Profile {
  return {
    id: record.id,
    supabaseUserId: record.supabaseUserId,
    displayName: record.displayName,
    email: record.email,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const profileRepository = {
  async findById(id: string): Promise<Profile | null> {
    const record = await prisma.profile.findUnique({ where: { id } });
    return record ? mapToDomain(record) : null;
  },

  async findBySupabaseUserId(supabaseUserId: string): Promise<Profile | null> {
    const record = await prisma.profile.findUnique({
      where: { supabaseUserId },
    });
    return record ? mapToDomain(record) : null;
  },

  async findByEmail(email: string): Promise<Profile | null> {
    const record = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });
    return record ? mapToDomain(record) : null;
  },

  async create(data: CreateProfileInput): Promise<Profile> {
    const record = await prisma.profile.create({
      data: {
        supabaseUserId: data.supabaseUserId,
        displayName: data.displayName.trim(),
        email: data.email.trim().toLowerCase(),
      },
    });
    return mapToDomain(record);
  },

  async update(
    id: string,
    data: UpdateProfileInput,
    expectedVersion: number,
  ): Promise<Profile> {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.profile.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...(data.displayName !== undefined
            ? { displayName: data.displayName.trim() }
            : {}),
          ...(data.email !== undefined
            ? { email: data.email.trim().toLowerCase() }
            : {}),
          version: expectedVersion + 1,
        },
      });

      if (updated.count === 0) {
        throw new ConcurrencyError(
          `Profile ${id} has been modified by another process. Please retry.`,
        );
      }

      return tx.profile.findUniqueOrThrow({ where: { id } });
    });

    return mapToDomain(result);
  },

  async delete(id: string, expectedVersion: number): Promise<void> {
    const result = await prisma.profile.deleteMany({
      where: { id, version: expectedVersion },
    });

    if (result.count === 0) {
      throw new ConcurrencyError(
        `Profile ${id} could not be deleted — version mismatch or record not found.`,
      );
    }
  },
};

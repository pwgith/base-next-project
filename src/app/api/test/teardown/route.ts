/**
 * Test-only teardown endpoint.
 * Deletes Supabase Auth users AND their Prisma profile rows by email, so
 * Cucumber scenarios always start with a clean slate.
 *
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/serverClient";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { emails } = (await request.json()) as { emails?: string[] };

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty 'emails' array." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const results: { email: string; deleted: boolean; error?: string }[] = [];

  for (const email of emails) {
    try {
      // 1. Delete subscription (cascade removes scheduled_change) then the profile.
      const profileToDelete = await prisma.profile.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (profileToDelete) {
        await prisma.subscription.deleteMany({ where: { profileId: profileToDelete.id } });
      }

      // 2. Delete the Prisma profile row (and capture supabaseUserId before deletion).
      const supabaseUserId = profileToDelete?.supabaseUserId ?? null;
      await prisma.profile.deleteMany({ where: { email: email.toLowerCase() } });

      // 3. Delete the Supabase Auth user.
      //    - Primary path: use supabaseUserId from the profile (avoids listUsers).
      //    - Fallback: if no Prisma profile exists (e.g. user created via direct
      //      signUp() in S-024, which bypasses the setup API), use listUsers to find
      //      and delete the Supabase user so it doesn't persist across test runs.
      let authUserIdToDelete = supabaseUserId;
      if (!authUserIdToDelete) {
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const found = listData?.users.find((u) => u.email === email.toLowerCase());
        authUserIdToDelete = found?.id ?? null;
      }

      if (!authUserIdToDelete) {
        // Auth user doesn't exist — nothing to delete.
        results.push({ email, deleted: true });
        continue;
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserIdToDelete);

      if (deleteError) {
        results.push({ email, deleted: false, error: deleteError.message });
      } else {
        results.push({ email, deleted: true });
      }
    } catch (err) {
      results.push({
        email,
        deleted: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}

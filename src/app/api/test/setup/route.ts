/**
 * Test-only user-setup endpoint.
 * Creates Supabase Auth users and application profiles in specific states so
 * Cucumber scenarios can rely on known fixture data.
 *
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/serverClient";
import { prisma } from "@/lib/prisma";
import { normalizePlan } from "@/modules/subscription/subscriptionTypes";

interface SetupSubscription {
  plan: string; // 'free' | 'light' | 'full'
  status?: string; // 'active' | 'inactive' | 'past_due' | 'canceled'
  currentPeriodStart?: string; // ISO date string
  currentPeriodEnd?: string; // ISO date string
  stripeCustomerId?: string; // Fake Stripe customer ID for webhook testing
  stripeSubscriptionId?: string; // Fake Stripe subscription ID for webhook testing
  scheduledChange?: {
    changeType: string; // 'downgrade' | 'cancel'
    targetPlan: string;
    effectiveAt: string; // ISO date string
  };
}

interface SetupUser {
  email: string;
  password: string;
  displayName?: string;
  /** If true, the user's email is marked as confirmed (verified). */
  verified?: boolean;
  /** If true, the user is banned (simulates a locked account). */
  banned?: boolean;
  /** Optional subscription state to set for this user. */
  subscription?: SetupSubscription;
  /** OAuth scopes to set in app_metadata (for public REST API testing). */
  scopes?: string[];
}

async function applySubscriptionSetup(
  profileId: string,
  sub: SetupSubscription,
): Promise<void> {
  const normalizedPlan = normalizePlan(sub.plan ?? 'free');
  const normalizedTargetPlan = sub.scheduledChange
    ? normalizePlan(sub.scheduledChange.targetPlan)
    : undefined;

  const subRecord = await prisma.subscription.upsert({
    where: { profileId },
    create: {
      profileId,
      plan: normalizedPlan,
      status: sub.status ?? (normalizedPlan !== 'free' && sub.currentPeriodEnd ? 'active' : 'inactive'),
      stripeCustomerId: sub.stripeCustomerId ?? null,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
      currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null,
      currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
    },
    update: {
      // Only update plan-related fields when a plan is explicitly provided.
      // Calls that only set scheduledChange (or stripeIds) should leave these intact.
      ...(sub.plan !== undefined && {
        plan: normalizedPlan,
        status: sub.status ?? (normalizedPlan !== 'free' && sub.currentPeriodEnd ? 'active' : 'inactive'),
        currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null,
        currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
      }),
      ...(sub.stripeCustomerId !== undefined && { stripeCustomerId: sub.stripeCustomerId }),
      ...(sub.stripeSubscriptionId !== undefined && { stripeSubscriptionId: sub.stripeSubscriptionId }),
      version: { increment: 1 },
    },
  });

  if (sub.scheduledChange) {
    await prisma.subscriptionScheduledChange.upsert({
      where: { subscriptionId: subRecord.id },
      create: {
        subscriptionId: subRecord.id,
        changeType: sub.scheduledChange.changeType,
          targetPlan: normalizedTargetPlan!,
        effectiveAt: new Date(sub.scheduledChange.effectiveAt),
      },
      update: {
        changeType: sub.scheduledChange.changeType,
          targetPlan: normalizedTargetPlan!,
        effectiveAt: new Date(sub.scheduledChange.effectiveAt),
        version: { increment: 1 },
      },
    });
  } else {
    // Clear any existing scheduled change.
    await prisma.subscriptionScheduledChange.deleteMany({
      where: { subscriptionId: subRecord.id },
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json()) as { users?: SetupUser[] };
  const users = body.users ?? [];

  if (users.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty 'users' array." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const results: { email: string; created: boolean; error?: string }[] = [];

  for (const user of users) {
    const email = user.email.toLowerCase().trim();
    const displayName = user.displayName ?? "Test User";

    try {
      // Check whether this user's profile already exists in Prisma.
      // This avoids relying on Supabase createUser error codes (which vary across
      // versions and SDK releases) to detect "already exists" cases.
      const existingProfile = await prisma.profile.findUnique({ where: { email } });

      if (existingProfile) {
        // User already exists — update verified/banned state and subscription.
        await supabase.auth.admin.updateUserById(existingProfile.supabaseUserId, {
          email_confirm: user.verified ?? false,
          ...(user.banned !== undefined && { ban_duration: user.banned ? "87600h" : "none" }),
          ...(user.scopes !== undefined && { app_metadata: { scopes: user.scopes } }),
        });
        if (user.subscription) {
          await applySubscriptionSetup(existingProfile.id, user.subscription);
        }
        results.push({ email, created: true });
        continue;
      }

      // Create the Supabase auth user.
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: user.password,
        email_confirm: user.verified ?? false,
      });

      if (createError) {
        results.push({ email, created: false, error: createError.message });
        continue;
      }

      const supabaseUserId = data.user.id;

      // Apply banned state if requested.
      if (user.banned) {
        await supabase.auth.admin.updateUserById(supabaseUserId, {
          ban_duration: "87600h", // 10 years ≈ effectively permanent for tests
        });
      }

      // Apply OAuth scopes if requested.
      if (user.scopes) {
        await supabase.auth.admin.updateUserById(supabaseUserId, {
          app_metadata: { scopes: user.scopes },
        });
      }

      // Create the matching application profile (idempotent — skip if exists).
      const profile = await prisma.profile.upsert({
        where: { email },
        update: {},
        create: {
          supabaseUserId,
          displayName,
          email,
        },
      });

      // Set up subscription if specified, otherwise ensure a default Free one exists.
      if (user.subscription) {
        await applySubscriptionSetup(profile.id, user.subscription);
      } else {
        // Ensure every user has at least a Free subscription.
        await prisma.subscription.upsert({
          where: { profileId: profile.id },
          update: {},
          create: { profileId: profile.id, plan: 'free' },
        });
      }

      results.push({ email, created: true });
    } catch (err) {
      results.push({
        email,
        created: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const allOk = results.every((r) => r.created);
  return NextResponse.json({ results }, { status: allOk ? 200 : 207 });
}

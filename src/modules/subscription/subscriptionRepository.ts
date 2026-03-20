/**
 * Subscription repository.
 * Owns all read/write access to the `subscription` and
 * `subscription_scheduled_change` tables.
 */

import type {
  Subscription as PrismaSubscription,
  SubscriptionScheduledChange as PrismaScheduledChange,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ConcurrencyError } from '@/lib/errors';
import type {
  Subscription,
  SubscriptionScheduledChange,
  SubscriptionStatus,
  ChangeType,
  CreateSubscriptionInput,
  Plan,
} from './subscriptionTypes';

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapScheduledChange(
  record: PrismaScheduledChange,
): SubscriptionScheduledChange {
  return {
    id: record.id,
    subscriptionId: record.subscriptionId,
    changeType: record.changeType as ChangeType,
    targetPlan: record.targetPlan as Plan,
    effectiveAt: record.effectiveAt,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapToDomain(
  record: PrismaSubscription & {
    scheduledChange: PrismaScheduledChange | null;
  },
): Subscription {
  return {
    id: record.id,
    profileId: record.profileId,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    plan: record.plan as Plan,
    status: record.status as SubscriptionStatus,
    currentPeriodStart: record.currentPeriodStart,
    currentPeriodEnd: record.currentPeriodEnd,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scheduledChange: record.scheduledChange
      ? mapScheduledChange(record.scheduledChange)
      : null,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const subscriptionRepository = {
  async findByProfileId(profileId: string): Promise<Subscription | null> {
    const record = await prisma.subscription.findUnique({
      where: { profileId },
      include: { scheduledChange: true },
    });
    return record ? mapToDomain(record) : null;
  },

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    const record = await prisma.subscription.findUnique({
      where: { stripeCustomerId },
      include: { scheduledChange: true },
    });
    return record ? mapToDomain(record) : null;
  },

  async create(data: CreateSubscriptionInput): Promise<Subscription> {
    const record = await prisma.subscription.create({
      data: {
        profileId: data.profileId,
        plan: data.plan ?? 'free',
        status: 'inactive',
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
      },
      include: { scheduledChange: true },
    });
    return mapToDomain(record);
  },

  /**
   * Apply a webhook-sourced update to the subscription.
   * Used by the webhook processor to sync plan, status, billing dates, and Stripe IDs.
   * Includes optimistic locking.
   */
  async applyWebhookUpdate(
    id: string,
    data: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string | null;
      plan: Plan;
      status: SubscriptionStatus;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
    },
    expectedVersion: number,
  ): Promise<Subscription> {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...(data.stripeCustomerId !== undefined && {
            stripeCustomerId: data.stripeCustomerId,
          }),
          ...(data.stripeSubscriptionId !== undefined && {
            stripeSubscriptionId: data.stripeSubscriptionId,
          }),
          plan: data.plan,
          status: data.status,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          version: expectedVersion + 1,
        },
      });

      if (updated.count === 0) {
        throw new ConcurrencyError(
          `Subscription ${id} has been modified by another process. Please retry.`,
        );
      }

      return tx.subscription.findUniqueOrThrow({
        where: { id },
        include: { scheduledChange: true },
      });
    });

    return mapToDomain(result);
  },

  /**
   * Upsert the scheduled change for a downgrade or cancellation.
   * Only one scheduled change may exist per subscription at a time;
   * a new request replaces the existing one.
   */
  async setScheduledChange(
    subscriptionId: string,
    changeType: ChangeType,
    targetPlan: Plan,
    effectiveAt: Date,
  ): Promise<Subscription> {
    const result = await prisma.$transaction(async (tx) => {
      await tx.subscriptionScheduledChange.upsert({
        where: { subscriptionId },
        create: { subscriptionId, changeType, targetPlan, effectiveAt },
        update: { changeType, targetPlan, effectiveAt, version: { increment: 1 } },
      });

      return tx.subscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        include: { scheduledChange: true },
      });
    });

    return mapToDomain(result);
  },

  /**
   * Delete any pending scheduled change for the given subscription
   * (e.g. when an upgrade supersedes a pending downgrade/cancel).
   */
  async clearScheduledChange(subscriptionId: string): Promise<void> {
    await prisma.subscriptionScheduledChange.deleteMany({
      where: { subscriptionId },
    });
  },

  /** Upsert a subscription — used by the test setup endpoint. */
  async upsert(data: {
    profileId: string;
    plan: Plan;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status?: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  }): Promise<Subscription> {
    const record = await prisma.subscription.upsert({
      where: { profileId: data.profileId },
      create: {
        profileId: data.profileId,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        plan: data.plan,
        status: data.status ?? 'inactive',
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
      },
      update: {
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        plan: data.plan,
        status: data.status ?? 'inactive',
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        version: { increment: 1 },
      },
      include: { scheduledChange: true },
    });
    return mapToDomain(record);
  },
};

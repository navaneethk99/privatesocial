import { and, eq, lte } from "drizzle-orm";

import * as schema from "@/lib/auth-schema";
import { getCashfreeOrder } from "@/lib/cashfree";
import { db } from "@/lib/db";
import { type BillingPeriod, getPlan, type PlanId } from "@/lib/plans";

type SubscriptionStatus = "active" | "expired" | "inactive";

type PaymentSyncResult = {
  message: string;
  ok: boolean;
};

type MessageQuotaState = {
  dailyMessageLimit: number;
  messagesRemaining: number;
  messagesResetAt: Date | null;
  messagesUsedToday: number;
  planId: PlanId;
  planName: string;
};

function isMissingSubscriptionTableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('relation "user_subscription" does not exist')
  );
}

function isBillingPeriod(value: string | undefined): value is BillingPeriod {
  return value === "monthly" || value === "annually";
}

function isPlanId(value: string | undefined): value is PlanId {
  return value === "classic" || value === "plus" || value === "pro";
}

function addBillingPeriod(date: Date, billingPeriod: BillingPeriod) {
  const nextDate = new Date(date);

  if (billingPeriod === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  nextDate.setFullYear(nextDate.getFullYear() + 1);
  return nextDate;
}

function add24Hours(date: Date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

export async function resetDueMessageQuotas() {
  const now = new Date();
  const nextResetAt = add24Hours(now);

  try {
    const resetRows = await db
      .update(schema.userSubscription)
      .set({
        messagesResetAt: nextResetAt,
        messagesUsedToday: 0,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.userSubscription.status, "active"),
          lte(schema.userSubscription.messagesResetAt, now),
        ),
      )
      .returning({ userId: schema.userSubscription.userId });

    return resetRows.length;
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return 0;
    }

    throw error;
  }
}

export async function expireDueSubscriptions() {
  const now = new Date();

  try {
    const expiredRows = await db
      .update(schema.userSubscription)
      .set({
        status: "expired",
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.userSubscription.status, "active"),
          lte(schema.userSubscription.nextPaymentDate, now),
        ),
      )
      .returning({ userId: schema.userSubscription.userId });

    return expiredRows.length;
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return 0;
    }

    throw error;
  }
}

async function expireSubscriptionIfPastDue(userId: string) {
  const now = new Date();

  try {
    const expiredRows = await db
      .update(schema.userSubscription)
      .set({
        status: "expired",
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.userSubscription.userId, userId),
          eq(schema.userSubscription.status, "active"),
          lte(schema.userSubscription.nextPaymentDate, now),
        ),
      )
      .returning({ userId: schema.userSubscription.userId });

    return expiredRows.length > 0;
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return false;
    }

    throw error;
  }
}

async function resetMessageQuotaIfDue(userId: string) {
  const now = new Date();
  const nextResetAt = add24Hours(now);

  try {
    const resetRows = await db
      .update(schema.userSubscription)
      .set({
        messagesResetAt: nextResetAt,
        messagesUsedToday: 0,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.userSubscription.userId, userId),
          eq(schema.userSubscription.status, "active"),
          lte(schema.userSubscription.messagesResetAt, now),
        ),
      )
      .returning({ userId: schema.userSubscription.userId });

    return resetRows.length > 0;
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return false;
    }

    throw error;
  }
}

export async function getActivePaidSubscription(userId: string) {
  await expireSubscriptionIfPastDue(userId);
  await resetMessageQuotaIfDue(userId);

  let subscription;

  try {
    subscription = await db.query.userSubscription.findFirst({
      where: eq(schema.userSubscription.userId, userId),
    });
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return null;
    }

    throw error;
  }

  if (!subscription) {
    return null;
  }

  if (
    subscription.status !== "active" ||
    !subscription.planId ||
    subscription.planId === "classic" ||
    !subscription.nextPaymentDate
  ) {
    return null;
  }

  return subscription;
}

export async function getUserMessageQuota(userId: string): Promise<MessageQuotaState> {
  const activeSubscription = await getActivePaidSubscription(userId);

  if (!activeSubscription || !activeSubscription.planId) {
    const fallbackPlan = getPlan("monthly", "classic");

    return {
      dailyMessageLimit: fallbackPlan?.dailyMessageLimit ?? 10,
      messagesRemaining: fallbackPlan?.dailyMessageLimit ?? 10,
      messagesResetAt: null,
      messagesUsedToday: 0,
      planId: "classic",
      planName: fallbackPlan?.name ?? "PrivateSocial Classic",
    };
  }

  const activePlan = getPlan(
    activeSubscription.billingPeriod as BillingPeriod,
    activeSubscription.planId as PlanId,
  );
  const dailyMessageLimit =
    activeSubscription.dailyMessageLimit ??
    activePlan?.dailyMessageLimit ??
    0;
  const messagesUsedToday = activeSubscription.messagesUsedToday ?? 0;

  return {
    dailyMessageLimit,
    messagesRemaining: Math.max(dailyMessageLimit - messagesUsedToday, 0),
    messagesResetAt: activeSubscription.messagesResetAt ?? null,
    messagesUsedToday,
    planId: activeSubscription.planId as PlanId,
    planName: activePlan?.name ?? activeSubscription.planId,
  };
}

export async function incrementMessagesUsed(userId: string, count = 1) {
  const activeSubscription = await getActivePaidSubscription(userId);

  if (!activeSubscription || !activeSubscription.dailyMessageLimit) {
    return {
      allowed: true,
      dailyMessageLimit: getPlan("monthly", "classic")?.dailyMessageLimit ?? 10,
      messagesRemaining: getPlan("monthly", "classic")?.dailyMessageLimit ?? 10,
      messagesUsedToday: 0,
      tracked: false,
    };
  }

  const currentUsed = activeSubscription.messagesUsedToday ?? 0;
  const nextUsed = currentUsed + count;
  const dailyMessageLimit = activeSubscription.dailyMessageLimit;

  if (nextUsed > dailyMessageLimit) {
    return {
      allowed: false,
      dailyMessageLimit,
      messagesRemaining: Math.max(dailyMessageLimit - currentUsed, 0),
      messagesUsedToday: currentUsed,
      tracked: true,
    };
  }

  const now = new Date();

  await db
    .update(schema.userSubscription)
    .set({
      messagesUsedToday: nextUsed,
      updatedAt: now,
    })
    .where(eq(schema.userSubscription.userId, userId));

  return {
    allowed: true,
    dailyMessageLimit,
    messagesRemaining: Math.max(dailyMessageLimit - nextUsed, 0),
    messagesUsedToday: nextUsed,
    tracked: true,
  };
}

export async function syncSubscriptionFromCashfreeOrder(
  orderId: string,
  userId: string,
): Promise<PaymentSyncResult> {
  let existingSubscription;

  try {
    existingSubscription = await db.query.userSubscription.findFirst({
      where: eq(schema.userSubscription.userId, userId),
    });
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return {
        ok: false,
        message:
          "Subscription storage is not initialized yet. Apply the latest database migration first.",
      };
    }

    throw error;
  }

  if (existingSubscription?.cashfreeOrderId === orderId) {
    return {
      ok: existingSubscription.status === "active",
      message:
        existingSubscription.status === "active" &&
        existingSubscription.nextPaymentDate
          ? `Payment already recorded. Plan is active until ${existingSubscription.nextPaymentDate.toLocaleDateString(
              "en-IN",
            )}.`
          : "This payment was already recorded for your account.",
    };
  }

  const order = await getCashfreeOrder(orderId);

  if (order.customer_details?.customer_id !== userId) {
    return {
      ok: false,
      message: "This payment does not belong to the current account.",
    };
  }

  if (order.order_status !== "PAID") {
    return {
      ok: false,
      message: "Payment has not been completed yet.",
    };
  }

  const billingPeriod = order.order_tags?.billingPeriod;
  const planId = order.order_tags?.planId;

  if (!isBillingPeriod(billingPeriod) || !isPlanId(planId)) {
    return {
      ok: false,
      message: "Cashfree order metadata is incomplete.",
    };
  }

  const plan = getPlan(billingPeriod, planId);

  if (!plan || plan.amount <= 0) {
    return {
      ok: false,
      message: "Cashfree order references an invalid paid plan.",
    };
  }

  const paidAt = new Date();
  const messagesResetAt = add24Hours(paidAt);
  const nextPaymentDate = addBillingPeriod(paidAt, billingPeriod);

  try {
    await db
      .insert(schema.userSubscription)
      .values({
        userId,
        amount: plan.amount,
        billingPeriod,
        cashfreeOrderId: order.order_id,
        cashfreeOrderStatus: order.order_status,
        currentPeriodStart: paidAt,
        dailyMessageLimit: plan.dailyMessageLimit,
        lastPaymentAt: paidAt,
        messagesResetAt,
        messagesUsedToday: 0,
        nextPaymentDate,
        planId,
        status: "active",
      })
      .onConflictDoUpdate({
        target: schema.userSubscription.userId,
        set: {
          amount: plan.amount,
          billingPeriod,
          cashfreeOrderId: order.order_id,
          cashfreeOrderStatus: order.order_status,
          currentPeriodStart: paidAt,
          dailyMessageLimit: plan.dailyMessageLimit,
          lastPaymentAt: paidAt,
          messagesResetAt,
          messagesUsedToday: 0,
          nextPaymentDate,
          planId,
          status: "active" satisfies SubscriptionStatus,
          updatedAt: paidAt,
        },
      });
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      return {
        ok: false,
        message:
          "Subscription storage is not initialized yet. Apply the latest database migration first.",
      };
    }

    throw error;
  }

  return {
    ok: true,
    message: `${plan.name} is active until ${nextPaymentDate.toLocaleDateString(
      "en-IN",
    )}.`,
  };
}

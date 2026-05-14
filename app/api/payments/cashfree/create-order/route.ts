import { randomUUID } from "crypto";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { createCashfreeOrder } from "@/lib/cashfree";
import { type BillingPeriod, getPlan, type PlanId } from "@/lib/plans";

type CreateOrderBody = {
  billingPeriod?: BillingPeriod;
  planId?: PlanId;
};

function createOrderId(planId: PlanId, billingPeriod: BillingPeriod) {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  return `ps_${planId}_${billingPeriod}_${suffix}`;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CreateOrderBody;
  const billingPeriod = body.billingPeriod;
  const planId = body.planId;

  if (!billingPeriod || !planId) {
    return Response.json(
      { message: "Plan selection is required." },
      { status: 400 },
    );
  }

  const plan = getPlan(billingPeriod, planId);

  if (!plan) {
    return Response.json({ message: "Invalid plan." }, { status: 400 });
  }

  if (plan.amount <= 0) {
    return Response.json(
      { message: "The selected plan does not require payment." },
      { status: 400 },
    );
  }

  const baseUrl = process.env.BETTER_AUTH_URL;

  if (!baseUrl) {
    return Response.json(
      { message: "BETTER_AUTH_URL is not configured." },
      { status: 500 },
    );
  }

  try {
    const orderId = createOrderId(planId, billingPeriod);
    const order = await createCashfreeOrder({
      amount: plan.amount,
      customerId: session.user.id,
      customerEmail: session.user.email,
      customerName: session.user.name,
      orderId,
      orderNote: `${plan.name} ${billingPeriod} subscription`,
      orderTags: {
        billingPeriod,
        planId,
        userId: session.user.id,
      },
      returnUrl: `${baseUrl}/feed?order_id={order_id}`,
    });

    return Response.json({
      orderId: order.order_id,
      orderStatus: order.order_status,
      paymentSessionId: order.payment_session_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create Cashfree order.";

    return Response.json({ message }, { status: 500 });
  }
}

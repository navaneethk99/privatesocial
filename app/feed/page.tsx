import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getActivePaidSubscription,
  getUserMessageQuota,
  syncSubscriptionFromCashfreeOrder,
} from "@/lib/subscriptions";

import { PlanPopup } from "./plan-popup";
import { SignOutButton } from "./sign-out-button";

type FeedPageProps = {
  searchParams: Promise<{
    order_id?: string;
  }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const { order_id: orderId } = await searchParams;

  let paymentMessage: { tone: "error" | "success"; text: string } | null = null;

  if (orderId) {
    try {
      const paymentResult = await syncSubscriptionFromCashfreeOrder(
        orderId,
        session.user.id,
      );

      paymentMessage = {
        tone: paymentResult.ok ? "success" : "error",
        text: paymentResult.message,
      };
    } catch (error) {
      paymentMessage = {
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not verify the Cashfree payment.",
      };
    }
  }

  const activeSubscription = await getActivePaidSubscription(session.user.id);
  const messageQuota = await getUserMessageQuota(session.user.id);
  const shouldShowPlanPopup = !activeSubscription;

  return (
    <main className="min-h-screen bg-[#060606] px-6 py-10 text-[#f6e7bf]">
      {shouldShowPlanPopup ? <PlanPopup /> : null}
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="rounded-[1.75rem] border border-[#d4af37]/16 bg-[#0d0b08] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <p className="text-sm uppercase tracking-[0.28em] text-[#d4af37]/78">
            Access granted
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.05em]">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#f6e7bf]/62">
            Your authentication flow is live. Email/password signup, email
            sign-in, session persistence, and Google OAuth wiring now go
            through Better Auth backed by Drizzle on Neon.
          </p>
        </header>

        {paymentMessage ? (
          <section
            className={`rounded-[1.5rem] border px-6 py-4 text-sm ${
              paymentMessage.tone === "success"
                ? "border-[#3d8a5a]/35 bg-[#102118] text-[#c8f3d7]"
                : "border-[#b34b4b]/35 bg-[#2a1313] text-[#f7c3c3]"
            }`}
          >
            {paymentMessage.text}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-[#0d0b08] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/70">
              Account
            </p>
            <div className="mt-4 space-y-2 text-sm text-[#f6e7bf]/72">
              <p>Name: {session.user.name}</p>
              <p>Email: {session.user.email}</p>
              <p>User ID: {session.user.id}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-[#0d0b08] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/70">
              Plan
            </p>
            <div className="mt-4 space-y-2 text-sm text-[#f6e7bf]/72">
              {activeSubscription ? (
                <>
                  <p>Active plan: {activeSubscription.planId}</p>
                  <p>Billing: {activeSubscription.billingPeriod}</p>
                  <p>
                    Next payment:{" "}
                    {activeSubscription.nextPaymentDate?.toLocaleDateString(
                      "en-IN",
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p>No active paid plan</p>
                  <p className="text-[#f6e7bf]/48">
                    Choose a plan to hide the purchase prompt until renewal.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-[#0d0b08] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/70">
              Messages
            </p>
            <div className="mt-4 space-y-2 text-sm text-[#f6e7bf]/72">
              <p>Plan: {messageQuota.planName}</p>
              <p>Daily limit: {messageQuota.dailyMessageLimit}</p>
              <p>Used today: {messageQuota.messagesUsedToday}</p>
              <p>Remaining: {messageQuota.messagesRemaining}</p>
              <p>
                Resets:{" "}
                {messageQuota.messagesResetAt
                  ? messageQuota.messagesResetAt.toLocaleString("en-IN")
                  : "Every 24 hours after upgrade"}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-[#0d0b08] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#d4af37]/70">
              Session
            </p>
            <div className="mt-4 space-y-4 text-sm text-[#f6e7bf]/72">
              <p>Active session ID: {session.session.id}</p>
              <SignOutButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

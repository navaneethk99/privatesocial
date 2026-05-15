import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getActivePaidSubscription,
  getUserMessageQuota,
  syncSubscriptionFromCashfreeOrder,
} from "@/lib/subscriptions";

import { ChatHome } from "./chat-home";
import { PlanPopup } from "./plan-popup";

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
  const activePlanLabel = activeSubscription
    ? `${activeSubscription.planId} (${activeSubscription.billingPeriod})`
    : null;
  const nextPaymentDateLabel = activeSubscription?.nextPaymentDate
    ? activeSubscription.nextPaymentDate.toLocaleDateString("en-IN")
    : null;
  const messagesResetAtLabel = messageQuota.messagesResetAt
    ? messageQuota.messagesResetAt.toLocaleString("en-IN")
    : "Every 24 hours after upgrade";

  return (
    <main className="min-h-screen bg-[#060606] px-6 py-10 text-[#f6e7bf]">
      {shouldShowPlanPopup ? <PlanPopup /> : null}
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
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
        <ChatHome
          userName={session.user.name}
          userEmail={session.user.email}
          userId={session.user.id}
          sessionId={session.session.id}
          planName={messageQuota.planName}
          dailyMessageLimit={messageQuota.dailyMessageLimit}
          messagesUsedToday={messageQuota.messagesUsedToday}
          messagesRemaining={messageQuota.messagesRemaining}
          messagesResetAtLabel={messagesResetAtLabel}
          activePlanLabel={activePlanLabel}
          nextPaymentDateLabel={nextPaymentDateLabel}
        />
      </div>
    </main>
  );
}

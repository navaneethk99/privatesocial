"use client";

import Script from "next/script";
import { useState } from "react";

import { type BillingPeriod, planCatalog, type PlanId } from "@/lib/plans";

declare global {
  interface Window {
    Cashfree?: (options: {
      mode: "sandbox" | "production";
    }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
      }) => Promise<unknown> | unknown;
    };
  }
}

const cashfreeMode =
  process.env.NEXT_PUBLIC_CASHFREE_ENV === "production"
    ? "production"
    : "sandbox";

export function PlanPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("plus");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const plans = planCatalog[billingPeriod];
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  if (!isOpen) {
    return null;
  }

  const handleCheckout = async () => {
    setErrorMessage(null);

    if (!selectedPlan || selectedPlan.amount <= 0) {
      setErrorMessage("Select a paid plan to continue to checkout.");
      return;
    }

    if (!window.Cashfree) {
      setErrorMessage("Cashfree checkout has not loaded yet.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriod,
          planId: selectedPlan.id,
        }),
      });

      const payload = (await response.json()) as
        | { paymentSessionId?: string; message?: string }
        | undefined;

      if (!response.ok || !payload?.paymentSessionId) {
        throw new Error(payload?.message ?? "Could not create payment session.");
      }

      const cashfree = window.Cashfree({
        mode: cashfreeMode,
      });

      await cashfree.checkout({
        paymentSessionId: payload.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-6 backdrop-blur-md">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#d4af37]/22 bg-[radial-gradient(circle_at_top,#241b0b_0%,#0d0b08_48%,#090806_100%)] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.58)]">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-5 top-5 rounded-full border border-[#d4af37]/18 px-3 py-1 text-xs text-[#f6e7bf]/64 transition hover:border-[#d4af37]/34 hover:text-[#f6e7bf]"
          >
            Close
          </button>

          <p className="text-lg text-center font-bold text-[#d4af37]/78">
            Upgrade To Gain Access
          </p>
          <h2 className="mt-4 text-balance text-center text-4xl font-medium tracking-[-0.06em] text-[#f8edd0]">
            Choose your plan and pay with Cashfree.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-7 text-[#f6e7bf]/66">
            Select a plan, choose monthly or annual billing, and continue to
            Cashfree checkout to activate premium access.
          </p>

          <div className="mt-6 flex w-full justify-center">
            <div className="inline-flex items-center rounded-2xl border border-[#d4af37]/16 bg-black/24 p-1">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`rounded-[0.9rem] px-4 py-2 text-sm transition ${
                  billingPeriod === "monthly"
                    ? "bg-[#d4af37] text-black"
                    : "text-[#f6e7bf]/68 hover:bg-[#d4af37]/8"
                }`}
              >
                Billed monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annually")}
                className={`rounded-[0.9rem] px-4 py-2 text-sm transition ${
                  billingPeriod === "annually"
                    ? "bg-[#d4af37] text-black"
                    : "text-[#f6e7bf]/68 hover:bg-[#d4af37]/8"
                }`}
              >
                Billed annually
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const isPaidPlan = plan.amount > 0;

              return (
                <button
                  key={`${billingPeriod}-${plan.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setErrorMessage(null);
                  }}
                  className={`grid gap-4 rounded-[1.5rem] border p-5 text-left transition ${
                    isSelected
                      ? "border-[#d4af37]/70 bg-[#181209] shadow-[0_12px_40px_rgba(212,175,55,0.12)]"
                      : "border-[#d4af37]/14 bg-black/22 hover:border-[#d4af37]/34 hover:bg-black/28"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#f8edd0]">
                        {plan.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#d4af37]/62">
                        {isPaidPlan ? "Paid plan" : "Free tier"}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        isSelected
                          ? "border-[#d4af37] bg-[#d4af37]"
                          : "border-[#d4af37]/32"
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-2xl font-medium tracking-[-0.04em] text-[#d4af37]">
                      {plan.priceLabel}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#f6e7bf]/68">
                      {plan.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-[#b34b4b]/35 bg-[#2a1313] px-4 py-3 text-sm text-[#f7c3c3]">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading || !selectedPlan || selectedPlan.amount <= 0}
              className="rounded-2xl bg-[#d4af37] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e0bd53] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Opening checkout..."
                : selectedPlan?.ctaLabel ?? "Purchase plan"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl border border-[#d4af37]/20 bg-black/20 px-5 py-3 text-sm text-[#f6e7bf] transition hover:border-[#d4af37]/38 hover:bg-black/30"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

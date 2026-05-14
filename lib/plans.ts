export type BillingPeriod = "monthly" | "annually";

export type PlanId = "classic" | "plus" | "pro";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  amount: number;
  dailyMessageLimit: number;
  priceLabel: string;
  detail: string;
  ctaLabel: string;
};

export const planCatalog: Record<BillingPeriod, PlanDefinition[]> = {
  monthly: [
    {
      id: "classic",
      name: "PrivateSocial Classic",
      amount: 0,
      dailyMessageLimit: 10,
      priceLabel: "Free",
      detail: "Send upto 10 messages / day",
      ctaLabel: "Current free tier",
    },
    {
      id: "plus",
      name: "PrivateSocial Plus",
      amount: 99,
      dailyMessageLimit: 100,
      priceLabel: "Rs. 99/mo",
      detail: "Send upto 100 messages / day",
      ctaLabel: "Purchase monthly plan",
    },
    {
      id: "pro",
      name: "PrivateSocial Pro",
      amount: 199,
      dailyMessageLimit: 1000,
      priceLabel: "Rs. 199/mo",
      detail: "Send upto 1000 messages / day",
      ctaLabel: "Purchase monthly plan",
    },
  ],
  annually: [
    {
      id: "classic",
      name: "PrivateSocial Classic",
      amount: 0,
      dailyMessageLimit: 10,
      priceLabel: "Free",
      detail: "Send upto 10 messages / day",
      ctaLabel: "Current free tier",
    },
    {
      id: "plus",
      name: "PrivateSocial Plus",
      amount: 999,
      dailyMessageLimit: 100,
      priceLabel: "Rs. 999/yr",
      detail: "Effective price Rs. 83/mo billed annually",
      ctaLabel: "Purchase annual plan",
    },
    {
      id: "pro",
      name: "PrivateSocial Pro",
      amount: 1999,
      dailyMessageLimit: 1000,
      priceLabel: "Rs. 1999/yr",
      detail: "Effective price Rs. 166/mo billed annually",
      ctaLabel: "Purchase annual plan",
    },
  ],
};

export function getPlan(period: BillingPeriod, planId: PlanId) {
  return planCatalog[period].find((plan) => plan.id === planId) ?? null;
}

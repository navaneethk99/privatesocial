import { randomUUID } from "crypto";

const CASHFREE_API_VERSION = "2025-01-01";

export type CashfreeEnvironment = "sandbox" | "production";

type CreateCashfreeOrderInput = {
  amount: number;
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderNote: string;
  orderTags?: Record<string, string>;
  returnUrl: string;
};

type CashfreeOrderResponse = {
  customer_details?: {
    customer_email?: string;
    customer_id?: string;
    customer_name?: string;
  };
  order_id: string;
  order_status: string;
  order_tags?: Record<string, string>;
  payment_session_id: string;
};

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const environment =
    (process.env.CASHFREE_ENV as CashfreeEnvironment | undefined) ?? "sandbox";

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree configuration is incomplete. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.",
    );
  }

  return {
    appId,
    secretKey,
    environment,
    apiBaseUrl:
      environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg",
  };
}

function getCustomerPhone() {
  return process.env.CASHFREE_CUSTOMER_PHONE ?? "9999999999";
}

async function parseCashfreeError(response: Response) {
  const fallbackMessage = `Cashfree request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as
      | { message?: string; type?: string }
      | undefined;

    return payload?.message ?? payload?.type ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export function getCashfreeEnvironment(): CashfreeEnvironment {
  return getCashfreeConfig().environment;
}

export async function createCashfreeOrder({
  amount,
  customerId,
  customerEmail,
  customerName,
  orderId,
  orderNote,
  orderTags,
  returnUrl,
}: CreateCashfreeOrderInput): Promise<CashfreeOrderResponse> {
  const config = getCashfreeConfig();

  const response = await fetch(`${config.apiBaseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-request-id": randomUUID(),
      "x-idempotency-key": randomUUID(),
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: getCustomerPhone(),
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: orderNote,
      order_tags: orderTags,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseCashfreeError(response));
  }

  return (await response.json()) as CashfreeOrderResponse;
}

export async function getCashfreeOrder(orderId: string) {
  const config = getCashfreeConfig();

  const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}`, {
    headers: {
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-request-id": randomUUID(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseCashfreeError(response));
  }

  return (await response.json()) as CashfreeOrderResponse;
}

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

const configuredChatSecret =
  process.env.CHAT_TICKET_SECRET ?? process.env.BETTER_AUTH_SECRET;

if (!configuredChatSecret) {
  throw new Error("CHAT_TICKET_SECRET or BETTER_AUTH_SECRET must be set.");
}

const chatSecret = configuredChatSecret;

function createTicketSignature(payload: string) {
  return createHmac("sha256", chatSecret).update(payload).digest("base64url");
}

function encodeTicketPayload(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const payload = encodeTicketPayload(
    JSON.stringify({
      exp: Date.now() + 30_000,
      sub: session.user.id,
    }),
  );

  const ticket = `${payload}.${createTicketSignature(payload)}`;

  return Response.json({ ticket });
}

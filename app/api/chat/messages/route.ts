import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { incrementMessagesUsed } from "@/lib/subscriptions";

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const quota = await incrementMessagesUsed(session.user.id);

  if (!quota.allowed) {
    return Response.json(
      {
        dailyMessageLimit: quota.dailyMessageLimit,
        message: "Daily message limit reached for your current plan.",
        messagesRemaining: quota.messagesRemaining,
        messagesUsedToday: quota.messagesUsedToday,
      },
      { status: 429 },
    );
  }

  return Response.json({
    dailyMessageLimit: quota.dailyMessageLimit,
    messagesRemaining: quota.messagesRemaining,
    messagesUsedToday: quota.messagesUsedToday,
  });
}

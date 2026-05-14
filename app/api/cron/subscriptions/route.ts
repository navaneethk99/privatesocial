import { expireDueSubscriptions, resetDueMessageQuotas } from "@/lib/subscriptions";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const expiredCount = await expireDueSubscriptions();
  const resetCount = await resetDueMessageQuotas();

  return Response.json({
    expiredCount,
    resetCount,
    ranAt: new Date().toISOString(),
  });
}

import { eq } from "drizzle-orm";

import * as schema from "@/lib/auth-schema";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return Response.json(
      { message: "Email is required." },
      { status: 400 },
    );
  }

  const existingUser = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  return Response.json({ exists: existingUser.length > 0 });
}

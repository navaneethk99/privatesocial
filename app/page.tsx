import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { AuthCard } from "./auth-card";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/feed");
  }

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#060606] text-[#f6e7bf]">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(180,138,35,0.14),_transparent_30%),linear-gradient(135deg,_#020202_0%,_#0b0906_42%,_#020202_100%)]" />
        <div className="absolute left-8 top-8 h-32 w-32 rounded-full border border-[#d4af37]/12" />
        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full border border-[#b48a23]/12" />

        <AuthCard googleEnabled={googleEnabled} />
      </div>
    </main>
  );
}

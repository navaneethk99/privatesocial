import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { SignOutButton } from "./sign-out-button";

export default async function FeedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#060606] px-6 py-10 text-[#f6e7bf]">
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

        <section className="grid gap-4 sm:grid-cols-2">
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

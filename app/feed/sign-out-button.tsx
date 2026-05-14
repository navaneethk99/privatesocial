"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        })
      }
      className="rounded-2xl border border-[#d4af37]/20 bg-black/20 px-4 py-3 text-sm text-[#f6e7bf] transition hover:border-[#d4af37]/38 hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}

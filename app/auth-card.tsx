"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type AuthMode = "signup" | "signin";

type AuthCardProps = {
  googleEnabled: boolean;
};

export function AuthCard({ googleEnabled }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSignup = mode === "signup";
  const rememberMe = true;

  const handleEmailAuth = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const normalizedEmail = email.trim().toLowerCase();

      if (isSignup) {
        const emailExistsResponse = await fetch(
          `/api/auth/email-exists?email=${encodeURIComponent(normalizedEmail)}`,
        );

        if (!emailExistsResponse.ok) {
          setErrorMessage("Could not validate this email address right now.");
          return;
        }

        const emailExistsResult = (await emailExistsResponse.json()) as {
          exists: boolean;
        };

        if (emailExistsResult.exists) {
          setErrorMessage("An account already exists using this email id.");
          return;
        }
      }

      const result = isSignup
        ? await authClient.signUp.email({
            name: "anonymous",
            email: normalizedEmail,
            password,
            callbackURL: "/feed",
          })
        : await authClient.signIn.email({
            email: normalizedEmail,
            password,
            callbackURL: "/feed",
            rememberMe,
          });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Authentication failed.");
        return;
      }

      router.push(
        isSignup
          ? `/check-email?email=${encodeURIComponent(normalizedEmail)}`
          : "/feed",
      );
      router.refresh();
    });
  };

  const handleGoogleAuth = () => {
    if (!googleEnabled) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/feed",
        newUserCallbackURL: "/feed",
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Google sign-in failed.");
      }
    });
  };

  return (
    <section className="relative w-full max-w-md rounded-[1.75rem] border border-[#d4af37]/18 bg-[#090806]/92 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-8">
      <div className="mb-6 space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]/80">
          Private Social
        </p>
        <h1 className="text-3xl font-medium tracking-[-0.05em]">
          {isSignup ? "Create your account" : "Enter your account"}
        </h1>
        <p className="text-sm leading-6 text-[#f6e7bf]/58">
          {isSignup
            ? "Use email or Google to create a private account and enter the network."
            : "Use email or Google to sign back into your private account."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[#d4af37]/12 bg-black/25 p-1">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl px-4 py-2 text-sm transition ${
            isSignup
              ? "bg-[#d4af37] text-black"
              : "text-[#f6e7bf]/68 hover:bg-[#d4af37]/8"
          }`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-xl px-4 py-2 text-sm transition ${
            isSignup
              ? "text-[#f6e7bf]/68 hover:bg-[#d4af37]/8"
              : "bg-[#d4af37] text-black"
          }`}
        >
          Sign in
        </button>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={!googleEnabled || isPending}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d4af37]/18 bg-[#12100c] px-4 py-3 text-sm font-medium text-[#f6e7bf] transition hover:border-[#d4af37]/35 hover:bg-[#17140f] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4af37] text-base font-semibold text-black">
            G
          </span>
          Continue with Google
        </button>

        {!googleEnabled ? (
          <p className="text-xs leading-5 text-[#f6e7bf]/42">
            Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google
            OAuth.
          </p>
        ) : null}

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#f6e7bf]/34">
          <span className="h-px flex-1 bg-[#d4af37]/12" />
          <span>or</span>
          <span className="h-px flex-1 bg-[#d4af37]/12" />
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleEmailAuth}>
        <label className="block space-y-2">
          <span className="text-sm text-[#f6e7bf]/70">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="alias@privatesocial.app"
            required
            className="w-full rounded-2xl border border-[#d4af37]/14 bg-black/34 px-4 py-3 text-sm text-[#f8edd0] outline-none transition placeholder:text-[#f6e7bf]/28 focus:border-[#d4af37]/55 focus:bg-black/46"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-[#f6e7bf]/70">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
            minLength={8}
            required
            className="w-full rounded-2xl border border-[#d4af37]/14 bg-black/34 px-4 py-3 text-sm text-[#f8edd0] outline-none transition placeholder:text-[#f6e7bf]/28 focus:border-[#d4af37]/55 focus:bg-black/46"
          />
        </label>

        {/*<div className="flex items-center justify-between gap-3 pt-1 text-sm text-[#f6e7bf]/56">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-[#d4af37]/30 bg-transparent accent-[#d4af37]"
            />
            <span>Keep this session private</span>
          </label>
          <span className="text-[#e3c56e]">
            {isSignup ? "Auto sign-in enabled" : "Secure session"}
          </span>
        </div>*/}

        {errorMessage ? (
          <div className="rounded-2xl border border-[#b34b4b]/35 bg-[#2a1313] px-4 py-3 text-sm text-[#f7c3c3]">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e0bd53] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending
            ? "Please wait..."
            : isSignup
              ? "Create account"
              : "Sign in securely"}
        </button>
      </form>
    </section>
  );
}

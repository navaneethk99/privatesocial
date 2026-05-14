import Link from "next/link";

type VerifyAccountPageProps = {
  searchParams: Promise<{
    token?: string;
    callbackURL?: string;
  }>;
};

function buildVerifyHref(token: string, callbackURL: string) {
  const params = new URLSearchParams({
    token,
    callbackURL,
  });

  return `/api/auth/verify-email?${params.toString()}`;
}

export default async function VerifyAccountPage({
  searchParams,
}: VerifyAccountPageProps) {
  const { token, callbackURL } = await searchParams;
  const resolvedCallback = callbackURL ?? "/feed";

  return (
    <main className="min-h-screen bg-[#060606] px-6 py-12 text-[#f6e7bf]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[1.75rem] border border-[#d4af37]/18 bg-[#090806]/92 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]/80">
            Account verification
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.05em]">
            Review this account
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#f6e7bf]/64">
            This email address was used to create a Private Social account. You
            can verify the account now or leave it unverified and return later.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {token ? (
              <a
                href={buildVerifyHref(token, resolvedCallback)}
                className="rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e0bd53]"
              >
                Verify account
              </a>
            ) : (
              <span className="rounded-2xl border border-[#b34b4b]/35 bg-[#2a1313] px-4 py-3 text-sm text-[#f7c3c3]">
                This verification link is incomplete or invalid.
              </span>
            )}

            <Link
              href="/"
              className="rounded-2xl border border-[#d4af37]/20 bg-black/20 px-4 py-3 text-sm text-[#f6e7bf] transition hover:border-[#d4af37]/38 hover:bg-black/30"
            >
              Do not verify now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

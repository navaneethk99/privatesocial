import Link from "next/link";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const { email } = await searchParams;

  return (
    <main className="min-h-screen bg-[#060606] px-6 py-12 text-[#f6e7bf]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[1.75rem] border border-[#d4af37]/18 bg-[#090806]/92 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-sm font-bold  text-[#d4af37]/80">
            Check your inbox
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.05em]">
            Verification email sent
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#f6e7bf]/64">
            We sent a verification email to{" "}
            <span className="text-[#f6e7bf]">{email ?? "your address"}</span>.
            Open the link in that email to review the account and choose whether
            you want to verify it now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e0bd53]"
            >
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

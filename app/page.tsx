export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#060606] text-[#f6e7bf]">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(180,138,35,0.14),_transparent_30%),linear-gradient(135deg,_#020202_0%,_#0b0906_42%,_#020202_100%)]" />
        <div className="absolute left-8 top-8 h-32 w-32 rounded-full border border-[#d4af37]/12" />
        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full border border-[#b48a23]/12" />

        <section className="relative w-full max-w-md rounded-[1.75rem] border border-[#d4af37]/18 bg-[#090806]/92 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-8">
              <div className="mb-8 space-y-2">

                <h2 className="text-3xl font-medium tracking-[-0.05em]">
                  Enter your account
                </h2>
                <p className="text-sm leading-6 text-[#f6e7bf]/58">
                  Use your email and password to access your private feed.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d4af37]/18 bg-[#12100c] px-4 py-3 text-sm font-medium text-[#f6e7bf] transition hover:border-[#d4af37]/35 hover:bg-[#17140f]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4af37] text-base font-semibold text-black">
                    G
                  </span>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#f6e7bf]/34">
                  <span className="h-px flex-1 bg-[#d4af37]/12" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-[#d4af37]/12" />
                </div>
              </div>

              <form className="mt-4 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm text-[#f6e7bf]/70">Email</span>
                  <input
                    type="email"
                    placeholder="alias@privatesocial.app"
                    className="w-full rounded-2xl border border-[#d4af37]/14 bg-black/34 px-4 py-3 text-sm text-[#f8edd0] outline-none transition placeholder:text-[#f6e7bf]/28 focus:border-[#d4af37]/55 focus:bg-black/46"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-[#f6e7bf]/70">Password</span>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-[#d4af37]/14 bg-black/34 px-4 py-3 text-sm text-[#f8edd0] outline-none transition placeholder:text-[#f6e7bf]/28 focus:border-[#d4af37]/55 focus:bg-black/46"
                  />
                </label>


                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e0bd53]"
                >
                  Sign in 
                </button>
              </form>

        </section>
      </div>
    </main>
  );
}

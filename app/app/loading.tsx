export default function LoadingAppPage() {
  return (
    <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
      <section className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-7 w-56 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="h-10 w-20 animate-pulse rounded-full bg-white/10" />
        </div>

        <div className="mt-8 h-56 animate-pulse rounded-[2rem] bg-white/10" />

        <div className="mt-8 space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
        </div>
      </section>
    </main>
  );
}
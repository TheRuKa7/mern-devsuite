export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold">mern-devsuite</h1>
      <p className="mt-4 text-lg text-gray-600">
        Production-ready MERN B2B SaaS template with auth, payments, multi-tenancy,
        observability, and compliance primitives.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/login" className="rounded bg-black px-4 py-2 text-white">Sign in</a>
        <a
          href="https://github.com/TheRuKa7/mern-devsuite"
          className="rounded border px-4 py-2"
        >
          View on GitHub
        </a>
      </div>
    </main>
  );
}

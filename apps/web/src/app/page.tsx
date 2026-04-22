/**
 * Public landing page. Kept deliberately lightweight — the goal is to
 * showcase what's *inside* the template (auth, multi-tenancy, audit,
 * GDPR) rather than sell a product.
 */
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@mern-devsuite/ui";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight">mern-devsuite</div>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium">
                Sign in
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-24 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Ship a compliant SaaS in a weekend, not a quarter.
        </h1>
        <p className="mt-6 text-lg text-slate-600 dark:text-slate-400">
          Turborepo + Next 15 + Express 5 + MongoDB + Auth.js v5, wired
          for multi-tenant B2B from day one. SOC-2 and GDPR primitives
          are baked in — tamper-evident audit log, GDPR export + soft
          delete, security headers, rate limits.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Feature
            title="Tamper-evident audit log"
            body="Every privileged action hashes into a linear chain. One endpoint verifies the chain in seconds — that's your SOC-2 CC7.2 control."
          />
          <Feature
            title="GDPR out of the box"
            body="Art. 15 JSON export, Art. 17 soft-delete with 30-day grace, audit trail before mutation. Flip one env var for hard-delete."
          />
          <Feature
            title="Shared auth"
            body="Auth.js v5 on Next, HS256 JWT the Express API verifies. Same secret, two surfaces, zero cookie-sharing hacks."
          />
          <Feature
            title="Workspaces + RBAC"
            body="Owner / admin / member / guest ladder enforced by middleware. New user? You get a default workspace on sign-up."
          />
        </div>

        <div className="mt-12 flex gap-4">
          {session ? (
            <Link href="/dashboard">
              <Button size="lg">Open dashboard</Button>
            </Link>
          ) : (
            <Link href="/sign-up">
              <Button size="lg">Create an account</Button>
            </Link>
          )}
          <a
            href="https://github.com/TheRuKa7/mern-devsuite"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Button size="lg" variant="outline">
              View on GitHub
            </Button>
          </a>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 pt-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex flex-wrap gap-6">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="https://github.com/TheRuKa7/mern-devsuite/blob/main/docs/COMPLIANCE.md">
            Compliance
          </a>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

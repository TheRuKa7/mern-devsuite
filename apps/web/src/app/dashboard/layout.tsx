/**
 * Authenticated shell — side-nav + sign-out button. Anything under
 * /dashboard gets this wrapper; the middleware already enforces the
 * session, so we can trust `auth()` returns a user here.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@mern-devsuite/ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");

  async function signOutAction(): Promise<void> {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              mern-devsuite
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard">Overview</Link>
              <Link href="/dashboard/projects">Projects</Link>
              <Link href="/dashboard/settings">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {session.user.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" size="sm" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

/**
 * Settings — identity + GDPR controls.
 *
 * "Download my data" proxies to `/api/gdpr/export` (Art. 15 + 20) and
 * streams a signed JSON bundle back to the browser via a dedicated
 * route handler (we can't hand-off the API's Response from a server
 * action, so the button points at `/api/account/export`).
 *
 * "Delete my account" (Art. 17) calls a server action that hits
 * `/api/gdpr/delete`. By default the API soft-deletes with a 30-day
 * grace window; flip GDPR_HARD_DELETE=true on the API to bypass that.
 */
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@mern-devsuite/ui";
import { apiFetch } from "@/lib/api";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const params = await searchParams;

  async function deleteAccountAction(formData: FormData): Promise<void> {
    "use server";
    const reason = String(formData.get("reason") ?? "").trim() || undefined;
    try {
      await apiFetch("/api/gdpr/delete", {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "delete failed";
      redirect(`/dashboard/settings?error=${encodeURIComponent(msg)}`);
    }
    // Session cookie still exists — clear it so the redirect doesn't
    // bounce off a protected page.
    await signOut({ redirect: false });
    redirect("/?deleted=1");
  }

  return (
    <section className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Profile + privacy controls for {session.user.email}.
        </p>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          {decodeURIComponent(params.error)}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            GDPR Art. 15 + Art. 20 — download a portable JSON bundle of
            everything we hold about you.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <a href="/api/account/export">
            <Button variant="outline">Download my data</Button>
          </a>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            GDPR Art. 17 — your account is tombstoned immediately and
            hard-deleted after 30 days. Owned workspaces are renamed to
            &quot;[deleted workspace]&quot; so teammates aren&apos;t
            orphaned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={deleteAccountAction}
            className="flex flex-col gap-3"
          >
            <label
              htmlFor="reason"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Reason (optional — helps us improve)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            />
            <div>
              <Button type="submit" variant="destructive">
                Delete my account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

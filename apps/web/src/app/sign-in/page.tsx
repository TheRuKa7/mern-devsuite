/**
 * Sign-in — Credentials provider only. OAuth providers can slot in
 * behind a horizontal rule once you wire up GoogleProvider /
 * GitHubProvider in `auth.ts`.
 *
 * The form uses a server action so the Auth.js `signIn()` helper can
 * set the session cookie before the redirect. Client-side form
 * handling would require a round trip through /api/auth/callback and
 * cost the user a flash of the previous page.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@mern-devsuite/ui";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const errorMessage = mapAuthError(params.error);

  async function signInAction(formData: FormData): Promise<void> {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: callbackUrl,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(
          `/sign-in?error=${encodeURIComponent(e.type)}&callbackUrl=${encodeURIComponent(
            callbackUrl,
          )}`,
        );
      }
      throw e;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Welcome back. Use your email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <Alert variant="destructive" className="mb-4">
              {errorMessage}
            </Alert>
          ) : null}
          <form action={signInAction} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="callbackUrl"
              value={params.callbackUrl ?? "/dashboard"}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="mt-2">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        No account yet?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-slate-900 underline dark:text-slate-100"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}

function mapAuthError(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "CredentialsSignin":
      return "Invalid email or password.";
    case "CallbackRouteError":
      return "We couldn't sign you in. Try again in a moment.";
    default:
      return "Something went wrong. Try again.";
  }
}

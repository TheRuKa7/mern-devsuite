/**
 * Sign-up — posts to the Express API's `/api/auth/register`, which
 * creates the User + default Workspace + owner Membership atomically.
 * On success we auto-sign-in via the same Credentials provider so the
 * new account lands on the dashboard without a second form.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { RegisterInput } from "@mern-devsuite/shared";
import { serverEnv } from "@/env";
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

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  async function signUpAction(formData: FormData): Promise<void> {
    "use server";
    const raw = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? "") || undefined,
    };
    const parsed = RegisterInput.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid input";
      redirect(`/sign-up?error=${encodeURIComponent(first)}`);
    }

    const res = await fetch(`${serverEnv.API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      redirect(
        `/sign-up?error=${encodeURIComponent(
          body.error?.message ?? "Sign-up failed",
        )}`,
      );
    }

    try {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirectTo: "/dashboard",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect("/sign-in?error=CredentialsSignin");
      }
      throw e;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            You'll land on a fresh workspace as its owner — you can
            invite teammates after sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <Alert variant="destructive" className="mb-4">
              {errorMessage}
            </Alert>
          ) : null}
          <form action={signUpAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
              />
            </div>
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
                autoComplete="new-password"
                minLength={12}
                required
              />
              <p className="text-xs text-slate-500">
                At least 12 characters.
              </p>
            </div>
            <Button type="submit" className="mt-2">
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-slate-900 underline dark:text-slate-100"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}

/**
 * GDPR export proxy.
 *
 * We can't return a Response directly from a server action (Next's
 * action protocol wraps the payload). So the settings page points at
 * this route, which mints a JWT, calls the API, and streams the
 * response body back to the browser unmodified — filename header and
 * all.
 */
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/auth";
import { serverEnv } from "@/env";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string } | undefined;
  if (!user?.id || !user.email) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "sign in first" } },
      { status: 401 },
    );
  }

  const secretBytes = new TextEncoder().encode(serverEnv.AUTH_SECRET);
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(secretBytes);

  const upstream = await fetch(`${serverEnv.API_URL}/api/gdpr/export`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: { code: "upstream", message: "export failed" } },
      { status: upstream.status },
    );
  }

  // Pass through the upstream's body + content-disposition so the
  // browser offers a clean download.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? "attachment",
      "cache-control": "no-store",
    },
  });
}

/**
 * Server-only helper for calling the Express API on behalf of the
 * signed-in user.
 *
 * We mint a short-lived HS256 JWT with the shared AUTH_SECRET, carrying
 * `sub` + `email` from the Auth.js session. The API's `requireAuth`
 * middleware accepts this identical shape — same secret, same alg.
 *
 * This helper must never be imported into a client component. The
 * AUTH_SECRET leaking into a browser bundle would be catastrophic.
 */
import "server-only";
import { SignJWT } from "jose";
import { auth } from "@/auth";
import { serverEnv } from "@/env";

const secretBytes = new TextEncoder().encode(serverEnv.AUTH_SECRET);

async function mintApiToken(
  sub: string,
  email: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now)
    // Short TTL — refreshed per request. Limits blast radius if a
    // token somehow escapes the server (it shouldn't — these are only
    // attached to outbound fetches, never sent to the browser).
    .setExpirationTime(now + 60)
    .sign(secretBytes);
}

export interface ApiError extends Error {
  status: number;
  code?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { unauthenticated?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  if (!init.unauthenticated) {
    const session = await auth();
    const user = session?.user as { id?: string; email?: string } | undefined;
    if (!user?.id || !user.email) {
      const err = new Error("no session") as ApiError;
      err.status = 401;
      throw err;
    }
    const token = await mintApiToken(user.id, user.email);
    headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${serverEnv.API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    const err = new Error(
      body.error?.message ?? `api ${res.status}`,
    ) as ApiError;
    err.status = res.status;
    err.code = body.error?.code;
    throw err;
  }

  // 204 No Content has no body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

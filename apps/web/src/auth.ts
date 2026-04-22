/**
 * Auth.js v5 — session authority for the web app (Node-runtime build).
 *
 * Strategy: JWT sessions (HS256) signed with AUTH_SECRET. The Express
 * API is given the same secret, so it can verify the same token and
 * trust the `sub` claim as a user id.
 *
 * We proxy credentials to the API's `/api/auth/verify` endpoint rather
 * than checking the password in the Next process — the API owns the
 * bcrypt compare + audit logging + rate limiting, and we want that
 * surface to be single-source-of-truth.
 *
 * The MongoDB adapter is present so Auth.js can persist any OAuth
 * accounts you wire up later (Google, GitHub). Credentials flow itself
 * is stateless + JWT-only by design.
 *
 * # Edge split
 *
 * This module imports the Mongo driver, which the Edge runtime can't
 * bundle. Middleware therefore imports `auth.config.ts` (edge-safe)
 * *not* this file. Route handlers and server components can safely
 * import from here because they run under Node.
 */
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { SignInInput } from "@mern-devsuite/shared";
import { clientPromise } from "@/lib/db";
import { serverEnv } from "@/env";
import { authConfig } from "@/auth.config";

// Annotate with `NextAuthResult` so emitted declarations don't inline
// an inferred path into the pnpm store for `@auth/core/providers` —
// Next's "not portable" check rejects the inferred form.
const result: NextAuthResult = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  secret: serverEnv.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = SignInInput.safeParse(raw);
        if (!parsed.success) return null;
        // Let the API do the bcrypt compare. It returns the user on
        // success and 401 otherwise — we map that to null so Auth.js
        // shows a generic error, no enumeration leak.
        try {
          const res = await fetch(`${serverEnv.API_URL}/api/auth/verify`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(parsed.data),
            // Credentials-only call — no cookies, no cache.
            cache: "no-store",
          });
          if (!res.ok) return null;
          const { user } = await res.json();
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});

export const auth: NextAuthResult["auth"] = result.auth;
export const handlers: NextAuthResult["handlers"] = result.handlers;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;

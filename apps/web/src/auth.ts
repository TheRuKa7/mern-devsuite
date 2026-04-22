/**
 * Auth.js v5 — session authority for the web app.
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
 */
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { SignInInput } from "@mern-devsuite/shared";
import { clientPromise } from "@/lib/db";
import { serverEnv } from "@/env";

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 hours
  secret: serverEnv.AUTH_SECRET,
  pages: {
    signIn: "/sign-in",
  },
  trustHost: true,
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
  callbacks: {
    // Token-level: persist the user id as `sub`. The API middleware
    // reads exactly this claim.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
      }
      return token;
    },
    // Session-level: expose id + email to client components.
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/workspaces");
      if (isProtected) return !!auth;
      return true;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

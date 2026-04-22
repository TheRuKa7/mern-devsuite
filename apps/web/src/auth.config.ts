/**
 * Edge-safe subset of the Auth.js config.
 *
 * Auth.js v5 runs its `authorized` callback inside Next's middleware,
 * which uses the Edge runtime. The Edge runtime can't import Node-only
 * modules (MongoDB driver, `node:process`, bcrypt, …) — if it sees
 * them, webpack fails with `UnhandledSchemeError: node:process`.
 *
 * The standard fix (see https://authjs.dev/guides/edge-compatibility)
 * is to split the config in two:
 *
 *   - `auth.config.ts` (this file): edge-safe. No adapter, no DB
 *     client, no providers that touch Node-only libs. Contains
 *     `session`, `callbacks.authorized`, `pages`, `trustHost`.
 *   - `auth.ts`: Node-only. Imports this config, bolts on the
 *     MongoDB adapter + Credentials provider (which calls `fetch`
 *     against the API for bcrypt), and exports the full `auth()` +
 *     `handlers` used by server components and route handlers.
 *
 * `middleware.ts` imports the *edge* build derived from this file, so
 * the Mongo driver never reaches the middleware bundle.
 */
import type { NextAuthConfig } from "next-auth";

// Explicit annotation (rather than `satisfies`) so the emitted .d.ts
// doesn't reference `@auth/core/adapters` via an inferred path —
// TypeScript flags that as "not portable" when the store has both
// next-auth v5 and the transitive @auth/core copy pulled by the
// MongoDB adapter.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 hours
  pages: {
    signIn: "/sign-in",
  },
  trustHost: true,
  // Providers are added in `auth.ts` (Node runtime). Keeping this
  // array empty in the edge config is supported — middleware only
  // needs `authorized`, which doesn't consult providers.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
      }
      return token;
    },
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

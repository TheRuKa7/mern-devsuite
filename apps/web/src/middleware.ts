/**
 * Next.js middleware — runs on every request (Edge runtime) to guard
 * protected routes. We delegate to the `authorized` callback defined
 * in `auth.config.ts`, which is the edge-safe subset (no Mongo driver,
 * no bcrypt). The full Node-side `auth` lives in `auth.ts` and must
 * not be imported here — bundling MongoDB into middleware fails with
 * an `UnhandledSchemeError: node:process` from webpack.
 *
 * Matcher excludes static assets, API routes, and the auth endpoints
 * themselves — those must not redirect.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Everything except: _next/static, _next/image, favicon, public files,
    // the /api/auth/* endpoints (auth.js owns those), and the root page.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|assets|images|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

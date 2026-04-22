/**
 * Next.js middleware — runs on every request to guard protected
 * routes. We delegate to the `authorized` callback in `auth.ts`, which
 * checks the session cookie and returns a boolean.
 *
 * Matcher excludes static assets, API routes, and the auth endpoints
 * themselves — those must not redirect.
 */
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Everything except: _next/static, _next/image, favicon, public files,
    // the /api/auth/* endpoints (auth.js owns those), and the root page.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|assets|images|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

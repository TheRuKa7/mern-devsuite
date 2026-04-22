/**
 * Auth.js v5 route handler — exposes GET/POST /api/auth/* for the
 * Credentials flow, CSRF token endpoint, sign-in / sign-out / session.
 *
 * Note: these are Next's session endpoints. The Express API owns a
 * different `/api/auth/register` + `/api/auth/verify` pair on its own
 * origin — don't confuse the two.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

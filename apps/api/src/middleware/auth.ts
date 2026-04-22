/**
 * Auth middleware — verifies a JWT issued by the Next.js app (Auth.js v5).
 *
 * # Why JWT instead of shared session cookies?
 *
 * The web app runs on Vercel (or similar) and the Express API runs on
 * Render / Fly. They're on different domains, so cookie-based session
 * sharing would require a reverse proxy. Auth.js v5 supports a JWT
 * session strategy out of the box: the web sets a cookie on its own
 * domain, but when it calls the API it mints a short-lived JWT with
 * the same secret, and we verify it here.
 *
 * # Claims we trust
 *
 * Only `sub`, `email`, `exp` are consumed. Role / workspace info is
 * *always* re-read from Mongo — a revoked role must take effect on
 * the next request, not on the next token refresh.
 *
 * # Algorithm
 *
 * HS256 with the shared AUTH_SECRET. We reject any token that isn't
 * HS256 to avoid the classic "alg: none" downgrade attack.
 */
import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { env } from "../env.js";
import { UserModel } from "../db/user.model.js";
import { logger } from "../logger.js";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

function unauth(res: Response, message: string, code = "unauthorized") {
  return res.status(401).json({ error: { code, message } });
}

function extractToken(req: Request): string | null {
  const hdr = req.headers.authorization;
  if (hdr && hdr.startsWith("Bearer ")) return hdr.slice(7).trim();
  // Auth.js v5 names the JWT cookie `authjs.session-token` (or
  // `__Secure-authjs.session-token` in production). We read both.
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(
    /(?:^|;\s*)(?:__Secure-)?authjs\.session-token=([^;]+)/,
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

const SECRET_BYTES = new TextEncoder().encode(env.AUTH_SECRET);

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    unauth(res, "missing bearer token or session cookie");
    return;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_BYTES, {
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email =
      typeof payload.email === "string" ? (payload.email as string) : null;
    if (!sub || !email) {
      unauth(res, "malformed token");
      return;
    }

    // Look the user up — we don't trust the token beyond identity.
    // If the account was deleted during the session's lifetime, reject.
    const user = await UserModel.findById(sub).lean().exec();
    if (!user || user.deletedAt) {
      unauth(res, "user not found or deleted", "forbidden");
      return;
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name ?? undefined,
    };
    next();
  } catch (e) {
    logger.debug({ err: e }, "jwt verify failed");
    unauth(res, "invalid or expired token");
  }
}

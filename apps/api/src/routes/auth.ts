/**
 * Auth routes — account creation + password verification.
 *
 * The web app (Auth.js v5 Credentials provider) POSTs to
 * `/api/auth/register` to create the row and to `/api/auth/verify` to
 * check a password before issuing its own JWT. Session issuance lives
 * in Auth.js on the Next side — we're the identity *store*, not the
 * session authority.
 */
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import {
  RegisterInput,
  SignInInput,
} from "@mern-devsuite/shared";
import { UserModel } from "../db/user.model.js";
import { WorkspaceModel } from "../db/workspace.model.js";
import { MembershipModel } from "../db/membership.model.js";
import { appendAudit } from "../services/audit.js";

export const authRouter: Router = Router();

// bcrypt cost factor. 12 is the 2024+ recommendation (OWASP
// ASVS v4.0). Bump as CPU budgets grow; tune down to 10 in tests to
// keep CI under a minute.
const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterInput.parse(req.body);
  const existing = await UserModel.findOne({ email: parsed.email }).lean();
  if (existing) {
    // Don't reveal whether the email is registered; respond with 409
    // only on authenticated paths. For public sign-up we return a
    // generic "email already registered" — enumerable by design
    // because OWASP ASVS 2.1.2 treats sign-up enumeration as
    // low-risk when paired with rate limiting (which we have).
    res
      .status(409)
      .json({ error: { code: "conflict", message: "email already registered" } });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_COST);
  const user = await UserModel.create({
    email: parsed.email,
    name: parsed.name ?? undefined,
    passwordHash,
  });

  // Seed a default workspace so "sign up -> land on dashboard" works
  // without a second form. The slug falls back to a 6-char hex if the
  // email local-part is too short or taken.
  const baseSlug = slugify(parsed.email.split("@")[0] ?? "user") || "workspace";
  let slug = baseSlug;
  // Try a few suffixes before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    const conflict = await WorkspaceModel.findOne({ slug }).lean();
    if (!conflict) break;
    slug =
      baseSlug +
      "-" +
      Math.floor(Math.random() * 0xffff)
        .toString(16)
        .padStart(4, "0");
  }
  const workspace = await WorkspaceModel.create({
    name: parsed.name ? `${parsed.name}'s workspace` : "My workspace",
    slug,
    plan: "free",
    ownerId: user._id,
  });
  await MembershipModel.create({
    userId: user._id,
    workspaceId: workspace._id,
    role: "owner",
  });

  await appendAudit({
    actorId: user._id as never,
    workspaceId: workspace._id as never,
    action: "user.registered",
    resource: "user",
    resourceId: String(user._id),
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
    metadata: { workspaceSlug: slug },
  });

  res.status(201).json({
    user: user.toJSON(),
    defaultWorkspace: workspace.toJSON(),
  });
});

authRouter.post("/verify", async (req: Request, res: Response) => {
  const parsed = SignInInput.parse(req.body);
  const user = await UserModel.findOne({ email: parsed.email })
    .select("+passwordHash")
    .exec();
  if (!user || user.deletedAt) {
    // Constant-ish response time matters here — a missing user should
    // cost roughly as much as a wrong password to avoid a timing
    // oracle on email enumeration. `bcrypt.compare` against a dummy
    // hash burns similar CPU.
    await bcrypt.compare(parsed.password, "$2a$12$" + "a".repeat(53));
    res
      .status(401)
      .json({ error: { code: "unauthorized", message: "invalid credentials" } });
    return;
  }
  const ok = await bcrypt.compare(
    parsed.password,
    user.passwordHash as string,
  );
  if (!ok) {
    await appendAudit({
      actorId: user._id as never,
      action: "user.login.failed",
      resource: "user",
      resourceId: String(user._id),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res
      .status(401)
      .json({ error: { code: "unauthorized", message: "invalid credentials" } });
    return;
  }
  await appendAudit({
    actorId: user._id as never,
    action: "user.login.ok",
    resource: "user",
    resourceId: String(user._id),
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ user: user.toJSON() });
});

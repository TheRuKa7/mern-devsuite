/**
 * Shared Zod schemas and TypeScript types.
 *
 * Everything crossing the web <-> api boundary (request bodies, response
 * shapes, session claims) is declared here once. The api validates
 * incoming payloads with these; the web uses the inferred types for
 * its form state and fetch layer — so a contract change is a single
 * edit here that both sides must satisfy at compile time.
 */
import { z } from "zod";

export { z };

// ---------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------

/** Case-insensitive role assignable to a workspace member. */
export const RoleSchema = z.enum(["owner", "admin", "member", "guest"]);
export type Role = z.infer<typeof RoleSchema>;

/** Plan tiers. Kept in sync with Stripe price IDs in env. */
export const PlanSchema = z.enum(["free", "pro", "team"]);
export type Plan = z.infer<typeof PlanSchema>;

export const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "expected 24-char hex ObjectId");

// ---------------------------------------------------------------------
// Domain models (persisted)
// ---------------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  // passwordHash never leaves the server — we keep it out of this
  // shared schema on purpose so it can't accidentally be serialised.
  emailVerifiedAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  plan: PlanSchema,
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const MembershipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  role: RoleSchema,
  createdAt: z.date(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().default(""),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Audit event — every privileged action appends one.
 *
 * `prevHash` + `hash` form a hash chain: `hash = sha256(prevHash || json(event))`.
 * A tampered row breaks the chain and `/api/audit/verify` will surface the
 * first broken index. This is the SOC-2 CC7.2 "detection of unauthorized
 * changes" control in practice.
 */
export const AuditEventSchema = z.object({
  id: z.string(),
  seq: z.number().int().nonnegative(),
  actorId: z.string().nullable(),
  workspaceId: z.string().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  prevHash: z.string(),
  hash: z.string(),
  createdAt: z.date(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ---------------------------------------------------------------------
// Request DTOs (never include server-only fields)
// ---------------------------------------------------------------------

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(12, "use at least 12 characters").max(200),
  name: z.string().min(1).max(80).optional(),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const SignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const CreateWorkspaceInput = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits, and hyphens only"),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const CreateProjectInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = CreateProjectInput.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

// ---------------------------------------------------------------------
// Auth session (JWT claims, used by web <-> api)
// ---------------------------------------------------------------------

/**
 * The shape Auth.js encodes in its JWT. We keep it flat and small: a
 * JWT is not a database, just an identity capsule. The API re-reads
 * workspace membership per request rather than trusting claims from
 * the token, so a role revocation takes effect on the next request.
 */
export const SessionClaimsSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

// ---------------------------------------------------------------------
// API envelope (consistent error shape)
// ---------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Common error codes — mirrors HTTP semantics but app-layer so we can
// log them as a closed set in audit metadata.
export const ERROR_CODES = {
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  INTERNAL: "internal",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

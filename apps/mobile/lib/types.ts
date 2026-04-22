import { z } from "zod";

export const RoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.enum(["free", "pro", "enterprise"]),
  role: RoleSchema, // current user's role in this workspace
  memberCount: z.number(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  resource: z.string(),
  ts: z.string(),
  prevHash: z.string(),
  rowHash: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["paid", "open", "void", "uncollectible"]),
  hostedInvoiceUrl: z.string().url().nullable().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

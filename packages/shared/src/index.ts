/**
 * Shared zod schemas and types across web + api.
 * Single source of truth for request/response contracts.
 */
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  plan: z.enum(["free", "pro", "team"]),
  createdAt: z.date(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  workspaceId: z.string(),
  action: z.string(), // e.g. "user.login", "billing.subscription.updated"
  resource: z.string(),
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

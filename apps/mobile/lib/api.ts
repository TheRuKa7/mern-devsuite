import axios, { AxiosInstance } from "axios";
import { z } from "zod";
import { useAuth } from "./store";
import {
  AuditEvent,
  AuditEventSchema,
  Invoice,
  InvoiceSchema,
  User,
  UserSchema,
  Workspace,
  WorkspaceSchema,
} from "./types";

function client(): AxiosInstance {
  const { apiBaseUrl, accessToken, currentWorkspaceId } = useAuth.getState();
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (currentWorkspaceId) headers["X-Workspace-Id"] = currentWorkspaceId;
  return axios.create({ baseURL: apiBaseUrl, timeout: 15_000, headers });
}

export async function signIn(email: string, password: string): Promise<string> {
  const { apiBaseUrl } = useAuth.getState();
  const r = await axios.post(
    `${apiBaseUrl}/auth/sign-in`,
    { email, password },
    { timeout: 15_000 },
  );
  return z.object({ accessToken: z.string() }).parse(r.data).accessToken;
}

export async function me(): Promise<User> {
  const r = await client().get("/me");
  return UserSchema.parse(r.data);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const r = await client().get("/workspaces");
  return z.array(WorkspaceSchema).parse(r.data);
}

export async function listAuditEvents(limit = 50): Promise<AuditEvent[]> {
  const r = await client().get("/audit", { params: { limit } });
  return z.array(AuditEventSchema).parse(r.data);
}

export async function listInvoices(): Promise<Invoice[]> {
  const r = await client().get("/billing/invoices");
  return z.array(InvoiceSchema).parse(r.data);
}

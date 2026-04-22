/**
 * Workspace CRUD + membership listing.
 *
 * A workspace is the multi-tenant unit. The creator becomes `owner`;
 * additional members are added via /members (P2) which isn't wired in
 * this revision but the audit + middleware shape it.
 */
import { Router, type Response } from "express";
import { CreateWorkspaceInput } from "@mern-devsuite/shared";
import { WorkspaceModel } from "../db/workspace.model.js";
import { MembershipModel } from "../db/membership.model.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  requireWorkspace,
  type ScopedRequest,
} from "../middleware/workspace.js";
import { appendAudit } from "../services/audit.js";

export const workspacesRouter: Router = Router();

workspacesRouter.post(
  "/",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const parsed = CreateWorkspaceInput.parse(req.body);
    const ownerId = req.user!.id;

    const existing = await WorkspaceModel.findOne({ slug: parsed.slug }).lean();
    if (existing) {
      res
        .status(409)
        .json({ error: { code: "conflict", message: "slug already taken" } });
      return;
    }
    const ws = await WorkspaceModel.create({
      name: parsed.name,
      slug: parsed.slug,
      plan: "free",
      ownerId,
    });
    await MembershipModel.create({
      userId: ownerId,
      workspaceId: ws._id,
      role: "owner",
    });
    await appendAudit({
      actorId: ownerId,
      workspaceId: ws._id as never,
      action: "workspace.created",
      resource: "workspace",
      resourceId: String(ws._id),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
      metadata: { slug: parsed.slug },
    });
    res.status(201).json(ws.toJSON());
  },
);

workspacesRouter.get(
  "/:workspaceId",
  requireAuth,
  requireWorkspace("guest"),
  async (req: ScopedRequest, res: Response) => {
    const ws = await WorkspaceModel.findById(req.workspaceId).lean().exec();
    res.json(ws);
  },
);

workspacesRouter.get(
  "/:workspaceId/members",
  requireAuth,
  requireWorkspace("member"),
  async (req: ScopedRequest, res: Response) => {
    const members = await MembershipModel.find({ workspaceId: req.workspaceId })
      .populate("userId", "email name")
      .lean()
      .exec();
    res.json(
      members.map((m) => ({
        id: String(m._id),
        role: m.role,
        user: m.userId as unknown as { _id: unknown; email: string; name?: string },
      })),
    );
  },
);

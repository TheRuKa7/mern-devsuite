/**
 * Project CRUD scoped to a workspace.
 *
 * Every write emits an audit event. Reads are not audited — chatty and
 * non-privileged. Route shape: /api/workspaces/:workspaceId/projects/...
 */
import { Router, type Response } from "express";
import { Types } from "mongoose";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "@mern-devsuite/shared";
import { ProjectModel } from "../db/project.model.js";
import { requireAuth } from "../middleware/auth.js";
import {
  requireWorkspace,
  type ScopedRequest,
} from "../middleware/workspace.js";
import { appendAudit } from "../services/audit.js";

export const projectsRouter: Router = Router({ mergeParams: true });

projectsRouter.use(requireAuth, requireWorkspace("member"));

projectsRouter.get("/", async (req: ScopedRequest, res: Response) => {
  const items = await ProjectModel.find({ workspaceId: req.workspaceId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
    .exec();
  res.json(items.map((p) => ({ ...p, id: String(p._id) })));
});

projectsRouter.post("/", async (req: ScopedRequest, res: Response) => {
  const parsed = CreateProjectInput.parse(req.body);
  const project = await ProjectModel.create({
    workspaceId: req.workspaceId,
    name: parsed.name,
    description: parsed.description ?? "",
    createdBy: req.user!.id,
  });
  await appendAudit({
    actorId: req.user!.id,
    workspaceId: req.workspaceId ?? null,
    action: "project.created",
    resource: "project",
    resourceId: String(project._id),
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
    metadata: { name: parsed.name },
  });
  res.status(201).json(project.toJSON());
});

projectsRouter.patch("/:id", async (req: ScopedRequest, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id ?? "")) {
    res
      .status(400)
      .json({ error: { code: "bad_request", message: "invalid id" } });
    return;
  }
  const parsed = UpdateProjectInput.parse(req.body);
  const project = await ProjectModel.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.workspaceId },
    { $set: parsed },
    { new: true },
  ).exec();
  if (!project) {
    res.status(404).json({ error: { code: "not_found", message: "not found" } });
    return;
  }
  await appendAudit({
    actorId: req.user!.id,
    workspaceId: req.workspaceId ?? null,
    action: "project.updated",
    resource: "project",
    resourceId: String(project._id),
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
    metadata: parsed,
  });
  res.json(project.toJSON());
});

projectsRouter.delete("/:id", requireWorkspace("admin"), async (req: ScopedRequest, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id ?? "")) {
    res
      .status(400)
      .json({ error: { code: "bad_request", message: "invalid id" } });
    return;
  }
  const project = await ProjectModel.findOneAndDelete({
    _id: req.params.id,
    workspaceId: req.workspaceId,
  }).exec();
  if (!project) {
    res.status(404).json({ error: { code: "not_found", message: "not found" } });
    return;
  }
  await appendAudit({
    actorId: req.user!.id,
    workspaceId: req.workspaceId ?? null,
    action: "project.deleted",
    resource: "project",
    resourceId: String(project._id),
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.status(204).end();
});

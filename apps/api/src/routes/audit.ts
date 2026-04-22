/**
 * Audit routes — read-only and restricted to workspace admins.
 *
 * /verify walks the full chain and returns ok + the first broken seq
 * if any. In a real deployment this endpoint is a cron target; a
 * failed verify should page whoever owns the audit subsystem.
 */
import { Router, type Response } from "express";
import { AuditModel } from "../db/audit.model.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  requireWorkspace,
  type ScopedRequest,
} from "../middleware/workspace.js";
import { verifyChain } from "../services/audit.js";

export const auditRouter: Router = Router({ mergeParams: true });

auditRouter.get(
  "/workspaces/:workspaceId/audit",
  requireAuth,
  requireWorkspace("admin"),
  async (req: ScopedRequest, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const events = await AuditModel.find({ workspaceId: req.workspaceId })
      .sort({ seq: -1 })
      .limit(limit)
      .lean()
      .exec();
    res.json(events.map((e) => ({ ...e, id: String(e._id) })));
  },
);

auditRouter.get(
  "/audit/verify",
  requireAuth,
  async (_req: AuthedRequest, res: Response) => {
    // Chain verification is global by design — tampering with a
    // workspace's rows would leave a break even if we filtered. We
    // leave the endpoint authed (any signed-in user) but return only
    // the boolean + first broken index, not event contents.
    const result = await verifyChain();
    res.json(result);
  },
);

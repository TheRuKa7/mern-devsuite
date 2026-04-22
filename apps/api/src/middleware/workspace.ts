/**
 * Workspace scope + RBAC middleware.
 *
 * Most routes live under `/api/workspaces/:workspaceId/...`. This
 * middleware:
 * 1. Validates the workspace exists.
 * 2. Looks up the caller's membership in it.
 * 3. Checks their role against `minRole`.
 * 4. Attaches `req.workspaceId` + `req.role` for the handler.
 *
 * Role ordering: owner > admin > member > guest. We express that via
 * a numeric ladder rather than a switch so inequality checks compose.
 */
import type { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { WorkspaceModel } from "../db/workspace.model.js";
import { MembershipModel } from "../db/membership.model.js";
import type { AuthedRequest } from "./auth.js";

export type Role = "owner" | "admin" | "member" | "guest";

const RANK: Record<Role, number> = { owner: 3, admin: 2, member: 1, guest: 0 };

export interface ScopedRequest extends AuthedRequest {
  workspaceId?: string;
  role?: Role;
}

export function requireWorkspace(minRole: Role = "member") {
  return async (
    req: ScopedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: { code: "unauthorized", message: "no user" } });
      return;
    }
    const wsId = req.params.workspaceId;
    if (!wsId || !Types.ObjectId.isValid(wsId)) {
      res
        .status(400)
        .json({ error: { code: "bad_request", message: "invalid workspaceId" } });
      return;
    }

    const [workspace, membership] = await Promise.all([
      WorkspaceModel.findById(wsId).lean().exec(),
      MembershipModel.findOne({ userId, workspaceId: wsId }).lean().exec(),
    ]);
    if (!workspace) {
      res
        .status(404)
        .json({ error: { code: "not_found", message: "workspace not found" } });
      return;
    }
    if (!membership) {
      // Returning 404 (not 403) so membership existence isn't enumerable
      // to outsiders — same response as "workspace not found".
      res
        .status(404)
        .json({ error: { code: "not_found", message: "workspace not found" } });
      return;
    }
    if (RANK[membership.role as Role] < RANK[minRole]) {
      res.status(403).json({
        error: {
          code: "forbidden",
          message: `requires role ${minRole} or higher`,
        },
      });
      return;
    }
    req.workspaceId = String(workspace._id);
    req.role = membership.role as Role;
    next();
  };
}

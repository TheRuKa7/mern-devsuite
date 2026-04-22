/**
 * /me — identity + workspace membership for the signed-in user.
 *
 * Returned on every dashboard load; the web treats its result as the
 * source of truth for "which workspaces can I see".
 */
import { Router, type Response } from "express";
import { UserModel } from "../db/user.model.js";
import { MembershipModel } from "../db/membership.model.js";
import { WorkspaceModel } from "../db/workspace.model.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const meRouter: Router = Router();

meRouter.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const [user, memberships] = await Promise.all([
    UserModel.findById(userId).lean().exec(),
    MembershipModel.find({ userId }).lean().exec(),
  ]);
  if (!user) {
    res
      .status(404)
      .json({ error: { code: "not_found", message: "user not found" } });
    return;
  }
  const workspaces = await WorkspaceModel.find({
    _id: { $in: memberships.map((m) => m.workspaceId) },
  })
    .lean()
    .exec();
  res.json({
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name ?? null,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    memberships: memberships.map((m) => ({
      workspaceId: String(m.workspaceId),
      role: m.role,
    })),
    workspaces: workspaces.map((w) => ({
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      plan: w.plan,
    })),
  });
});

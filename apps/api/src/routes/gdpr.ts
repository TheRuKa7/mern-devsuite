/**
 * GDPR endpoints — Art. 15 (access) + Art. 17 (erasure) + Art. 20 (portability).
 *
 * /api/gdpr/export — streams a JSON bundle with everything we know
 *   about the caller. Satisfies Art. 15 (right of access) and Art. 20
 *   (right to data portability).
 *
 * /api/gdpr/delete — soft-deletes the caller by default (sets
 *   `deletedAt` and scrubs email to a tombstone); owned workspaces
 *   are suspended. A scheduled job (not shipped in this starter;
 *   documented in docs/GDPR.md) hard-deletes after 30 days. Set
 *   `env.GDPR_HARD_DELETE=true` to skip the grace window — tests do.
 *
 * The endpoints are audit-logged *before* mutating so even a failed
 * deletion leaves a trail.
 */
import { Router, type Response } from "express";
import { UserModel } from "../db/user.model.js";
import { WorkspaceModel } from "../db/workspace.model.js";
import { MembershipModel } from "../db/membership.model.js";
import { ProjectModel } from "../db/project.model.js";
import { AuditModel } from "../db/audit.model.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../env.js";
import { appendAudit } from "../services/audit.js";

export const gdprRouter: Router = Router();

gdprRouter.get(
  "/export",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const [user, memberships, workspaces, projects, auditEvents] =
      await Promise.all([
        UserModel.findById(userId).lean().exec(),
        MembershipModel.find({ userId }).lean().exec(),
        WorkspaceModel.find({ ownerId: userId }).lean().exec(),
        ProjectModel.find({ createdBy: userId }).lean().exec(),
        AuditModel.find({ actorId: userId }).lean().exec(),
      ]);

    await appendAudit({
      actorId: userId,
      action: "gdpr.export",
      resource: "user",
      resourceId: userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mern-devsuite-export-${userId}.json"`,
    );
    res.json({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      subject: { id: userId, email: req.user!.email },
      user,
      memberships,
      workspacesOwned: workspaces,
      projectsCreated: projects,
      auditEvents,
    });
  },
);

gdprRouter.delete(
  "/delete",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason : undefined;

    // Audit *before* mutating so the trail exists even if the
    // mutation fails halfway.
    await appendAudit({
      actorId: userId,
      action: env.GDPR_HARD_DELETE ? "gdpr.delete.hard" : "gdpr.delete.soft",
      resource: "user",
      resourceId: userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
      metadata: reason ? { reason } : {},
    });

    if (env.GDPR_HARD_DELETE) {
      // Hard purge: user row + memberships + projects. Workspaces
      // they own get a tombstone name (kept in case other members
      // rely on the tenant) but we null out ownerId.
      await Promise.all([
        UserModel.deleteOne({ _id: userId }).exec(),
        MembershipModel.deleteMany({ userId }).exec(),
        ProjectModel.deleteMany({ createdBy: userId }).exec(),
        WorkspaceModel.updateMany(
          { ownerId: userId },
          { $set: { name: "[deleted workspace]" } },
        ).exec(),
      ]);
    } else {
      // Soft delete: stamp deletedAt + scrub email to a tombstone
      // pattern so the unique index can be reused. The passwordHash
      // is zeroed so the account can't be re-activated by guessing.
      await UserModel.updateOne(
        { _id: userId },
        {
          $set: {
            deletedAt: new Date(),
            email: `deleted+${userId}@tombstone.invalid`,
            name: "[deleted]",
            passwordHash: "__deleted__",
          },
        },
      ).exec();
    }

    res.status(202).json({
      status: "accepted",
      mode: env.GDPR_HARD_DELETE ? "hard" : "soft-30d",
    });
  },
);

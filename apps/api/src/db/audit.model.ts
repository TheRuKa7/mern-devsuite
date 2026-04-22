import { Schema, model, type InferSchemaType, type Model } from "mongoose";

/**
 * Audit event — append-only with a hash chain.
 *
 * Each document stores:
 *   - `seq`: a monotonic counter (per process; on multi-instance deploys
 *     treat this as advisory and rely on the chain for integrity).
 *   - `prevHash`: the `hash` of the previous event, or "GENESIS" for seq=0.
 *   - `hash`: sha256(prevHash || canonical-json(event-without-hash)).
 *
 * Tampering with any row invalidates every subsequent hash. The
 * integrity check lives in `services/audit.verifyChain()`.
 *
 * We don't use a capped collection here because we want indexes and
 * the ability to export per-user events for GDPR Art. 15 requests.
 * Retention is a separate concern handled by a scheduled trim job.
 */
const AuditSchemaDef = new Schema(
  {
    seq: { type: Number, required: true, unique: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    resourceId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string } | undefined)?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

export type AuditDoc = InferSchemaType<typeof AuditSchemaDef> & {
  _id: unknown;
};
export type AuditModel = Model<AuditDoc>;

export const AuditModel = model<AuditDoc>("AuditEvent", AuditSchemaDef);

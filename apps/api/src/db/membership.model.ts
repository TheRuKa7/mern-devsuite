import { Schema, model, type InferSchemaType, type Model } from "mongoose";

/**
 * Membership = (user, workspace, role) triple.
 *
 * Separate collection (not an array on Workspace) so:
 * - We can index by userId to list "my workspaces" cheaply.
 * - Role changes are atomic on a single document.
 * - A future invitation / pending-acceptance state slots in naturally.
 */
const MembershipSchemaDef = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "guest"],
      required: true,
    },
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

MembershipSchemaDef.index({ userId: 1, workspaceId: 1 }, { unique: true });

export type MembershipDoc = InferSchemaType<typeof MembershipSchemaDef> & {
  _id: unknown;
};
export type MembershipModel = Model<MembershipDoc>;

export const MembershipModel = model<MembershipDoc>(
  "Membership",
  MembershipSchemaDef,
);

import { Schema, model, type InferSchemaType, type Model } from "mongoose";

/**
 * Workspace = tenant.
 *
 * Every non-auth route scopes by `workspaceId`. The combination of
 * (ownerId, slug) is unique so each user can have their own
 * namespace — but slug is also globally unique because it's routable
 * (e.g. `/w/<slug>`).
 */
const WorkspaceSchemaDef = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: /^[a-z0-9-]+$/,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "team"],
      default: "free",
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
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

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchemaDef> & {
  _id: unknown;
};
export type WorkspaceModel = Model<WorkspaceDoc>;

export const WorkspaceModel = model<WorkspaceDoc>(
  "Workspace",
  WorkspaceSchemaDef,
);

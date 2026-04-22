import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const ProjectSchemaDef = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

// Every listing query is scoped by workspace and ordered newest-first;
// this compound index keeps that path index-only.
ProjectSchemaDef.index({ workspaceId: 1, createdAt: -1 });

export type ProjectDoc = InferSchemaType<typeof ProjectSchemaDef> & {
  _id: unknown;
};
export type ProjectModel = Model<ProjectDoc>;

export const ProjectModel = model<ProjectDoc>("Project", ProjectSchemaDef);

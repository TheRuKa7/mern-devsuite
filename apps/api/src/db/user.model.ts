import { Schema, model, type InferSchemaType, type Model } from "mongoose";

/**
 * User document.
 *
 * Kept lean intentionally — profile fields (avatar, bio, etc.) belong
 * in a separate `profiles` collection so the hot auth path never
 * fetches more than the credential material. `deletedAt` supports the
 * GDPR soft-delete grace window (see env.GDPR_HARD_DELETE).
 */
const UserSchemaDef = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    emailVerifiedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    // JSON output removes the Mongo internals + the password hash so
    // the model can safely be sent to the client via `res.json(user)`.
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export type UserDoc = InferSchemaType<typeof UserSchemaDef> & { _id: unknown };
export type UserModel = Model<UserDoc>;

export const UserModel = model<UserDoc>("User", UserSchemaDef);

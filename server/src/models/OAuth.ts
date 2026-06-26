import mongoose, { Schema, type InferSchemaType } from "mongoose";

const authCodeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  codeChallenge: { type: String, required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export type AuthCodeDoc = InferSchemaType<typeof authCodeSchema> & { _id: mongoose.Types.ObjectId };
export const AuthCode = mongoose.model("AuthCode", authCodeSchema);

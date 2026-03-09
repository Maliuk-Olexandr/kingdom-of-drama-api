import { model, Schema } from 'mongoose';

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accessToken: { type: String, required: true, unique: true },
    refreshTokenHash: { type: String, required: true },
    rotationCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    ip: String,
    userAgent: String,
    device: String,
    accessTokenValidUntil: { type: Date, required: true },
    refreshTokenValidUntil: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

sessionSchema.index({ accessToken: 1 }, { unique: true });
sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });

sessionSchema.index({ refreshTokenValidUntil: 1 }, { expireAfterSeconds: 0 });

export const Session = model('Session', sessionSchema);

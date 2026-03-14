import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refreshTokenHash: { type: String, required: true },
    ip: String,
    userAgent: String,
    revoked: { type: Boolean, default: false },
    refreshTokenValidUntil: Date,
  },
  { timestamps: true },
);

export const Session = mongoose.model('Session', sessionSchema);

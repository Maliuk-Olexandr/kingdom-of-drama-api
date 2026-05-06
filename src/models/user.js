import { model, Schema } from 'mongoose';

import { ROLES } from '../constants/const.js';

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      maxlength: 32,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      required: false,
      maxlength: 64,
      default: function () {
        return this.username;
      },
    },
    birthdate: {
      type: Date,
      required: false,
    },
    aboutMe: {
      type: String,
      trim: true,
      required: false,
      maxlength: 800,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    userName: {
      type: String,
      trim: true,
      required: false,
      maxlength: 32,
    },
    userSurname: {
      type: String,
      trim: true,
      required: false,
      maxlength: 32,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    telegramId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    telegramIdVerified: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    oldEmail: {
      type: String,
      required: false,
      unique: false,
      trim: true,
      lowercase: true,
    },
    pendingEmail: {
      type: String,
      required: false,
      unique: false,
      trim: true,
      lowercase: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
    },
    avatar: {
      type: String,
      required: false,
      trim: true,
      default:
        'https://res.cloudinary.com/kingdom-of-drama/image/upload/v1774017551/default-avatar_hbnxwy.webp',
    },
    role: {
      type: String,
      required: true,
      trim: true,
      enum: ROLES,
      default: 'user',
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    userSettings: {
      darkMode: { type: Boolean, default: false },
      birthdateHidden: { type: Boolean, default: true },
      savedHidden: { type: Boolean, default: false },
      favoritesHidden: { type: Boolean, default: false },
    },
    heroes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Hero',
        required: false,
      },
    ],
    saved: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Saved',
        required: false,
      },
    ],
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Favorite',
        required: false,
      },
    ],
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: false,
      },
    ],
    feedbacks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Feedback',
        required: false,
      },
    ],
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};
userSchema.index(
  { createdAt: 1 },
  {
    // TTL index to automatically delete documents after 24 hours
    expireAfterSeconds: 60 * 60 * 24,
    // Only apply TTL to documents where emailVerified is false
    partialFilterExpression: { emailVerified: false },
  },
);

const User = model('User', userSchema);
export default User;

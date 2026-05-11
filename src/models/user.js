import crypto from 'crypto';

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
      default: function () {
        const randomHex = crypto.randomBytes(6).toString('hex');
        return `user-${randomHex}`;
      },
    },
    displayName: {
      type: String,
      trim: true,
      required: true,
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
    email: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    oldEmail: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    pendingEmail: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: false,
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
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    appleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    heroes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Hero',
        required: false,
      },
    ],
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Post',
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
    // TTL-індекс: видалити документ через 24 години
    expireAfterSeconds: 60 * 60 * 24,

    // УМОВА ВИДАЛЕННЯ (працює як логічне "І" для всіх полів):
    partialFilterExpression: {
      emailVerified: false, // 1. Пошта НЕ верифікована
      telegramIdVerified: false, // 2. Телеграм НЕ верифікований
    },
  },
);

const User = model('User', userSchema);
export default User;

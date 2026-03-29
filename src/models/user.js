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
      sparse: true,
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
      default: 'https://ac.goit.global/fullstack/react/default-avatar.jpg',
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

const User = model('User', userSchema);
export default User;

import { model, Schema } from 'mongoose';

import { ROLES } from '../constants/const.js';

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
    },
    userSurname: {
      type: String,
      trim: true,
      required: false,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
      trim: true,
      lowercase: true,
    },
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
      default: 'User',
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    postNumber: {
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

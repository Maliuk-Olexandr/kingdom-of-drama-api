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
      default: function () {
        return this.telegramData?.given_name;
      },
    },
    userSurname: {
      type: String,
      trim: true,
      required: false,
      maxlength: 32,
      default: function () {
        return this.telegramData?.family_name;
      },
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
      default: function () {
        return this.telegramData?.phone_number || undefined;
      },
    },
    phoneVerified: {
      type: Boolean,
      default: function () {
        return this.telegramData?.phone_number_verified || false;
      },
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
    telegramData: {
      id: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true,
      },
      sub: { type: String, required: false, trim: true },
      name: { type: String, required: false, trim: true },
      given_name: { type: String, required: false, trim: true },
      family_name: { type: String, required: false, trim: true },
      preferred_username: { type: String, required: false, trim: true },
      picture: { type: String, required: false, trim: true },
      phone_number: { type: String, required: false, trim: true },
      phone_number_verified: { type: Boolean, default: false },
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

userSchema.pre('validate', async function (next) {
  // 1. Якщо користувач старий і нік НЕ міняли — одразу виходимо
  if (!this.isNew && !this.isModified('username')) {
    return next();
  }

  // 2. Визначаємо базове ім'я (з Telegram або дефолтне для Google)
  let baseUsername = this.telegramData?.preferred_username;

  if (baseUsername) {
    baseUsername = baseUsername.toLowerCase().trim();
  } else {
    // Якщо це Google/Apple, робимо базою щось нейтральне
    baseUsername = `user-${crypto.randomBytes(4).toString('hex')}`;
  }

  let finalUsername = baseUsername;
  let isUnique = false;

  if (finalUsername.length > 32) {
    finalUsername = finalUsername.slice(0, 32);
  }
  // 3. Запускаємо залізобетонний цикл перевірки в базі
  while (!isUnique) {
    const existingUser = await this.constructor.findOne({
      username: finalUsername,
    });

    if (!existingUser) {
      isUnique = true; // Вільно!
    } else {
      baseUsername = baseUsername.slice(0, 25); // Обрізаємо до 25 символів, щоб додати "-" і 6-символьний суфікс
      const hex = crypto.randomBytes(3).toString('hex');
      finalUsername = `${baseUsername}-${hex}`;
      // Цикл продовжиться, і ми знову перевіримо новий нік на унікальність
    }
  }

  // 4. Присвоюємо унікальний нік
  this.username = finalUsername;
  next();
});

const User = model('User', userSchema);
export default User;

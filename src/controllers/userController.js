import createHttpError from 'http-errors';

import User from '../models/user.js';
import { saveAvatarToCloudinary } from '../utils/saveFileToCloudinary.js';

export const updateUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(createHttpError(400, 'No file'));
    }
    const folderName = req.user._id;
    const fileName = `avatar`;
    const result = await saveAvatarToCloudinary(
      req.file.buffer,
      folderName,
      fileName,
    );
    const user = await User.findOneAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true },
    );

    // Повертаємо формат, який очікує фронтенд (response.user.avatar)
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createHttpError(404, 'User not found'));

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

// Хелпер для перетворення вкладених об'єктів у "userSettings.darkMode": true
const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    // Перевіряємо, чи є значення об'єктом, чи це не масив і не null
    if (
      typeof obj[k] === 'object' &&
      obj[k] !== null &&
      !Array.isArray(obj[k])
    ) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

export async function updateUser(req, res, next) {
  try {
    // 1. Виключаємо поля, які НЕ можна міняти через цей роут
    const forbiddenFields = [
      'balance',
      'role',
      'emailVerified',
      'phoneVerified',
      'telegramIdVerified',
      'verificationToken',
      'verificationTokenExpires',
      'heroes',
    ];
    forbiddenFields.forEach((field) => delete req.body[field]);

    // 2. Якщо email змінюється, скидаємо верифікацію
    if (req.body.email) {
      req.body.emailVerified = false;
    }

    const updateData = flattenObject(req.body);

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

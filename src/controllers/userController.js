import createHttpError from 'http-errors';

import User from '../models/user.js';
import { sendEmail } from '../services/sendEmail.js';
import { generateDeletedUsername } from '../utils/generateUniqueUsername.js';
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
    // 1. Виключаємо заборонені поля
    const forbiddenFields = [
      'balance',
      'role',
      'emailVerified',
      'phoneVerified',
      'telegramIdVerified',
      'verificationToken',
      'verificationTokenExpires',
      'heroes',
      'password', // Пароль теж краще сюди
    ];
    forbiddenFields.forEach((field) => delete req.body[field]);

    // 2. Отримуємо поточні дані користувача з бази
    const userInDb = await User.findById(req.user._id);

    if (!userInDb) {
      return next(createHttpError(404, 'User not found'));
    }

    // 3. Логіка зміни Email
    if (req.body.email) {
      const newEmail = req.body.email.toLowerCase().trim();
      const oldEmail = userInDb.email.toLowerCase().trim();

      if (newEmail !== oldEmail) {
        // Якщо email дійсно новий — скидаємо верифікацію
        req.body.emailVerified = false;
      } else {
        // Якщо email той самий, видаляємо його з body, щоб не перезаписувати
        delete req.body.email;
      }
    }

    // 4. Формуємо дані для оновлення (flatten для вкладених об'єктів, як userSettings)
    const updateData = flattenObject(req.body);

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
}

// ======== видалення юзера ========
//  (Anonimization - заміна даних на дефолтні, щоб зберегти референси в базі)
// 1. Запит на видалення аккаунта (генерація токена і відправка листа)
export async function requestDeleteAccount(req, res, next) {
  try {
    const user = await User.findById(req.user._id);

    // Генеруємо токен (можна використати crypto.randomBytes)
    const deleteToken = crypto.randomBytes(32).toString('hex');
    const deleteTokenExpires = Date.now() + 3600000; // 1 година

    user.verificationToken = deleteToken;
    user.verificationTokenExpires = deleteTokenExpires;
    await user.save();

    // Відправляємо лист з посиланням для підтвердження видалення аккаунта
    await sendEmail({
      to: user.email,
      subject: 'Kingdom of Drama - Confirm Account Deletion',
      template: 'delete-confirmation',
      context: { token: deleteToken },
    });

    res.status(200).json({ message: 'Лист для підтвердження надіслано' });
  } catch (error) {
    next(error);
  }
}

// 2. Підтвердження видалення аккаунта (анонімізація даних)
export async function confirmDeleteAccount(req, res, next) {
  const { token } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user)
      return next(createHttpError(400, 'Token is invalid or has expired'));

    // 1. Генеруємо новий унікальний анонімний username
    const anonymousUsername = await generateDeletedUsername();

    // 2. Анонімізуємо дані
    user.username = anonymousUsername;
    user.displayName = 'deleted account';
    user.email = `${anonymousUsername}@deleted.com`; // Робимо email неможливим для входу
    user.password = crypto.randomBytes(64).toString('hex'); // "Вбиваємо" пароль
    user.avatar = 'https://res.cloudinary.com/default-deleted.webp';

    // Очищаємо приватні поля
    user.aboutMe = '';
    user.phone = undefined; // sparse index дозволяє null/undefined
    user.telegramId = undefined;
    user.userName = '';
    user.userSurname = '';
    user.city = '';

    // Очищаємо токени
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    // 3. Очищаємо куки на клієнті
    res.clearCookie('accessToken');
    res.status(200).json({ message: 'Аккаунт успішно анонімізовано' });
  } catch (error) {
    next(error);
  }
}

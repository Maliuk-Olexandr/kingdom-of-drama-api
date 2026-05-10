import crypto from 'crypto';

import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

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
      !Array.isArray(obj[k]) &&
      !(obj[k] instanceof Date)
    ) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

// ======== оновлення юзера ========
export async function updateUser(req, res, next) {
  try {
    const forbiddenFields = [
      'balance',
      'role',
      'emailVerified',
      'phoneVerified',
      'telegramIdVerified',
      'verificationToken',
      'verificationTokenExpires',
      'heroes',
      'password',
    ];
    forbiddenFields.forEach((field) => delete req.body[field]);

    const userInDb = await User.findById(req.user._id);
    if (!userInDb) return next(createHttpError(404, 'User not found'));

    // Логіка зміни Email
    if (req.body.email) {
      const newEmail = req.body.email.toLowerCase().trim();
      const oldEmail = userInDb.email.toLowerCase().trim();

      if (newEmail !== oldEmail) {
        // 1. Перевіряємо унікальність нової пошти
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) throw createHttpError(409, 'Email already in use');

        // 2. Створюємо JWT токен для підтвердження наміру
        // Додаємо userId та newEmail в payload, щоб точно знати, хто і на що міняє
        const intentToken = jwt.sign(
          {
            sub: userInDb._id,
            newEmail: newEmail,
            action: 'confirm_email_change',
          },
          process.env.JWT_EMAIL_VERIFICATION_SECRET,
          { expiresIn: '1h' },
        );

        // 3. Записуємо нову пошту в pending, але НЕ міняємо основну, щоб не порушувати логіку входу та не втратити зв'язок з поточним email
        req.body.pendingEmail = newEmail;
        req.body.oldEmail = oldEmail; // Зберігаємо стару пошту для подальшого використання
        delete req.body.email;

        // 4. Відправляємо лист на СТАРУ пошту (oldEmail)
        await sendEmail({
          to: oldEmail,
          subject: 'Kingdom of Drama - Confirm Email Change',
          template: 'confirm-email-change-intent',
          context: {
            displayName: userInDb.displayName,
            newEmail: newEmail,
            confirmUrl: `${process.env.FRONTEND_URL}/confirm-email-change?token=${intentToken}`,
          },
        });

        // Видаляємо email з тіла, щоб findOneAndUpdate не затер основну пошту
      } else {
        delete req.body.email;
      }
    }

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
// Підтвердження наміру зміни пошти (клік по посиланню в листі зі старої пошти)
export async function confirmEmailChangeIntent(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return next(createHttpError(400, 'Token is required'));
    // 1. Верифікація першого токена (намір)
    const decoded = jwt.verify(
      token,
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
    );

    // 2. Генеруємо ДРУГИЙ токен
    const finalToken = jwt.sign(
      {
        sub: decoded.sub,
        targetEmail: decoded.newEmail,
        action: 'verify_new_email',
      },
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
      { expiresIn: '24h' },
    );

    // 3. Оновлюємо користувача одним запитом
    // Ми шукаємо за ID ТА перевіряємо, чи pendingEmail збігається з токеном
    const user = await User.findOneAndUpdate(
      {
        _id: decoded.sub,
        pendingEmail: decoded.newEmail,
      },
      {
        $set: { verificationToken: finalToken },
      },
      { new: true }, // Повертає оновлений документ
    );

    if (!user) {
      throw createHttpError(400, 'Request not found or already processed');
    }

    // 4. Тепер використовуємо дані 'user' для відправки листа
    await sendEmail({
      to: user.pendingEmail,
      subject: 'Kingdom of Drama - Verify Your New Email Address',
      template: 'verify-new-email',
      context: {
        displayName: user.displayName,
        verifyUrl: `${process.env.FRONTEND_URL}/verify-new-email?token=${finalToken}`,
      },
    });

    res.json({
      message:
        'Intent confirmed. Now check your NEW email for final verification.',
    });
  } catch {
    next(createHttpError(401, 'Token is invalid or has expired'));
  }
}

export const completeEmailChange = async (req, res, next) => {
  try {
    const { token } = req.query;

    // 1. Верифікація фінального токена (JWT)
    const decoded = jwt.verify(
      token,
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
    );

    // 2. Атомарне оновлення
    // Шукаємо за ID, токеном у базі та відповідністю targetEmail
    const user = await User.findOneAndUpdate(
      {
        _id: decoded.sub,
        verificationToken: token, // Перевірка, що токен не використаний повторно
        pendingEmail: decoded.targetEmail, // Перевірка, що пошта не змінилася в процесі
      },
      {
        $set: {
          email: decoded.targetEmail, // Офіційна зміна
          emailVerified: true, // Підтверджуємо статус
          pendingEmail: null, // Очищаємо тимчасове поле
          verificationToken: null, // Анулюємо токен
        },
      },
      { new: true, runValidators: true },
    );

    if (!user) {
      return next(
        createHttpError(
          400,
          'Link is invalid or has already been used. Please try changing your email again.',
        ),
      );
    }

    // 3. (Опціонально) Відправка сповіщення на стару пошту про успішну зміну
    await sendEmail({
      to: user.oldEmail,
      subject: 'Kingdom of Drama - Your Email Has Been Changed',
      template: 'email-changed-notification',
      context: {
        displayName: user.displayName,
        newEmail: user.email,
      },
    });

    res.json({
      message:
        'Congratulations! Your email address has been successfully changed.',
      newEmail: user.email,
    });
  } catch {
    // Якщо помилка в jwt.verify або в базі
    next(
      createHttpError(
        401,
        'Link is invalid or has expired. Please try changing your email again.',
      ),
    );
  }
};

// ======== видалення юзера ========
//  (Anonimization - заміна даних на дефолтні, щоб зберегти референси в базі)
// 1. Запит на видалення аккаунта (генерація токена і відправка листа)
export async function requestDeleteAccount(req, res, next) {
  try {
    const userId = req.user._id;
    const userInDb = await User.findById(userId);

    if (!userInDb) return next(createHttpError(404, 'User not found'));

    const deleteToken = jwt.sign(
      {
        sub: userId,
        targetEmail: userInDb.email,
        action: 'delete_account',
      },
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
      { expiresIn: '1h' },
    );

    await User.findByIdAndUpdate(userId, {
      $set: { verificationToken: deleteToken },
    });

    await sendEmail({
      to: userInDb.email,
      subject: 'Kingdom of Drama - Confirm Account Deletion',
      template: 'delete-confirmation',
      context: {
        displayName: userInDb.displayName,
        confirmUrl: `${process.env.FRONTEND_URL}/confirm-delete?token=${deleteToken}`,
      },
    });

    res.status(200).json({ message: 'Confirmation email sent' });
  } catch (error) {
    next(error);
  }
}

// 2. Підтвердження видалення аккаунта (анонімізація даних)
export async function confirmDeleteAccount(req, res, next) {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
    );

    const user = await User.findOne({
      _id: decoded.sub,
      verificationToken: token,
    });

    if (!user) {
      return next(
        createHttpError(400, 'Invalid token or account already deleted'),
      );
    }

    const anonymousUsername = await generateDeletedUsername();

    const updateData = {
      username: anonymousUsername,
      displayName: 'Deleted Account',
      email: `${anonymousUsername}@deleted.com`,
      password: crypto.randomBytes(32).toString('hex'),
      avatar:
        'https://res.cloudinary.com/kingdom-of-drama/image/upload/v1774017551/default-avatar_hbnxwy.webp',
      birthdate: null,
      aboutMe: '',
      phoneVerified: false,
      telegramIdVerified: false,
      userName: '',
      userSurname: '',
      city: '',
      verificationToken: null,
      role: 'user',
      balance: 0,
    };

    // Одночасно оновлюємо дані та ВИДАЛЯЄМО конфліктні поля
    await User.findByIdAndUpdate(user._id, {
      $set: updateData,
      $unset: { phone: '', telegramId: '' },
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('DETAILED DELETE ERROR:', error);
    if (error.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'Token has expired'));
    }
    next(createHttpError(500, 'Internal server error during anonymization'));
  }
}

export async function getUserByUsername(req, res, next) {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select(
      'username displayName avatar aboutMe birthdate userSettings',
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    const response = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      aboutMe: user.aboutMe,
      hiddenSaved: user.userSettings.savedHidden,
      hiddenFavorites: user.userSettings.favoritesHidden,
    };
    if (!user.userSettings.birthdateHidden && user.birthdate) {
      response.birthdate = user.birthdate;
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

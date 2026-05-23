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
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) throw createHttpError(409, 'Email already in use');
      // ─── СЦЕНАРІЙ А: У ЮЗЕРА ВЗАГАЛІ НЕ БУЛО ПОШТИ (Вхід через Telegram) ───
      if (!userInDb.email) {
        // Створюємо реєстраційний токен верифікації (як у registerUser)
        const verificationToken = jwt.sign(
          { email: newEmail },
          process.env.JWT_EMAIL_VERIFICATION_SECRET,
          { expiresIn: '24h' },
        );

        // Тимчасово записуємо пошту в pendingEmail, щоб користувач не міг під нею увійти, поки не підтвердить
        req.body.pendingEmail = newEmail;
        req.body.verificationToken = verificationToken;
        delete req.body.email; // Видаляємо з body, щоб не записати в основне поле завчасно

        // Надсилаємо реєстраційний лист (шаблон з registerUser)
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        await sendEmail({
          to: newEmail,
          subject: 'Kingdom of Drama - Email Verification',
          template: 'verify-email', // Використовуємо твій існуючий шаблон
          context: {
            verificationUrl,
            displayName: userInDb.displayName || userInDb.name,
          },
        });

        // ─── СЦЕНАРІЙ Б: У ЮЗЕРА ВЖЕ БУЛА ПОШТА (Зміна існуючої пошти) ───
      } else {
        const oldEmail = userInDb.email.toLowerCase().trim();

        if (newEmail !== oldEmail) {
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
    }
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

// Запит профілю іншого користувача за username
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

// Прив'язка Telegram ID до існуючого аккаунта (для юзерів, які спочатку реєструвалися через email)
export async function linkTelegramAccount(req, res, next) {
  try {
    const { providerId, telegramData, secretKey } = req.body;

    // 1. Верифікація секретного ключа (щоб запобігти несанкціонованій прив'язці)
    if (secretKey !== process.env.INTERNAL_API_SECRET) {
      return next(createHttpError(403, 'Forbidden'));
    }
    const currentUserId = req.user.id;
    if (!currentUserId) {
      return next(createHttpError(401, 'Unauthorized'));
    }

    // 2. Перевірка, чи вже є користувач з таким Telegram ID
    const stringProviderId = String(providerId); // Переконаємося, що це рядок
    const existingUser = await User.findOne({
      'telegramData.id': stringProviderId,
    });
    if (existingUser) {
      if (existingUser._id.toString() === currentUserId) {
        return res.status(200).json({
          message: 'Telegram account already linked to this user',
          user: existingUser,
        });
      }
      return next(
        createHttpError(409, 'Telegram account already linked to another user'),
      );
    }

    const updatePayload = {
      telegramData: telegramData,
      telegramIdVerified: true,
    };

    // Якщо Telegram передав ім'я/прізвище, і в профілі користувача ще немає власних даних — заповнюємо їх
    if (telegramData?.given_name)
      updatePayload.userName = telegramData.given_name.trim();
    if (telegramData?.family_name)
      updatePayload.userSurname = telegramData.family_name.trim();

    // Якщо Telegram передав телефон і він верифікований — підтягуємо в профіль
    if (telegramData?.phone_number) {
      updatePayload.phone = telegramData.phone_number.trim();
      updatePayload.phoneVerified = telegramData.phone_number_verified || false;
    }

    // 3. Оновлення поточного користувача, додаючи Telegram дані
    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $set: updatePayload },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return next(createHttpError(404, 'User not found'));
    }

    res.status(200).json({
      message: 'Telegram account successfully linked',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

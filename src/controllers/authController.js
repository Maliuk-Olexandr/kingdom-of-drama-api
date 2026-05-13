import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { AVAILABILITY_FIELDS } from '../constants/const.js';
import { Session } from '../models/session.js';
import User from '../models/user.js';
import {
  createSession,
  setSessionCookies,
  validateAndRefreshSession,
} from '../services/auth.js';
import { sendEmail } from '../services/sendEmail.js';

export const oauthLogin = async (req, res, next) => {
  try {
    const {
      provider,
      providerId,
      email,
      name,
      image,
      secretKey,
      telegramData,
    } = req.body;

    // 1. Перевірка безпеки запиту від Next.js
    if (!secretKey || secretKey !== process.env.INTERNAL_API_SECRET) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden: Invalid API Secret' });
    }

    if (!provider || !providerId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing provider or providerId' });
    }

    let user = null;

    // 2. Пошук користувача за ID соцмережі
    if (provider === 'google')
      user = await User.findOne({ googleId: providerId });
    else if (provider === 'apple')
      user = await User.findOne({ appleId: providerId });
    else if (provider === 'telegram')
      user = await User.findOne({ 'telegramData.id': providerId });

    // 3. Зв'язування існуючого акаунту за email
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        if (provider === 'google') user.googleId = providerId;
        if (provider === 'apple') user.appleId = providerId;
        if (provider === 'telegram') user.telegramData.id = providerId;

        user.emailVerified = true;
        if (provider === 'telegram') user.telegramIdVerified = true;

        await user.save();
      }
    }

    // 4. Реєстрація нового користувача
    if (!user) {
      const newUserFields = {
        displayName: name || undefined,
        avatar: image || undefined,
        emailVerified:
          provider === 'google' ||
          provider === 'apple' ||
          provider === 'telegram',
        telegramIdVerified: provider === 'telegram',
      };

      if (provider === 'google') {
        newUserFields.googleId = providerId;
        if (email) newUserFields.email = email.toLowerCase();
      } else if (provider === 'telegram') {
        newUserFields.emailVerified = true;
        newUserFields.telegramData = telegramData || undefined;

        if (email) {
          newUserFields.email = email.toLowerCase();
        }
      }

      user = new User(newUserFields);
      await user.save();
    }

    // 5. ВИКОРИСТОВУЄМО СИСТЕМУ СЕСІЙ
    const { session, accessToken, refreshToken } = await createSession(
      user._id,
      req,
    );

    // Встановлюємо куки у відповідь бекенду
    setSessionCookies(res, accessToken, refreshToken, session);

    // 6. Повертаємо дані (токен також віддаємо в JSON на випадок, якщо Next.js захоче його зберегти у себе)
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      accessToken, // Передаємо для NextAuth
      refreshToken, // Передаємо для NextAuth
      sessionId: session._id,
      user,
    });
  } catch (error) {
    // Передаємо помилку в глобальний обробник (якщо він є) або виводимо в консоль
    console.error('[OAuth Login Error]:', error);
    next(error);
  }
};

// 📱 Register a new user --------------------------------------
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, username, inviter } = req.body;
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const inviterName = inviter ? inviter.trim().toLowerCase() : null;

    let inviterId = null;
    if (inviterName) {
      const inviterUser = await User.findOne({ username: inviterName });
      if (!inviterUser) {
        return next(
          createHttpError(400, `Inviter username "${inviterName}" not found`),
        );
      }
      inviterId = inviterUser._id;
    }

    // 1. Валідація та перевірка наявності (з урахуванням можливих "завислих" акаунтів)
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return next(
          createHttpError(409, `Email or Username is already in use`),
        );
      } else {
        await User.deleteOne({ _id: existingUser._id }); // Видаляємо "завислий" не верифікований акаунт
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Створюємо унікальний токен (можна JWT або просто рандомний рядок)
    const verificationToken = jwt.sign(
      { email: normalizedEmail },
      process.env.JWT_EMAIL_VERIFICATION_SECRET,
      { expiresIn: '24h' },
    );

    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      username: normalizedUsername,
      verificationToken,
      inviter: inviterId,
    });

    // 3. Відправка листа (використовуємо твій існуючий sendEmail)
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: newUser.email,
      subject: 'Kingdom of Drama - Email Verification',
      template: 'verify-email',
      context: {
        verificationUrl,
        displayName: newUser.displayName,
      },
    });

    // 4. Відповідь БЕЗ сесії
    res.status(201).json({
      message: 'User registered. Please check your email for verification.',
    });
  } catch (error) {
    next(error);
  }
};

// 📧 Email verification --------------------------------------
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body; // Отримуємо токен з тіла запиту

    if (!token) {
      throw createHttpError(400, 'Verification token is missing');
    }

    // 1. Перевіряємо валідність JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_EMAIL_VERIFICATION_SECRET);
    } catch {
      throw createHttpError(401, 'Token is invalid or expired');
    }

    // 2. Знайти та оновити одним запитом
    try {
      const user = await User.findOneAndUpdate(
        {
          email: decoded.email,
          verificationToken: token, // Перевіряємо, що токен у базі збігається
        },
        {
          $set: {
            emailVerified: true,
            verificationToken: null, // "Спалюємо" токен після використання
          },
          // $inc збільшує (або зменшує) числові поля
          $inc: {
            balance: 10, // Нараховуємо 10 коїнів
          },
        },
        { new: true }, // Повернути вже оновлений документ (якщо знадобиться)
      );

      // 3. Якщо користувача не знайдено (або токен вже був видалений)
      if (!user) {
        throw createHttpError(404, 'User not found or already verified');
      }
      // 4. Нараховуємо бонус запрошуючому (якщо він є)
      if (user.inviter) {
        try {
          // Шукаємо інвайтера за його ID і додаємо 5 коїнів
          await User.findByIdAndUpdate(user.inviter, {
            $inc: { balance: 5 },
          });
          await User.findByIdAndUpdate(user._id, {
            $inc: {
              balance: 5, // Нараховуємо 5 коїнів
            },
          });
        } catch (inviterErr) {
          // Логуємо помилку, але НЕ викидаємо її далі (щоб не зламати верифікацію нового юзера)
          console.error('Failed to add bonus to inviter:', inviterErr);
        }
      }

      const { session, accessToken, refreshToken } = await createSession(
        user._id,
        req,
      );
      setSessionCookies(res, accessToken, refreshToken, session);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        user,
      });
    } catch (err) {
      console.error('Database error during email verification:', err);
      throw createHttpError(500, 'Internal server error');
    }
  } catch (error) {
    next(error);
  }
};

// 🔑 User login --------------------------------------
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createHttpError(401, 'Invalid email or password');
    }

    // ❗ ПЕРЕВІРКА ВЕРИФІКАЦІЇ
    if (!user.emailVerified) {
      throw createHttpError(403, 'Please verify your email before logging in.');
    }

    const { session, accessToken, refreshToken } = await createSession(
      user._id,
      req,
    );
    setSessionCookies(res, accessToken, refreshToken, session);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        balance: user.balance,
        aboutMe: user.aboutMe,
        userName: user.userName,
        userSurname: user.userSurname,
        birthday: user.birthday,
        email: user.email,
        pendingEmail: user.pendingEmail,
        phone: user.phone,
        telegramId: user.telegramId,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        telegramIdVerified: user.telegramIdVerified,
        userSettings: user.userSettings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 🚪 User logout --------------------------------------
export const logoutUser = async (req, res, next) => {
  try {
    const { sessionId } = req.cookies;
    if (sessionId) {
      await Session.deleteOne({ _id: sessionId });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');
    res.status(204).send();
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ✅ Check username availability --------------------------------------
// очікуємо query параметри: field (username, email, phone, telegramId), value, excludeUserId (опційно для оновлення профілю)
export const checkAvailability = async (req, res, next) => {
  try {
    const { field, value, excludeUserId } = req.query;

    // 1. Перевірка наявності конфігурації для поля
    const config = AVAILABILITY_FIELDS[field];
    if (!config) {
      return next(
        createHttpError(
          400,
          `Availability check for '${field}' is not supported`,
        ),
      );
    }

    if (!value) {
      return next(createHttpError(400, 'Value is required'));
    }

    let cleanValue = value.trim().toLowerCase();

    if (field === 'telegramId') {
      cleanValue = cleanValue.replace(/^@/, ''); // видаляємо @, якщо він є, для зручності користувача
    }
    // 2. Валідація формату
    if (!config.regex.test(cleanValue)) {
      return next(createHttpError(400, config.error));
    }

    // 3. Динамічний пошук (враховуючи виключення поточного ID для налаштувань)
    const query = { [field]: cleanValue };
    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query).select('emailVerified'); // нам потрібен тільки цей флаг для логіки

    if (existingUser) {
      return res.status(200).json({
        status: 200,
        message: existingUser.emailVerified
          ? `${field} is already in use`
          : `${field} is already in use but not verified`,
        data: {
          available: false,
          emailVerified: existingUser.emailVerified, // додатково повертаємо статус верифікації для клієнта
        },
      });
    }

    return res.status(200).json({
      status: 200,
      message: `${field} is available`,
      data: { available: true, emailVerified: false }, // якщо немає користувача, то і верифікації немає
    });
  } catch (error) {
    next(error);
  }
};

// 🔄 Refresh user session --------------------------------------
export const refreshUserSession = async (req, res, next) => {
  try {
    const { refreshToken, sessionId } = req.cookies;
    if (!refreshToken || !sessionId)
      throw createHttpError(401, 'Missing tokens');

    const {
      session,
      accessToken,
      refreshToken: newRefreshToken,
    } = await validateAndRefreshSession(sessionId, refreshToken, req);

    setSessionCookies(res, accessToken, newRefreshToken, session);

    const user = await User.findById(session.userId).select('-password -__v');
    res.status(200).json({ message: 'Session refreshed', user });
  } catch (error) {
    next(error);
  }
};

// 📲 Get current user session --------------------------------------
export const getSession = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, sessionId } = req.cookies;

    // 1. Спроба по JWT
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
        const user = await User.findById(payload.sub).select('-password');
        if (user) return res.status(200).json({ success: true, user });
      } catch {
        /* ігноруємо */
      }
    }

    // 2. Спроба по Refresh
    if (refreshToken && sessionId) {
      try {
        const {
          session,
          accessToken,
          refreshToken: newRefreshToken,
        } = await validateAndRefreshSession(sessionId, refreshToken, req);

        setSessionCookies(res, accessToken, newRefreshToken, session);
        const user = await User.findById(session.userId).select('-password');
        return res.status(200).json({ success: true, refreshed: true, user });
      } catch {
        /* ігноруємо */
      }
    }

    return res.status(200).json({ success: false });
  } catch (error) {
    next(error);
  }
};
// 📧 Request password reset email --------------------------------------
export const requestResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    // Динамічний секрет: основний секрет + поточний хеш пароля (унеможливлює повторне використання токена)
    const secret = process.env.JWT_RESET_PASSWORD_SECRET + user.password;

    const resetToken = jwt.sign(
      { sub: user._id, action: 'password-reset' },
      secret,
      { expiresIn: '15m' },
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    // Використовуємо сервіс шаблонів
    await sendEmail({
      to: user.email,
      subject: 'Kingdom of Drama - Password Reset Request',
      template: 'password-reset',
      context: {
        displayName: user.displayName || 'користувачу',
        resetUrl: resetUrl,
      },
    });

    res.json({ message: 'Лист для скидання пароля надіслано!' });
  } catch (error) {
    next(error);
  }
};

// 🔐 Reset password --------------------------------------
export const resetPassword = async (req, res, next) => {
  try {
    const { token, id, password } = req.body;

    const user = await User.findById(id);
    if (!user) return next(createHttpError(404, 'User not found'));

    // Перевіряємо токен за допомогою того ж секрету
    const secret = process.env.JWT_RESET_PASSWORD_SECRET + user.password;

    try {
      jwt.verify(token, secret);
    } catch {
      return next(
        createHttpError(
          401,
          'Invalid or expired token. Please request a new password reset.',
        ),
      );
    }

    // Оновлюємо пароль
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // Видаляємо всі сесії для безпеки
    await Session.deleteMany({ userId: user._id });

    res.json({
      message:
        'Password has been successfully reset. All active sessions have been terminated.',
    });
  } catch (error) {
    next(error);
  }
};

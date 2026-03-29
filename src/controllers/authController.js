import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { USERNAME_REGEX } from '../constants/const.js';
import { Session } from '../models/session.js';
import User from '../models/user.js';
import {
  createSession,
  setSessionCookies,
  validateAndRefreshSession,
} from '../services/auth.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import { sendEmail } from '../utils/sendEmail.js';

// 📱 Register a new user --------------------------------------
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Валідація та перевірка наявності (твій існуючий код)
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existingUser) {
      return next(createHttpError(409, `Email or Username is already in use`));
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
      emailVerified: false, // за замовчуванням false
    });

    // 3. Відправка листа (використовуємо твій існуючий sendEmail)
    await sendEmail({
      email: newUser.email,
      subject: 'Підтвердження електронної пошти',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Вітаємо у Kingdom of Drama!</h2>
          <p>Будь ласка, підтвердіть вашу пошту, натиснувши на кнопку нижче:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}"
             style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
             Підтвердити пошту
          </a>
          <p>Посилання дійсне 24 години.</p>
        </div>
      `,
    });

    // 4. Відповідь БЕЗ сесії
    res.status(201).json({
      message: 'Реєстрація успішна! Перевірте пошту для підтвердження акаунту.',
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
      },
      { new: true }, // Повернути вже оновлений документ (якщо знадобиться)
    );

    // 3. Якщо користувача не знайдено (або токен вже був видалений)
    if (!user) {
      throw createHttpError(404, 'User not found or already verified');
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
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
      user,
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
export const checkUsernameAvailability = async (req, res, next) => {
  try {
    let { username } = req.query;

    if (!username) {
      return next(createHttpError(400, 'Username is required'));
    }

    // Очищаємо пробіли та переводимо в нижній регістр
    username = username.trim().toLowerCase();

    // 1. Валідація формату (тільки маленька латиниця, цифри, крапка, підкреслення)
    if (!USERNAME_REGEX.test(username) || username.length > 32) {
      return next(
        createHttpError(
          400,
          'Invalid username format (use lowercase letters, numbers, dots or underscores)',
        ),
      );
    }

    // 2. Швидкий пошук (пряме співпадіння за індексом)
    const user = await User.findOne({ username });

    if (user) {
      return next(createHttpError(409, 'Username is already taken'));
    }

    return res
      .status(200)
      .json({ available: true, message: 'Username is available' });
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

    // Динамічний секрет: основний секрет + поточний хеш пароля
    const secret = process.env.JWT_RESET_PASSWORD_SECRET + user.password;

    const resetToken = jwt.sign(
      { sub: user._id, action: 'password-reset' },
      secret,
      { expiresIn: '15m' },
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Відновлення пароля</h2>
          <p>Ви отримали цей лист, тому що зробили запит на відновлення пароля.</p>
          <p>Натисніть на кнопку нижче, щоб встановити новий пароль. Посилання дійсне 15 хвилин.</p>
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Змінити пароль</a>
          <p>Якщо ви цього не робили, просто ігноруйте цей лист.</p>
        </div>
      `,
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

// 🔄 Update user avatar --------------------------------------
export const updateAvatar = async (req, res, next) => {
  try {
    const file = req.file; // Це буде доступно, якщо в роуті додати upload.single('avatar')

    if (!file) {
      return next(createHttpError(400, 'No file provided'));
    }

    // Твій Cloudinary сервіс
    const result = await saveFileToCloudinary(file.buffer);

    // Тепер результат.secure_url можна записувати в базу
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true },
    );

    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

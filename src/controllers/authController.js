import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { Session } from '../models/session.js';
import User from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

// 📱 Register a new user --------------------------------------
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createHttpError(400, 'User with this email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    const { session: newSession, refreshToken } = await createSession(
      newUser._id,
      req,
    );
    setSessionCookies(res, newSession, refreshToken);

    res.status(201).json({
      message: 'User successfully registered',
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// 🔑 User login --------------------------------------
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(createHttpError(401, 'Invalid email or password'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(createHttpError(401, 'Invalid email or password'));
    }

    await Session.deleteOne({ userId: user._id });

    const { session: newSession, refreshToken } = await createSession(
      user._id,
      req,
    );
    setSessionCookies(res, newSession, refreshToken);
    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        userSurname: user.userSurname,
        email: user.email,
        telegramId: user.telegramId,
        avatar: user.avatar,
        phone: user.phone,
        city: user.city,
        postNumber: user.postNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
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

// 🔄 Refresh user session --------------------------------------
export const refreshUserSession = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken)
      return next(createHttpError(401, 'Missing refresh token'));

    // беремо всі активні сесії
    const sessions = await Session.find({ revoked: false });

    let sessionFound = null;
    for (const s of sessions) {
      const match = await bcrypt.compare(refreshToken, s.refreshTokenHash);
      if (match) {
        sessionFound = s;
        break;
      }
    }

    if (!sessionFound)
      return next(createHttpError(401, 'Invalid refresh token'));

    // видаляємо стару сесію
    await Session.deleteOne({ _id: sessionFound._id });

    // створюємо нову
    const { session: newSession, refreshToken: newRefreshToken } =
      await createSession(sessionFound.userId, req);

    setSessionCookies(res, newSession, newRefreshToken);

    res.status(200).json({ message: 'Session refreshed' });
  } catch (error) {
    next(error);
  }
};

// 📲 Get current user session --------------------------------------
export const getSession = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies;

    // ⛔ Немає жодних токенів
    if (!accessToken && !refreshToken) {
      return res.status(200).json({ success: false });
    }

    // 1️⃣ Перевіряємо accessToken
    if (accessToken) {
      const session = await Session.findOne({ accessToken });

      if (session && new Date() < new Date(session.accessTokenValidUntil)) {
        const user = await User.findById(session.userId).select('-password');
        return res.status(200).json({ success: true, user });
      }
    }

    // 2️⃣ Перевіряємо refreshToken (hashed)
    if (refreshToken) {
      // Беремо всі активні сесії
      const sessions = await Session.find({ revoked: false });

      let matchedSession = null;
      for (const s of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, s.refreshTokenHash);
        if (isMatch) {
          matchedSession = s;
          break;
        }
      }

      if (!matchedSession) {
        return res.status(200).json({ success: false });
      }

      // Перевірка expiration
      const isExpired =
        new Date() > new Date(matchedSession.refreshTokenValidUntil);
      if (isExpired) {
        await Session.deleteOne({ _id: matchedSession._id });
        return res.status(200).json({ success: false });
      }

      // 🔄 Створюємо нову сесію
      const { session: newSession, refreshToken: newRefreshToken } =
        await createSession(matchedSession.userId, req);

      // Встановлюємо cookie з новим refreshToken
      setSessionCookies(res, newSession, newRefreshToken);

      // Видаляємо стару сесію
      await Session.deleteOne({ _id: matchedSession._id });

      const user = await User.findById(matchedSession.userId).select(
        '-password',
      );

      return res.status(200).json({
        success: true,
        refreshed: true,
        user,
      });
    }

    // ❌ Якщо нічого не знайшли
    return res.status(200).json({ success: false });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ success: false });
  }
};

// 🔐 Reset password --------------------------------------
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(createHttpError(401, 'Invalid or expired token'));
    }

    const user = await User.findOne({ _id: payload.sub, phone: payload.phone });
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    await Session.deleteMany({ userId: user._id });

    res.status(200).json({ message: 'Password successfully updated' });
  } catch (error) {
    console.error(error);
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
      { avatarUrl: result.secure_url },
      { new: true },
    );

    res.json({ avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

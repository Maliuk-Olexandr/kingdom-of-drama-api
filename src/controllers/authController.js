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

    const newSession = await createSession(newUser._id, req);
    setSessionCookies(res, newSession);

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

    const newSession = await createSession(user._id, req);
    setSessionCookies(res, newSession);
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
    const session = await Session.findOne({
      _id: req.cookies.sessionId,
      refreshToken: req.cookies.refreshToken,
    });

    if (!session) {
      return next(createHttpError(401, 'Session not found'));
    }

    const isExpired = new Date() > new Date(session.refreshTokenValidUntil);
    if (isExpired) {
      return next(createHttpError(401, 'Session token expired'));
    }

    await Session.deleteOne({
      _id: session._id,
      refreshToken: req.cookies.refreshToken,
    });

    const newSession = await createSession(session.userId, req);
    setSessionCookies(res, newSession);

    res.status(200).json({ message: 'Session refreshed' });
  } catch (error) {
    console.error(error);
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

    // 1️⃣ Є accessToken → пробуємо його
    if (accessToken) {
      const session = await Session.findOne({ accessToken });

      if (session && new Date() < new Date(session.accessTokenValidUntil)) {
        const user = await User.findById(session.userId).select('-password');
        return res.status(200).json({ success: true, user });
      }
    }

    // 2️⃣ Пробуємо refreshToken
    if (refreshToken) {
      const oldSession = await Session.findOne({ refreshToken });

      if (!oldSession) {
        return res.status(200).json({ success: false });
      }

      const isExpired =
        new Date() > new Date(oldSession.refreshTokenValidUntil);

      if (isExpired) {
        await Session.deleteOne({ _id: oldSession._id });
        return res.status(200).json({ success: false });
      }

      // 🔄 створюємо нову сесію
      const newSession = await createSession(oldSession.userId, req);
      setSessionCookies(res, newSession);

      // ❗ очищаємо попередню
      await Session.deleteOne({ _id: oldSession._id });

      const user = await User.findById(oldSession.userId).select('-password');

      return res.status(200).json({
        success: true,
        refreshed: true,
        user,
      });
    }

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

import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { Session } from '../models/session.js';
import User from '../models/user.js';
import {
  createSession,
  setSessionCookies,
  validateAndRefreshSession,
} from '../services/auth.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

// 📱 Register a new user --------------------------------------
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createHttpError(400, 'User with this email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      nickname,
    });

    const { session, accessToken, refreshToken } = await createSession(
      newUser._id,
      req,
    );

    setSessionCookies(res, accessToken, refreshToken, session);

    res.status(201).json({
      message: 'User successfully registered',
      user: {
        _id: newUser._id,
        email: newUser.email,
        nickname: newUser.nickname,
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

    const { session, accessToken, refreshToken } = await createSession(
      user._id,
      req,
    );
    setSessionCookies(res, accessToken, refreshToken, session);
    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        nickname: user.nickname,
        userName: user.userName,
        userSurname: user.userSurname,
        email: user.email,
        telegramId: user.telegramId,
        avatar: user.avatar,
        phone: user.phone,
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

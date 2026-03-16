import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { Session } from '../models/session.js';
import User from '../models/user.js';

export const authenticate = async (req, res, next) => {
  try {
    // 1. Беремо куки
    const { accessToken, sessionId } = req.cookies;

    if (!accessToken || !sessionId) {
      return next(createHttpError(401, 'Session not found (missing cookies)'));
    }

    // 2. Верифікуємо JWT (Access Token)
    let userId;
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      userId = decoded.sub;
    } catch {
      return next(createHttpError(401, 'Access token expired or invalid'));
    }

    // 3. Шукаємо сесію в БД за sessionId
    const session = await Session.findById(sessionId);

    if (!session || session.revoked) {
      return next(createHttpError(401, 'Session not found or revoked'));
    }

    // 4. Перевіряємо, чи сесія належить тому самому юзеру
    if (session.userId.toString() !== userId) {
      return next(createHttpError(401, 'Session mismatch'));
    }

    // 5. Завантажуємо юзера
    const user = await User.findById(session.userId).select('-password');
    if (!user) {
      return next(createHttpError(401, 'User not found'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

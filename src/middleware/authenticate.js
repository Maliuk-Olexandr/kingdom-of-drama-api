import createHttpError from 'http-errors';

import { Session } from '../models/session.js';
import User from '../models/user.js';

export const authenticate = async (req, res, next) => {
  if (req.path === '/api/logout') {
    return next(); // Пропускаємо автентифікацію для логауту
  }
  try {
    const accessToken = req.cookies.accessToken;

    // ❌ Немає accessToken → неавторизований
    if (!accessToken) {
      return next(createHttpError(401, 'Access token missing'));
    }

    // 🔍 Пошук сесії
    const session = await Session.findOne({ accessToken });

    if (!session) {
      return next(createHttpError(401, 'Session not found'));
    }

    // ⏳ Перевірка терміну дії токена
    const isExpired = new Date() > new Date(session.accessTokenValidUntil);
    if (isExpired) {
      return next(createHttpError(401, 'Access token expired'));
    }

    // 👤 Завантажуємо користувача
    const user = await User.findById(session.userId).select('-password');
    if (!user) {
      return next(createHttpError(401, 'User not found'));
    }

    // 🔐 зберігаємо юзера в req
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

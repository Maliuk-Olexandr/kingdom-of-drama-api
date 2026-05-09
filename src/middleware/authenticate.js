import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { Session } from '../models/session.js';
import User from '../models/user.js';

export const authenticate = async (req, res, next) => {
  try {
    const { accessToken, sessionId } = req.cookies;

    if (!accessToken || !sessionId) {
      return next(createHttpError(401, 'Session not found (missing cookies)'));
    }

    // 1. Верифікація JWT
    let userId;
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      userId = decoded.sub;
    } catch {
      // Якщо токен прострочений, фронтенд має викликати /refresh
      return next(createHttpError(401, 'Access token expired or invalid'));
    }

    // 2. Пошук сесії
    const session = await Session.findById(sessionId);

    if (!session) {
      return next(createHttpError(401, 'Session not found or expired'));
    }

    // 3. ПЕРЕВІРКА БЕЗПЕКИ (Fingerprinting)
    // Порівнюємо поточний пристрій з тим, що створив сесію
    const currentUA = req.headers['user-agent'] || 'unknown';

    if (session.userAgent !== currentUA.substring(0, 256)) {
      // Якщо пристрій змінився — це підозріло. Видаляємо сесію.
      await Session.findByIdAndDelete(sessionId);
      res.clearCookie('accessToken');
      res.clearCookie('sessionId');
      return next(
        createHttpError(
          401,
          'Security alert: Device mismatch. Please log in again.',
        ),
      );
    }

    // Перевірка IP (опціонально: краще просто логувати, бо IP у мобільних часто стрибає)
    if (session.ip !== req.ip) {
      console.warn(
        `[Auth Warning] IP mismatch for user ${userId}. Saved: ${session.ip}, Current: ${req.ip}`,
      );
    }

    // 4. Перевірка приналежності сесії
    if (session.userId.toString() !== userId) {
      return next(createHttpError(401, 'Session mismatch'));
    }

    // 5. Завантаження користувача
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(createHttpError(401, 'User not found'));
    }

    // Додатково: перевірка, чи підтверджена пошта
    if (!user.emailVerified) {
      return next(createHttpError(403, 'Your email is not verified.'));
    }

    req.user = user;
    req.sessionId = sessionId; // Може знадобитися для логауту
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const { accessToken, sessionId } = req.cookies;

    // Якщо кук немає, це просто гість. Пропускаємо далі без помилки!
    if (!accessToken || !sessionId) {
      return next();
    }

    // 1. Верифікація JWT
    let userId;
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      userId = decoded.sub;
    } catch {
      // Токен невалідний — вважаємо гостем
      return next();
    }

    // 2. Пошук сесії
    const session = await Session.findById(sessionId);
    if (!session) {
      return next();
    }

    // 3. ПЕРЕВІРКА БЕЗПЕКИ (Fingerprinting)
    const currentUA = req.headers['user-agent'] || 'unknown';
    if (session.userAgent !== currentUA.substring(0, 256)) {
      // Сесія скомпрометована, але ми просто пускаємо як гостя
      // (опціонально можна тут видалити куки)
      return next();
    }

    // 4. Перевірка приналежності сесії
    if (session.userId.toString() !== userId) {
      return next();
    }

    // 5. Завантаження користувача
    const user = await User.findById(userId).select('-password');
    if (!user || !user.emailVerified) {
      return next();
    }

    // Якщо всі перевірки пройдено — записуємо юзера
    req.user = user;
    req.sessionId = sessionId;

    // Передаємо керування контролеру getHeroes
    next();
  } catch {
    // У разі системної помилки (наприклад, БД впала) безпечніше пропустити як гостя
    next();
  }
};

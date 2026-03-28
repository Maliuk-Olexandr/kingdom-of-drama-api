import crypto from 'crypto';

import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { FIFTEEN_MINUTES, ONE_DAY } from '../constants/time.js';
import { Session } from '../models/session.js';

export const createSession = async (userId, req) => {
  // JWT access token
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  // refresh token parts
  const tokenId = crypto.randomUUID();
  const tokenSecret = crypto.randomBytes(32).toString('hex');

  const refreshToken = `${tokenId}.${tokenSecret}`;

  const refreshTokenHash = await bcrypt.hash(tokenSecret, 10);

  const session = await Session.create({
    _id: tokenId,
    userId,
    refreshTokenHash,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    refreshTokenValidUntil: new Date(Date.now() + ONE_DAY),
  });

  return {
    session,
    accessToken,
    refreshToken,
  };
};

export const setSessionCookies = (res, accessToken, refreshToken, session) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: FIFTEEN_MINUTES,
  });

  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions,
    maxAge: ONE_DAY,
  });

  res.cookie('sessionId', session._id, {
    ...baseCookieOptions,
    maxAge: ONE_DAY,
  });
};

export const validateAndRefreshSession = async (
  sessionId,
  refreshToken,
  req,
) => {
  // 1. Пошук сесії
  const session = await Session.findById(sessionId);

  if (
    !session ||
    session.revoked ||
    new Date() > new Date(session.refreshTokenValidUntil)
  ) {
    if (session) await Session.deleteOne({ _id: sessionId });
    throw createHttpError(401, 'Invalid or expired session');
  }

  // 2. Валідація токена (перевірка секретної частини)
  const parts = refreshToken.split('.');
  const tokenSecret = parts[1];
  const isMatch = await bcrypt.compare(tokenSecret, session.refreshTokenHash);

  if (!isMatch) {
    // Якщо токен не збігається, можливо, це спроба крадіжки сесії.
    // У серйозних системах тут можна анулювати всі сесії користувача.
    throw createHttpError(401, 'Invalid refresh token');
  }

  // 3. Генерація НОВИХ даних для цієї ж сесії
  const accessToken = jwt.sign(
    { sub: session.userId },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m',
    },
  );

  const newTokenSecret = crypto.randomBytes(32).toString('hex');
  const newRefreshTokenHash = await bcrypt.hash(newTokenSecret, 10);
  const newRefreshToken = `${session._id}.${newTokenSecret}`;

  // 4. Оновлення існуючого запису (findByIdAndUpdate)
  const updatedSession = await Session.findByIdAndUpdate(
    sessionId,
    {
      refreshTokenHash: newRefreshTokenHash,
      refreshTokenValidUntil: new Date(Date.now() + ONE_DAY),
      ip: req.ip, // Оновлюємо IP, якщо юзер перейшов з Wi-Fi на LTE
      userAgent: req.headers['user-agent'],
    },
    { new: true }, // Повертаємо оновлений об'єкт
  );

  return {
    session: updatedSession,
    accessToken,
    refreshToken: newRefreshToken,
  };
};

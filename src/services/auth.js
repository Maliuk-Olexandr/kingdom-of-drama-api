import crypto from 'crypto';

import bcrypt from 'bcrypt';

import { FIFTEEN_MINUTES, ONE_DAY } from '../constants/time.js';
import { Session } from '../models/session.js';

export const createSession = async (userId, req) => {
  const accessToken = crypto.randomBytes(48).toString('hex');
  const refreshToken = crypto.randomBytes(48).toString('hex');

  // хешуємо refreshToken
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const session = await Session.create({
    userId,
    accessToken,
    refreshTokenHash,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + ONE_DAY),
  });

  return { session, refreshToken }; // plain refreshToken потрібен лише для cookie
};

export const setSessionCookies = (res, session, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res.cookie('accessToken', session.accessToken, {
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

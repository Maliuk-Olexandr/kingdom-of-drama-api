import crypto from 'crypto';

import { FIFTEEN_MINUTES, ONE_DAY } from '../constants/time.js';
import { Session } from '../models/session.js';

export const createSession = async (userId, req) => {
  const accessToken = crypto.randomBytes(48).toString('hex');
  const refreshToken = crypto.randomBytes(48).toString('hex');

  return Session.create({
    userId,
    accessToken,
    refreshToken,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + ONE_DAY),
  });
};

export const setSessionCookies = (res, session) => {
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
  res.cookie('refreshToken', session.refreshToken, {
    ...baseCookieOptions,
    maxAge: ONE_DAY,
  });
};

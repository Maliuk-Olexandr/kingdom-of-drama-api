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
  const session = await Session.findById(sessionId);
  if (
    !session ||
    session.revoked ||
    new Date() > new Date(session.refreshTokenValidUntil)
  ) {
    if (session) await Session.deleteOne({ _id: sessionId });
    throw createHttpError(401, 'Invalid or expired session');
  }

  const parts = refreshToken.split('.');
  const tokenSecret = parts[1]; // Беремо тільки другу частину
  const isMatch = await bcrypt.compare(tokenSecret, session.refreshTokenHash);
  if (!isMatch) throw createHttpError(401, 'Invalid refresh token');

  await Session.deleteOne({ _id: session._id });
  return await createSession(session.userId, req);
};

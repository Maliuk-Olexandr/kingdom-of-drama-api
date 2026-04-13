export const CURRENCIES = ['грн', 'usd', 'eur'];

export const ROLES = ['user', 'member', 'admin'];

// Username can contain letters, numbers, dots, and underscores
export const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;
// E.164 international phone format, e.g. +380501234567
export const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TELEGRAM_REGEX = /^([a-zA-Z0-9_]{5,32})$/;

export const AVAILABILITY_FIELDS = {
  username: {
    regex: USERNAME_REGEX,
    error:
      'Username must be 3-30 characters long and can contain letters, numbers, dots, and underscores,max 32 characters.',
  },
  phone: {
    regex: PHONE_REGEX,
    error: 'Phone number must be in E.164 format, e.g. +380501234567.',
  },
  email: {
    regex: EMAIL_REGEX,
    error: 'Email must be a valid email address.',
  },
  telegramId: {
    regex: TELEGRAM_REGEX,
    error:
      'Telegram username must be 5-32 characters long and can contain letters, numbers, and underscores.',
  },
};

import rateLimit from 'express-rate-limit';

// Загальний лімітер (той, що в тебе вже є)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Додаємо обробку помилки trust proxy, щоб не чекати 300 секунд при кожному запиті
  validate: { xForwardedForHeader: false },
});

// Суворий лімітер для скидання пароля та логіну
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 5, // лише 5 спроб на годину
  message: {
    message: 'Too many password reset attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Лімітер для перевірки доступності email/username
export const checkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 20, // 20 перевірок на хвилину — для людини з головою достатньо, для бота — замало
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many checks, take a breath.' },
});
